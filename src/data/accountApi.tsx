import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { apiAccount, apiMyPoints } from "./api";
import { useShop } from "./shop";

type AccountApi = {
  /** Null for guests. */
  token: string | null;
  /** Refetches the customer's records into the store, and whatever `onChanged` reloads. */
  reload: () => Promise<void>;
};

const AccountApiContext = createContext<AccountApi>({ token: null, reload: async () => {} });

/**
 * Loads the signed-in customer's profile, orders, redemptions, referrals, tier history and points from the API
 * into the store, again whenever they come back to the tab, so changes staff made show on their pages.
 * `onChanged` runs after a change of theirs, since orders and redemptions move stock.
 */
export function AccountApiProvider({
  token,
  userId,
  onChanged,
  children,
}: {
  token: string | null;
  userId: string | null;
  onChanged: () => Promise<void>;
  children: ReactNode;
}) {
  const { syncAccount } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncAccount);
  sync.current = syncAccount;
  const changed = useRef(onChanged);
  changed.current = onChanged;

  const load = useCallback(async () => {
    if (!token || !userId) return;
    const [account, points] = await Promise.all([apiAccount(token), apiMyPoints(token)]);
    sync.current(userId, account, points);
  }, [token, userId]);

  useEffect(() => {
    // A failure leaves the store as it was: the session check already handles a token the API rejects.
    const refresh = () => {
      load().catch(() => {});
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  const value = useMemo<AccountApi>(
    () => ({
      token,
      reload: async () => {
        await Promise.all([load(), changed.current()]);
      },
    }),
    [token, load],
  );

  return <AccountApiContext.Provider value={value}>{children}</AccountApiContext.Provider>;
}

/**
 * Runs an API change for the signed-in customer, then reloads their records. Returns the error message,
 * or null on success, matching the store's mutation convention.
 */
export function useAccountMutation() {
  const { token, reload } = useContext(AccountApiContext);
  return useCallback(
    async (change: (token: string) => Promise<unknown>): Promise<string | null> => {
      if (!token) return "Sign in first.";
      try {
        await change(token);
      } catch (error) {
        return (error as Error).message;
      }
      await reload().catch(() => {});
      return null;
    },
    [token, reload],
  );
}
