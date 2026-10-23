import { useCallback, useEffect, useRef, useState } from "react";
import { apiStaff, type ApiRole } from "./api";
import { useShop } from "./shop";

/**
 * Loads staff roles and users from the API into the store when a Super Admin page opens.
 * `roles` keeps the API ids that saves need; `reload` refetches after a change.
 */
export function useApiStaff(token: string) {
  const { syncStaff } = useShop();
  // The store's functions change identity on every state update; read the latest without refetching.
  const sync = useRef(syncStaff);
  sync.current = syncStaff;
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    const staff = await apiStaff(token);
    sync.current(staff.roles, staff.users);
    setRoles(staff.roles);
    return staff;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload().then(
      () => {
        if (cancelled) return;
        setLoadError("");
        setLoading(false);
      },
      (error: Error) => {
        if (cancelled) return;
        setLoadError(error.message);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reload]);

  /** The API id of a role, looked up by its code. */
  const roleId = (code: string) => roles.find((role) => role.code === code)?.id ?? null;

  return { roles, roleId, loading, loadError, reload };
}
