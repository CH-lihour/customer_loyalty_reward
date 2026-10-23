import type { LoginRole } from "../components/LoginPage";
import type { Product, ProductCategory } from "./mockData";

/** Laravel API root. Set `VITE_API_URL` to point at another server. */
const apiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost/api"
).replace(/\/+$/, "");

export type ApiStaffRole = {
  id: number;
  code: string;
  label: string;
  stock_authority: "clerk" | "manager" | null;
};

export type ApiProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  points_balance?: number;
  /** Staff only: the role and the admin pages it grants. */
  is_active?: boolean;
  role?: ApiStaffRole | null;
  pages?: string[];
};

export type ApiRole = ApiStaffRole & { pages: string[]; users_count?: number };

/** `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Staff routes sit under /backend; customer routes at the API root.
const prefix = (role: LoginRole) => (role === "admin" ? "/backend" : "");

async function request<T>(
  path: string,
  { method = "GET", token, body }: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  // FormData (file uploads) sets its own multipart Content-Type with the boundary.
  const isForm = body instanceof FormData;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
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

type ApiCategory = {
  id: number;
  name: string;
  name_kh: string | null;
  description: string | null;
  is_active: boolean;
};

type ApiProduct = {
  id: number;
  name: string;
  name_kh: string | null;
  description: string | null;
  images: { id: number; url: string }[];
  // Laravel serializes decimal columns as strings.
  price: string;
  normal_points: number;
  bonus_multiplier: string;
  is_featured: boolean;
  category: { id: number; name: string } | null;
};

const toCategory = (c: ApiCategory): ProductCategory => ({
  id: String(c.id),
  name: c.name,
  nameKh: c.name_kh ?? "",
  description: c.description ?? "",
  active: c.is_active,
});

/** Stock is not part of the product API, so it starts at 0 and the store keeps its own count. */
const toProduct = (p: ApiProduct): Product => ({
  id: String(p.id),
  name: p.name,
  nameKh: p.name_kh ?? "",
  category: p.category?.name ?? "",
  price: Number(p.price),
  stock: 0,
  images: (p.images ?? []).map(({ id, url }) => ({ id, url })),
  description: p.description ?? "",
  normalPoints: p.normal_points,
  bonusMultiplier: Number(p.bonus_multiplier),
  featured: p.is_featured,
});

/** Paging details sent with every API list. */
export type PageMeta = { current_page: number; per_page: number; total: number; last_page: number };
export type ApiPage<T> = { rows: T[]; meta: PageMeta };
type PageQuery = { page: number; perPage: number } & Record<string, string | number | undefined>;

/** Fetches one page of a list. Empty filters are left out of the query string. */
async function fetchPage<T>(path: string, token: string, { page, perPage, ...filters }: PageQuery): Promise<{ data: T[]; meta: PageMeta }> {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(name, String(value));
  }
  return request<{ data: T[]; meta: PageMeta }>(`${path}?${query}`, { token });
}

/** Fetches every row of a list, 100 per request (the API's largest page). */
async function fetchAll<T>(path: string, token: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await fetchPage<T>(path, token, { page, perPage: 100 });
    rows.push(...data);
    if (page >= meta.last_page) return rows;
  }
}

/** Loads the whole staff catalog in the store's shapes, for the storefront. Products name their category, as in the mock data. */
export async function apiCatalog(token: string) {
  const [categories, products] = await Promise.all([
    fetchAll<ApiCategory>("/backend/categories", token),
    fetchAll<ApiProduct>("/backend/products", token),
  ]);
  return {
    categories: categories.map(toCategory),
    products: products.map(toProduct),
  };
}

/** One page of categories for the admin table, with each category's product count. */
export async function apiCategoryPage(token: string, query: PageQuery & { search?: string }): Promise<ApiPage<ProductCategory & { productCount: number }>> {
  const { data, meta } = await fetchPage<ApiCategory & { products_count: number }>("/backend/categories", token, query);
  return { rows: data.map((c) => ({ ...toCategory(c), productCount: c.products_count })), meta };
}

