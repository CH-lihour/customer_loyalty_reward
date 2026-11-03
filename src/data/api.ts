import type { LoginRole } from "../components/LoginPage";
import type { Campaign } from "./shop";
import type { Badge, Product, ProductCategory, Reward } from "./mockData";

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
  phone?: string | null;
  points_balance?: number;
  /** Customer only, and only sent on registration. */
  name_kh?: string | null;
  province?: string | null;
  referral_code?: string;
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

/** Fields of the customer sign-up form. `referralCode` is the code of the customer who invited them. */
export type RegisterFields = {
  name: string;
  email: string;
  password: string;
  phone: string;
  province: string;
  referralCode: string;
};

/** Creates a customer account. The API signs the new customer in and returns their token and profile. */
export async function apiRegister(fields: RegisterFields) {
  // The API stores blank optional fields as null.
  const { token, customer } = await request<{ token: string; customer: ApiProfile }>("/register", {
    method: "POST",
    body: {
      name: fields.name,
      email: fields.email,
      password: fields.password,
      phone: fields.phone,
      province: fields.province,
      referral_code: fields.referralCode,
      device_name: "KhmerShop web",
    },
  });
  return { token, customer };
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
  parent_id: number | null;
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
  parentId: c.parent_id === null ? "" : String(c.parent_id),
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
    ...(category.parentId !== undefined && { parent_id: category.parentId ? Number(category.parentId) : null }),
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

type ApiTier = {
  id: number;
  name: string;
  min_points: number;
  max_points: number | null;
  multiplier: string;
  color: string | null;
  customers_count: number;
};

/** A membership tier as the admin shows it. An open-ended tier's `max` is Infinity. */
export type AdminTier = {
  id: string;
  name: string;
  min: number;
  max: number;
  multiplier: number;
  color: string;
  customerCount: number;
};

const toTier = (t: ApiTier): AdminTier => ({
  id: String(t.id),
  name: t.name,
  min: t.min_points,
  max: t.max_points ?? Infinity,
  multiplier: Number(t.multiplier),
  color: t.color ?? "#94a3b8",
  customerCount: t.customers_count,
});

/** Loads every tier from the entry tier upwards. */
export async function apiTiers(token: string): Promise<AdminTier[]> {
  return (await fetchAll<ApiTier>("/backend/tiers", token)).map(toTier);
}

/** Creates the tier when it has no id yet; otherwise updates it. */
export async function apiSaveTier(token: string, tier: Omit<AdminTier, "customerCount">) {
  await request(tier.id ? `/backend/tiers/${tier.id}` : "/backend/tiers", {
    method: tier.id ? "PATCH" : "POST",
    token,
    body: {
      name: tier.name,
      min_points: tier.min,
      max_points: Number.isFinite(tier.max) ? tier.max : null,
      multiplier: tier.multiplier,
      color: tier.color || null,
    },
  });
}

export async function apiDeleteTier(token: string, id: string) {
  await request(`/backend/tiers/${id}`, { method: "DELETE", token });
}

type ApiBadge = {
  id: number;
  code: string;
  name: string;
  name_kh: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  metric: NonNullable<Badge["metric"]>;
  threshold: number;
  customers_count: number;
};

/** A badge as the admin shows it, with how many customers have earned it. */
export type AdminBadge = Badge & { customerCount: number };

const toBadge = (b: ApiBadge): AdminBadge => ({
  id: String(b.id),
  code: b.code,
  name: b.name,
  nameKh: b.name_kh ?? "",
  description: b.description ?? "",
  icon: b.icon ?? "medal",
  color: b.color ?? "#e8a634",
  metric: b.metric,
  threshold: b.threshold,
  customerCount: b.customers_count,
});

/** Loads every badge. */
export async function apiBadges(token: string): Promise<AdminBadge[]> {
  return (await fetchAll<ApiBadge>("/backend/badges", token)).map(toBadge);
}

/** Creates the badge when it has no id yet; otherwise updates it. A badge's code is only sent on create. */
export async function apiSaveBadge(token: string, badge: Badge) {
  await request(badge.id ? `/backend/badges/${badge.id}` : "/backend/badges", {
    method: badge.id ? "PATCH" : "POST",
    token,
    body: {
      ...(!badge.id && { code: badge.code }),
      name: badge.name,
      name_kh: badge.nameKh || null,
      description: badge.description || null,
      icon: badge.icon,
      color: badge.color || null,
      metric: badge.metric,
      threshold: badge.threshold,
    },
  });
}

export async function apiDeleteBadge(token: string, id: string) {
  await request(`/backend/badges/${id}`, { method: "DELETE", token });
}

type ApiReward = {
  id: number;
  min_tier_id: number;
  min_tier: { id: number; name: string } | null;
  name: string;
  name_kh: string | null;
  description: string | null;
  category: string | null;
  points_cost: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  expires_at: string | null;
};

/** Shown for a reward with no image. */
const rewardPlaceholder =
  "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=300&h=200&fit=crop&auto=format";

const toReward = (r: ApiReward): Reward => ({
  id: String(r.id),
  name: r.name,
  nameKh: r.name_kh ?? "",
  description: r.description ?? "",
  pointsCost: r.points_cost,
  stock: r.stock,
  minTier: r.min_tier?.name ?? "",
  active: r.is_active,
  category: r.category ?? "",
  image: r.image_url ?? rewardPlaceholder,
  ...(r.expires_at && { expiresAt: r.expires_at.slice(0, 10) }),
});

/** Loads every reward. */
export async function apiRewards(token: string): Promise<Reward[]> {
  return (await fetchAll<ApiReward>("/backend/rewards", token)).map(toReward);
}

/** The tiers a reward can require, from the entry tier upwards, with their ids. */
export async function apiRewardTierOptions(token: string) {
  const { data } = await request<{ data: { id: number; name: string }[] }>("/backend/rewards/tier-options", { token });
  return data;
}

/**
 * Creates the reward when it has no id yet; otherwise updates it. An `imageFile` is uploaded and replaces the
 * image; otherwise `image` is kept as an external URL (an uploaded image's own URL is left as it is).
 */
export async function apiSaveReward(token: string, reward: Reward, minTierId: number, imageFile?: File | null) {
  // Multipart for the file. PHP only reads multipart bodies on POST, so updates spoof PATCH.
  const form = new FormData();
  if (reward.id) form.append("_method", "PATCH");
  form.append("min_tier_id", String(minTierId));
  form.append("name", reward.name);
  form.append("name_kh", reward.nameKh);
  form.append("description", reward.description);
  form.append("category", reward.category);
  form.append("points_cost", String(reward.pointsCost));
  form.append("is_active", reward.active ? "1" : "0");
  form.append("expires_at", reward.expiresAt ?? "");
  if (imageFile) form.append("image_file", imageFile);
  else if (!reward.image.includes("/storage/")) form.append("image", reward.image);
  await request(reward.id ? `/backend/rewards/${reward.id}` : "/backend/rewards", { method: "POST", token, body: form });
}

/** Activates or deactivates a reward. */
export async function apiSetRewardActive(token: string, id: string, active: boolean) {
  await request(`/backend/rewards/${id}/status`, { method: "PATCH", token, body: { is_active: active } });
}

export async function apiDeleteReward(token: string, id: string) {
  await request(`/backend/rewards/${id}`, { method: "DELETE", token });
}

type ApiCampaign = {
  id: number;
  name: string;
  name_kh: string | null;
  description: string | null;
  image_url: string | null;
  banner_title: string | null;
  banner_subtitle: string | null;
  button_label: string | null;
  link_url: string | null;
  multiplier: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  show_on_home: boolean;
  sort_order: number;
};

const toCampaign = (c: ApiCampaign): Campaign => ({
  id: String(c.id),
  name: c.name,
  nameKh: c.name_kh ?? "",
  description: c.description ?? "",
  image: c.image_url ?? "",
  bannerTitle: c.banner_title ?? "",
  bannerSubtitle: c.banner_subtitle ?? "",
  buttonLabel: c.button_label ?? "",
  linkUrl: c.link_url ?? "",
  multiplier: Number(c.multiplier),
  startDate: c.start_date.slice(0, 10),
  endDate: c.end_date?.slice(0, 10) ?? "",
  active: c.is_active,
  showOnHome: c.show_on_home,
  sortOrder: c.sort_order,
});

/** Loads every campaign, for staff. */
export async function apiCampaigns(token: string): Promise<Campaign[]> {
  return (await fetchAll<ApiCampaign>("/backend/campaigns", token)).map(toCampaign);
}

/**
 * Creates the campaign when it has no id yet; otherwise updates it. An `imageFile` is uploaded and replaces the
 * banner image; otherwise `image` is kept as an external URL (an uploaded image's own URL is left as it is).
 */
export async function apiSaveCampaign(token: string, campaign: Campaign, imageFile?: File | null) {
  // Multipart for the file. PHP only reads multipart bodies on POST, so updates spoof PATCH.
  const form = new FormData();
  if (campaign.id) form.append("_method", "PATCH");
  const fields: Record<string, string> = {
    name: campaign.name,
    name_kh: campaign.nameKh ?? "",
    description: campaign.description ?? "",
    banner_title: campaign.bannerTitle ?? "",
    banner_subtitle: campaign.bannerSubtitle ?? "",
    button_label: campaign.buttonLabel ?? "",
    link_url: campaign.linkUrl ?? "",
    multiplier: String(campaign.multiplier),
    start_date: campaign.startDate,
    end_date: campaign.endDate,
    is_active: campaign.active ? "1" : "0",
    show_on_home: campaign.showOnHome ? "1" : "0",
    sort_order: String(campaign.sortOrder ?? 0),
  };
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  if (imageFile) form.append("image_file", imageFile);
  else if (!campaign.image?.includes("/storage/")) form.append("image", campaign.image ?? "");
  await request(campaign.id ? `/backend/campaigns/${campaign.id}` : "/backend/campaigns", { method: "POST", token, body: form });
}

/** Activates or deactivates a campaign. */
export async function apiSetCampaignActive(token: string, id: string, active: boolean) {
  await request(`/backend/campaigns/${id}/status`, { method: "PATCH", token, body: { is_active: active } });
}

export async function apiDeleteCampaign(token: string, id: string) {
  await request(`/backend/campaigns/${id}`, { method: "DELETE", token });
}

/** A home-page banner: a live campaign the admin chose to show. */
export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  buttonLabel: string;
  linkUrl: string;
  multiplier: number;
};

/** The live home-page banners, in display order. Public: guests see them too. */
export async function apiBanners(): Promise<Banner[]> {
  const { data } = await request<{ data: ApiCampaign[] }>("/campaigns/banners");
  return data.map((c) => ({
    id: String(c.id),
    title: c.banner_title || c.name,
    subtitle: c.banner_subtitle ?? "",
    image: c.image_url ?? "",
    buttonLabel: c.button_label ?? "",
    linkUrl: c.link_url ?? "",
    multiplier: Number(c.multiplier),
  }));
}
