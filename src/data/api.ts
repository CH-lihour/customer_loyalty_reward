import type { LoginRole } from "../components/LoginPage";

/** Laravel API root. Set `VITE_API_URL` to point at another server. */
const apiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost/api"
).replace(/\/+$/, "");

export type ApiProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  points_balance?: number;
};

/** `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Staff routes sit at the API root; customer routes under /customer.
const prefix = (role: LoginRole) => (role === "customer" ? "/customer" : "");

async function request<T>(
  path: string,
  { method = "GET", token, body }: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Can't reach the KhmerShop server. Check that the API is running.",
      0,
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Laravel validation errors carry per-field messages; prefer the first one.
    const fieldErrors = Object.values(data.errors ?? {}).flat() as string[];
    throw new ApiError(
      fieldErrors[0] ?? data.message ?? `Request failed (${response.status}).`,
      response.status,
    );
  }
  return data as T;
}

export async function apiLogin(role: LoginRole, email: string, password: string) {
  const { token } = await request<{ token: string }>(`${prefix(role)}/login`, {
    method: "POST",
    body: { email, password, device_name: "KhmerShop web" },
  });
  return token;
}

export async function apiProfile(role: LoginRole, token: string) {
  const { data } = await request<{ data: ApiProfile }>(`${prefix(role)}/profile`, { token });
  return data;
}

export async function apiLogout(role: LoginRole, token: string) {
  await request(`${prefix(role)}/logout`, { method: "POST", token });
}