/** One page of products for the admin table. */
export async function apiProductPage(token: string, query: PageQuery & { category_id?: string }): Promise<ApiPage<Product>> {
  const { data, meta } = await fetchPage<ApiProduct>("/backend/products", token, query);
  return { rows: data.map(toProduct), meta };
}

/** Creates the category when it has no id yet; otherwise updates the fields sent. */
export async function apiSaveCategory(token: string, category: Partial<ProductCategory>) {
  const body = {
    ...(category.name !== undefined && { name: category.name }),
    ...(category.nameKh !== undefined && { name_kh: category.nameKh || null }),
    ...(category.description !== undefined && { description: category.description || null }),
    ...(category.active !== undefined && { is_active: category.active }),
  };
  await request(category.id ? `/backend/categories/${category.id}` : "/backend/categories", {
    method: category.id ? "PATCH" : "POST",
    token,
    body,
  });
}

export async function apiDeleteCategory(token: string, id: string) {
  await request(`/backend/categories/${id}`, { method: "DELETE", token });
}

/**
 * Creates the product when it has no id yet; otherwise updates it. `newImages` are uploaded after the
 * kept ones and `removeImageIds` are deleted. Returns the saved product's id.
 */
export async function apiSaveProduct(
  token: string,
  product: Product,
  categoryId: string,
  { newImages = [], removeImageIds = [] }: { newImages?: File[]; removeImageIds?: number[] } = {},
) {
  // Multipart for the files. PHP only reads multipart bodies on POST, so updates spoof PATCH.
  const form = new FormData();
  if (product.id) form.append("_method", "PATCH");
  form.append("category_id", categoryId);
  form.append("name", product.name);
  form.append("name_kh", product.nameKh);
  form.append("description", product.description);
  form.append("price", String(product.price));
  form.append("normal_points", String(product.normalPoints));
  form.append("bonus_multiplier", String(product.bonusMultiplier));
  form.append("is_featured", product.featured ? "1" : "0");
  newImages.forEach((file) => form.append("images[]", file));
  removeImageIds.forEach((id) => form.append("remove_image_ids[]", String(id)));

  const { data } = await request<{ data: ApiProduct }>(
    product.id ? `/backend/products/${product.id}` : "/backend/products",
    { method: "POST", token, body: form },
  );
  return String(data.id);
}

export async function apiDeleteProduct(token: string, id: string) {
  await request(`/backend/products/${id}`, { method: "DELETE", token });
}

/** Loads every staff role and user, for menu access and role lookups. Super Admin only. */
export async function apiStaff(token: string) {
  const [roles, users] = await Promise.all([
    request<{ data: ApiRole[] }>("/backend/roles", { token }),
    fetchAll<ApiProfile>("/backend/users", token),
  ]);
  return { roles: roles.data, users };
}

/** One page of staff users for the admin table. Super Admin only. */
export async function apiStaffUserPage(token: string, query: PageQuery): Promise<ApiPage<ApiProfile>> {
  const { data, meta } = await fetchPage<ApiProfile>("/backend/users", token, query);
  return { rows: data, meta };
}

/** Creates the role when no id is given; otherwise updates the fields sent. Returns the saved role. */
export async function apiSaveRole(
  token: string,
  id: number | null,
  body: { label?: string; pages?: string[]; stock_authority?: "clerk" | "manager" },
) {
  const { data } = await request<{ data: ApiRole }>(id ? `/backend/roles/${id}` : "/backend/roles", {
    method: id ? "PATCH" : "POST",
    token,
    body,
  });
  return data;
}

/** Creates the staff user when no id is given; otherwise updates the fields sent. A blank password keeps the current one. */
export async function apiSaveStaffUser(
  token: string,
  id: number | null,
  body: { name?: string; email?: string; password?: string; role_id?: number; is_active?: boolean },
) {
  await request(id ? `/backend/users/${id}` : "/backend/users", { method: id ? "PATCH" : "POST", token, body });
}
