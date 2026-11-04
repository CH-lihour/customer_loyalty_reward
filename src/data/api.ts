import type { LoginRole } from "../components/LoginPage";
import type { Campaign, CartItem, LogEntry, Referral, TierChange } from "./shop";
import type { Badge, Customer, LoyaltyTransaction, Order, OrderStatus, Product, ProductCategory, Reward } from "./mockData";
import type { Redemption, RestockRequest, StockItem, StockLocation, StockMovement, StockMovementType, Stocktake, Supplier, Tracking } from "./stock";
import type { TierTable } from "./tiers";

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
  qualifying_points?: number;
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
  stock: number;
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
  stock: p.stock ?? 0,
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
  form.append("stock", String(Math.max(0, Math.floor(product.stock))));
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

type ApiPointRow = {
  id: number;
  customer_id: number;
  order_id: number | null;
  type: LoyaltyTransaction["type"];
  points: number;
  balance_before: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
  customer?: { id: number; name: string; email: string };
};

const toPointRow = (t: ApiPointRow): LoyaltyTransaction => ({
  id: String(t.id),
  userId: String(t.customer_id),
  userName: t.customer?.name ?? "",
  type: t.type,
  points: t.points,
  balanceBefore: t.balance_before,
  balanceAfter: t.balance_after,
  reason: t.reason ?? "",
  ...(t.order_id && { orderId: String(t.order_id) }),
  createdAt: t.created_at.slice(0, 10),
});

/** One page of the points ledger for the admin table, newest first. */
export async function apiPointPage(
  token: string,
  query: PageQuery & { search?: string; type?: string; direction?: string; date_from?: string; date_to?: string },
): Promise<ApiPage<LoyaltyTransaction>> {
  const { data, meta } = await fetchPage<ApiPointRow>("/backend/points/transactions", token, query);
  return { rows: data.map(toPointRow), meta };
}

/** A customer in the adjustment form's list. */
export type PointCustomer = { id: string; name: string; email: string; points: number; tier: string };

/** Finds customers for the adjustment form by name, email or ID, with their balance and tier. */
export async function apiSearchPointCustomers(token: string, search: string): Promise<PointCustomer[]> {
  const { data } = await fetchPage<{ id: number; name: string; email: string; points_balance: number; tier: { name: string } | null }>(
    "/backend/points/customers",
    token,
    { page: 1, perPage: 20, search },
  );
  return data.map((c) => ({ id: String(c.id), name: c.name, email: c.email, points: c.points_balance, tier: c.tier?.name ?? "" }));
}

/** Adds (positive) or removes (negative) a customer's points. Returns the new ledger row. */
export async function apiAdjustPoints(token: string, customerId: string, points: string, reason: string) {
  const { data } = await request<{ data: ApiPointRow }>("/backend/points/adjustments", {
    method: "POST",
    token,
    body: { customer_id: Number(customerId), points: points.trim() === "" ? null : Number(points), reason },
  });
  return toPointRow(data);
}

/** The signed-in customer's own points ledger, newest first. */
export async function apiMyPoints(token: string): Promise<LoyaltyTransaction[]> {
  return (await fetchAll<ApiPointRow>("/points", token)).map(toPointRow);
}

/* ---------- Reward stock ---------- */

type ApiStockItem = {
  sku: string;
  unit_cost: number;
  supplier_id: number | null;
  tracking: Tracking;
  low_stock_threshold: number;
  reorder_point: number;
  reorder_qty: number;
  out_of_stock: "hide" | "disable";
  allow_backorder: boolean;
};

type ApiVariant = { id: number; size: string | null; color: string | null; sku: string };

type ApiStockReward = {
  id: number;
  name: string;
  name_kh: string | null;
  description: string | null;
  category: string | null;
  points_cost: number;
  image_url: string | null;
  is_active: boolean;
  min_tier: string | null;
  stock_item: ApiStockItem;
  variants: ApiVariant[];
};

type ApiStockMovement = {
  id: number;
  created_at: string;
  type: StockMovementType;
  reward_id: number;
  variant_id: number | null;
  location_id: number;
  on_hand_delta: number;
  reserved_delta: number;
  batch: string | null;
  expires_at: string | null;
  serials: string[] | null;
  unit_cost: number;
  supplier_id: number | null;
  source: "PURCHASE" | "DONATION" | null;
  reference: string | null;
  reason: string | null;
  actor_id: number;
  actor_name: string | null;
};

type ApiStocktake = {
  id: number;
  reference: string;
  location_id: number;
  category: string | null;
  status: Stocktake["status"];
  note: string | null;
  created_at: string;
  created_by: string | null;
  posted_at: string | null;
  posted_by: string | null;
  lines: {
    id: number;
    reward_id: number;
    variant_id: number | null;
    batch: string | null;
    serial: string | null;
    expected: number;
    counted: number | null;
    system_at_post: number | null;
  }[];
};

const idOrBlank = (id: number | null | undefined) => (id === null || id === undefined ? "" : String(id));
/** API ids for the ids the store keeps as strings; blank means none. */
const apiId = (id: string | undefined) => (id ? Number(id) : null);
/** Stocktakes are shown by their reference, "ST-000012"; the API addresses them by number. */
const stocktakeApiId = (id: string) => Number(id.replace(/^ST-/, ""));

/** The store's reward shape for a stock row. */
const toStockReward = (r: ApiStockReward): Reward => ({
  id: String(r.id),
  name: r.name,
  nameKh: r.name_kh ?? "",
  description: r.description ?? "",
  pointsCost: r.points_cost,
  stock: 0,
  minTier: r.min_tier ?? "",
  active: r.is_active,
  category: r.category ?? "",
  image: r.image_url ?? "",
});

const toStockItem = (r: ApiStockReward): StockItem => ({
  rewardId: String(r.id),
  sku: r.stock_item.sku,
  unitCost: r.stock_item.unit_cost,
  supplierId: idOrBlank(r.stock_item.supplier_id),
  tracking: r.stock_item.tracking,
  variants: r.variants.map((v) => ({ id: String(v.id), size: v.size ?? "", color: v.color ?? "", sku: v.sku })),
  lowStockThreshold: r.stock_item.low_stock_threshold,
  reorderPoint: r.stock_item.reorder_point,
  reorderQty: r.stock_item.reorder_qty,
  outOfStock: r.stock_item.out_of_stock,
  allowBackorder: r.stock_item.allow_backorder,
});

const toMovement = (m: ApiStockMovement): StockMovement => ({
  id: String(m.id),
  createdAt: m.created_at,
  type: m.type,
  rewardId: String(m.reward_id),
  variantId: idOrBlank(m.variant_id),
  locationId: String(m.location_id),
  onHand: m.on_hand_delta,
  reserved: m.reserved_delta,
  batch: m.batch ?? undefined,
  expiresAt: m.expires_at ?? undefined,
  serials: m.serials ?? undefined,
  unitCost: m.unit_cost,
  supplierId: m.supplier_id === null ? undefined : String(m.supplier_id),
  source: m.source ?? undefined,
  reference: m.reference ?? undefined,
  reason: m.reason ?? undefined,
  // Matches the staff user ids `linkApiAdmin` gives API accounts.
  actorId: `api-admin-${m.actor_id}`,
  actorName: m.actor_name ?? "Staff",
});

const toStocktake = (t: ApiStocktake): Stocktake => ({
  id: t.reference,
  locationId: String(t.location_id),
  category: t.category ?? "",
  status: t.status,
  note: t.note ?? "",
  createdAt: t.created_at,
  createdBy: t.created_by ?? "Staff",
  postedAt: t.posted_at ?? undefined,
  postedBy: t.posted_by ?? undefined,
  lines: t.lines.map((l) => ({
    id: String(l.id),
    rewardId: String(l.reward_id),
    variantId: idOrBlank(l.variant_id),
    batch: l.batch ?? "",
    serial: l.serial ?? undefined,
    expected: l.expected,
    counted: l.counted,
    systemAtPost: l.system_at_post ?? undefined,
  })),
});

/** Everything the inventory pages work from, in the store's shapes. */
export type StockSnapshot = {
  rewards: Reward[];
  stockItems: Record<string, StockItem>;
  stockLocations: StockLocation[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
  stocktakes: Stocktake[];
  redemptions: Redemption[];
  restockRequests: RestockRequest[];
  stockSettings: { reservationHours: number };
};

/** Loads the stock rewards and rules, locations, suppliers, the ledger (newest first) and stocktakes. */
export async function apiStock(token: string): Promise<StockSnapshot> {
  const { data } = await request<{
    data: {
      rewards: ApiStockReward[];
      locations: { id: number; name: string; name_kh: string | null; type: StockLocation["type"]; is_active: boolean }[];
      suppliers: { id: number; name: string; kind: Supplier["kind"]; contact_name: string | null; phone: string | null; email: string | null; is_active: boolean }[];
      movements: ApiStockMovement[];
      stocktakes: ApiStocktake[];
      redemptions: ApiRedemption[];
      restock_requests: ApiRestockRequest[];
      reservation_hours: number;
    };
  }>("/backend/stock", { token });
  return {
    rewards: data.rewards.map(toStockReward),
    stockItems: Object.fromEntries(data.rewards.map((r) => [String(r.id), toStockItem(r)])),
    stockLocations: data.locations.map((l) => ({ id: String(l.id), name: l.name, nameKh: l.name_kh ?? "", type: l.type, active: l.is_active })),
    suppliers: data.suppliers.map((s) => ({
      id: String(s.id), name: s.name, kind: s.kind, contact: s.contact_name ?? "", phone: s.phone ?? "", email: s.email ?? "", active: s.is_active,
    })),
    stockMovements: data.movements.map(toMovement),
    stocktakes: data.stocktakes.map(toStocktake),
    redemptions: data.redemptions.map(toRedemption),
    restockRequests: data.restock_requests.map(toRestockRequest),
    stockSettings: { reservationHours: data.reservation_hours },
  };
}

/** Filters of the movements table, by API id. */
export type StockMovementFilters = { from?: string; to?: string; type?: string; location_id?: string; reward_id?: string; actor_id?: string };

/** One page of the stock ledger, with the net on-hand change of every matching entry. */
export async function apiStockMovementPage(token: string, query: PageQuery & StockMovementFilters): Promise<ApiPage<StockMovement> & { netOnHand: number }> {
  const { data, meta, net_on_hand } = (await fetchPage<ApiStockMovement>("/backend/stock-movements", token, query)) as {
    data: ApiStockMovement[];
    meta: PageMeta;
    net_on_hand: number;
  };
  return { rows: data.map(toMovement), meta, netOnHand: net_on_hand };
}

/** The shared fields of every stock form, plus the fields of the form being sent. */
export type StockMovementBody = {
  type: "receive" | "adjust" | "transfer" | "writeoff" | "return";
  rewardId: string;
  variantId: string;
  locationId: string;
  qty: number;
  batch?: string;
  expiresAt?: string;
  serials?: string[];
} & Partial<{
  source: "PURCHASE" | "DONATION";
  supplierId: string;
  unitCost: number;
  reference: string;
  reason: string;
  direction: "in" | "out";
  toLocationId: string;
  kind: "DAMAGE" | "LOSS" | "EXPIRY";
  /** A return of this fulfilled redemption, which closes it. */
  redemptionId: string;
  refundPoints: boolean;
}>;

/** Records a receive, adjustment, transfer, write-off or return in the ledger. */
export async function apiRecordStockMovement(token: string, body: StockMovementBody) {
  await request("/backend/stock-movements", {
    method: "POST",
    token,
    body: {
      type: body.type,
      reward_id: Number(body.rewardId),
      variant_id: apiId(body.variantId),
      location_id: Number(body.locationId),
      quantity: body.qty,
      batch: body.batch || null,
      expires_at: body.expiresAt || null,
      serials: body.serials?.length ? body.serials : null,
      ...(body.source !== undefined && { source: body.source }),
      ...(body.supplierId !== undefined && { supplier_id: apiId(body.supplierId) }),
      ...(body.unitCost !== undefined && { unit_cost: body.unitCost }),
      ...(body.reference !== undefined && { reference: body.reference || null }),
      ...(body.reason !== undefined && { reason: body.reason || null }),
      ...(body.direction !== undefined && { direction: body.direction }),
      ...(body.toLocationId !== undefined && { to_location_id: Number(body.toLocationId) }),
      ...(body.kind !== undefined && { kind: body.kind }),
      ...(body.redemptionId && { redemption_id: Number(body.redemptionId), refund_points: Boolean(body.refundPoints) }),
    },
  });
}

/** Saves a reward's stock rules and variants. Variants the API has not stored yet are sent without an id. */
export async function apiSaveStockItem(token: string, item: StockItem) {
  await request(`/backend/stock-items/${item.rewardId}`, {
    method: "PUT",
    token,
    body: {
      sku: item.sku,
      unit_cost: item.unitCost,
      supplier_id: apiId(item.supplierId),
      tracking: item.tracking,
      low_stock_threshold: item.lowStockThreshold,
      reorder_point: item.reorderPoint,
      reorder_qty: item.reorderQty,
      out_of_stock: item.outOfStock,
      allow_backorder: item.allowBackorder,
      variants: item.variants.map((v) => ({
        ...(/^\d+$/.test(v.id) && { id: Number(v.id) }),
        size: v.size,
        color: v.color,
        sku: v.sku,
      })),
    },
  });
}

/** Creates the location when it has no id yet; otherwise updates it. */
export async function apiSaveStockLocation(token: string, location: StockLocation) {
  await request(location.id ? `/backend/stock-locations/${location.id}` : "/backend/stock-locations", {
    method: location.id ? "PATCH" : "POST",
    token,
    body: { name: location.name, name_kh: location.nameKh || null, type: location.type, is_active: location.active },
  });
}

/** Creates the supplier or partner when it has no id yet; otherwise updates it. */
export async function apiSaveSupplier(token: string, supplier: Supplier) {
  await request(supplier.id ? `/backend/suppliers/${supplier.id}` : "/backend/suppliers", {
    method: supplier.id ? "PATCH" : "POST",
    token,
    body: {
      name: supplier.name,
      kind: supplier.kind,
      contact_name: supplier.contact,
      phone: supplier.phone,
      email: supplier.email,
      is_active: supplier.active,
    },
  });
}

/** Starts a count at a location. Returns the new stocktake's id (its reference). */
export async function apiCreateStocktake(token: string, locationId: string, category: string, note: string) {
  const { data } = await request<{ data: ApiStocktake }>("/backend/stocktakes", {
    method: "POST",
    token,
    body: { location_id: Number(locationId), category: category || null, note: note || null },
  });
  return data.reference;
}

/** Records or clears one line's count. */
export async function apiRecordCount(token: string, stocktakeId: string, lineId: string, counted: number | null) {
  await request(`/backend/stocktakes/${stocktakeApiId(stocktakeId)}/lines/${lineId}`, { method: "PATCH", token, body: { counted } });
}

export async function apiPostStocktake(token: string, stocktakeId: string) {
  await request(`/backend/stocktakes/${stocktakeApiId(stocktakeId)}/post`, { method: "POST", token });
}

export async function apiCancelStocktake(token: string, stocktakeId: string) {
  await request(`/backend/stocktakes/${stocktakeApiId(stocktakeId)}/cancel`, { method: "POST", token });
}

/** Changes how long a redemption holds its unit. */
export async function apiSaveStockSettings(token: string, reservationHours: number) {
  await request("/backend/stock-settings", { method: "PUT", token, body: { reservation_hours: reservationHours } });
}

/* ---------- Redemptions ---------- */

type ApiRedemption = {
  id: number;
  customer_id: number;
  reward_id: number;
  reward_name: string;
  variant_id: number | null;
  location_id: number | null;
  points: number;
  status: Redemption["status"];
  fulfillment: Redemption["fulfillment"] | null;
  created_at: string;
  reserved_until: string | null;
  fulfilled_at: string | null;
  batch: string | null;
  serial: string | null;
  closed_at: string | null;
  close_reason: string | null;
};

type ApiRestockRequest = {
  id: number;
  customer_id: number;
  reward_id: number;
  variant_id: number | null;
  created_at: string;
  notified_at: string | null;
};

const toRedemption = (r: ApiRedemption): Redemption => ({
  id: String(r.id),
  userId: String(r.customer_id),
  rewardId: String(r.reward_id),
  rewardName: r.reward_name,
  points: r.points,
  createdAt: r.created_at.slice(0, 10),
  status: r.status,
  variantId: idOrBlank(r.variant_id),
  locationId: r.location_id === null ? undefined : String(r.location_id),
  reservedAt: r.reserved_until ? r.created_at : undefined,
  reservedUntil: r.reserved_until ?? undefined,
  fulfilledAt: r.fulfilled_at ?? undefined,
  fulfillment: r.fulfillment ?? undefined,
  batch: r.batch ?? undefined,
  serial: r.serial ?? undefined,
  closedAt: r.closed_at ?? undefined,
  closeReason: r.close_reason ?? undefined,
});

const toRestockRequest = (r: ApiRestockRequest): RestockRequest => ({
  id: String(r.id),
  userId: String(r.customer_id),
  rewardId: String(r.reward_id),
  variantId: idOrBlank(r.variant_id),
  createdAt: r.created_at,
  notifiedAt: r.notified_at ?? undefined,
});

/** Spends the signed-in customer's points on a reward. */
export async function apiRedeem(token: string, rewardId: string, variantId: string) {
  await request("/redemptions", { method: "POST", token, body: { reward_id: Number(rewardId), variant_id: apiId(variantId) } });
}

/** Cancels one of the signed-in customer's redemptions, refunding its points. */
export async function apiCancelMyRedemption(token: string, id: string) {
  await request(`/redemptions/${id}/cancel`, { method: "POST", token });
}

/** Asks to hear when a sold-out reward is back in stock. */
export async function apiRequestRestock(token: string, rewardId: string, variantId: string) {
  await request("/restock-requests", { method: "POST", token, body: { reward_id: Number(rewardId), variant_id: apiId(variantId) } });
}

export async function apiDismissRestock(token: string, id: string) {
  await request(`/restock-requests/${id}`, { method: "DELETE", token });
}

/** Hands a reserved redemption to the customer, taking the unit out of stock. */
export async function apiFulfillRedemption(token: string, id: string, method: "SHIPPED" | "PICKED_UP", serial?: string) {
  await request(`/backend/redemptions/${id}/fulfill`, { method: "POST", token, body: { method, serial: serial || null } });
}

export async function apiCancelRedemption(token: string, id: string, reason: string) {
  await request(`/backend/redemptions/${id}/cancel`, { method: "POST", token, body: { reason } });
}

export async function apiExtendReservation(token: string, id: string, hours: number) {
  await request(`/backend/redemptions/${id}/extend`, { method: "POST", token, body: { hours } });
}

/* ---------- Storefront ---------- */

type ApiStorefrontReward = ApiReward & {
  stock_item: { sku: string; tracking: Tracking; out_of_stock: "hide" | "disable"; allow_backorder: boolean };
  variants: ApiVariant[];
  available: Record<string, number>;
};

/** Everything guests and customers browse, in the store's shapes. */
export type Storefront = {
  categories: ProductCategory[];
  products: Product[];
  rewards: Reward[];
  stockItems: Record<string, StockItem>;
  /** Units available by "reward|variant"; a blank variant is the standard item. */
  availability: Record<string, number>;
  tiers: TierTable;
  badges: Badge[];
  campaigns: Campaign[];
  exchangeRate: number;
};

const toStorefrontStockItem = (r: ApiStorefrontReward): StockItem => ({
  rewardId: String(r.id),
  sku: r.stock_item.sku,
  unitCost: 0,
  supplierId: "",
  tracking: r.stock_item.tracking,
  variants: r.variants.map((v) => ({ id: String(v.id), size: v.size ?? "", color: v.color ?? "", sku: v.sku })),
  lowStockThreshold: 0,
  reorderPoint: 0,
  reorderQty: 0,
  outOfStock: r.stock_item.out_of_stock,
  allowBackorder: r.stock_item.allow_backorder,
});

/** Loads the storefront. Public: guests see it too. */
export async function apiStorefront(): Promise<Storefront> {
  const { data } = await request<{
    data: {
      categories: ApiCategory[];
      products: ApiProduct[];
      rewards: ApiStorefrontReward[];
      tiers: Omit<ApiTier, "customers_count">[];
      badges: Omit<ApiBadge, "customers_count">[];
      campaigns: ApiCampaign[];
      exchange_rate: number;
    };
  }>("/storefront");
  return {
    categories: data.categories.map(toCategory),
    products: data.products.map(toProduct),
    rewards: data.rewards.map(toReward),
    stockItems: Object.fromEntries(data.rewards.map((r) => [String(r.id), toStorefrontStockItem(r)])),
    availability: Object.fromEntries(
      data.rewards.flatMap((r) => Object.entries(r.available).map(([variantId, units]) => [`${r.id}|${variantId}`, units])),
    ),
    tiers: Object.fromEntries(
      data.tiers.map((t) => [
        t.name,
        { min: t.min_points, max: t.max_points ?? Infinity, multiplier: Number(t.multiplier), color: t.color ?? "#94a3b8" },
      ]),
    ),
    badges: data.badges.map((b) => {
      const { customerCount: _, ...badge } = toBadge({ ...b, customers_count: 0 });
      return badge;
    }),
    campaigns: data.campaigns.map(toCampaign),
    exchangeRate: data.exchange_rate,
  };
}

/* ---------- Customers ---------- */

type ApiCustomer = {
  id: number;
  name: string;
  name_kh: string | null;
  email: string;
  phone: string | null;
  province: string | null;
  referral_code: string;
  points_balance: number;
  qualifying_points: number;
  is_active: boolean;
  tier_locked: boolean;
  avatar: string | null;
  total_spent: number;
  tier: string | null;
  joined_at: string | null;
  last_order_at: string | null;
  orders_count: number;
  badges: string[];
};

/** A customer in the store's shape, plus what the store keeps beside the customer. */
export type CustomerRecord = { customer: Customer; qualifyingPoints: number; tierLocked: boolean; active: boolean };

const toCustomerRecord = (c: ApiCustomer): CustomerRecord => ({
  customer: {
    id: String(c.id),
    name: c.name,
    nameKh: c.name_kh ?? "",
    email: c.email,
    phone: c.phone ?? "",
    province: c.province ?? "",
    avatar: c.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=262a36&color=e8a634`,
    tier: c.tier ?? "",
    points: c.points_balance,
    totalSpent: c.total_spent,
    joinedAt: c.joined_at ?? "",
    lastOrder: c.last_order_at ?? "",
    referralCode: c.referral_code,
    badges: c.badges,
    ordersCount: c.orders_count,
  },
  qualifyingPoints: c.qualifying_points,
  tierLocked: c.tier_locked,
  active: c.is_active,
});

/** Loads every customer, for staff. */
export async function apiCustomers(token: string): Promise<CustomerRecord[]> {
  return (await fetchAll<ApiCustomer>("/backend/customers", token)).map(toCustomerRecord);
}

/** Locks a customer to a tier, or lets their points decide it again when `tier` is null. */
export async function apiOverrideTier(token: string, id: string, tier: string | null, reason: string) {
  await request(`/backend/customers/${id}/tier`, { method: "PATCH", token, body: { tier, reason } });
}

export async function apiSetCustomerActive(token: string, id: string, active: boolean) {
  await request(`/backend/customers/${id}/status`, { method: "PATCH", token, body: { is_active: active } });
}

/** Updates the signed-in customer's own details. */
export async function apiUpdateProfile(token: string, fields: { name: string; phone: string; province: string }) {
  await request("/profile", { method: "PATCH", token, body: fields });
}

/* ---------- Orders ---------- */

type ApiOrder = {
  id: number;
  reference: string;
  customer_id: number;
  customer_name: string | null;
  status: OrderStatus;
  total: number;
  points_earned: number;
  ordered_at: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  items: { product_id: number; name: string | null; quantity: number; unit_price: number; base_points: number; bonus_multiplier: number }[];
};

/** Orders are shown by their reference, "ORD-000012"; the API addresses them by number. */
const orderApiId = (id: string) => Number(id.replace(/^ORD-/, ""));

const toOrder = (o: ApiOrder): Order => ({
  id: o.reference,
  customerId: String(o.customer_id),
  customerName: o.customer_name ?? "",
  items: o.items.map((item) => ({
    productId: String(item.product_id),
    name: item.name ?? "",
    qty: item.quantity,
    price: item.unit_price,
    basePoints: item.base_points,
    bonusMultiplier: item.bonus_multiplier,
  })),
  total: o.total,
  status: o.status,
  pointsEarned: o.points_earned,
  createdAt: (o.ordered_at ?? "").slice(0, 10),
  deliveryAddress: o.delivery_address ?? undefined,
  deliveryPhone: o.delivery_phone ?? undefined,
});

/** Places an order for the signed-in customer. Prices and points come from the server. */
export async function apiCheckout(token: string, cart: CartItem[], address: string, phone: string) {
  await request("/checkout", {
    method: "POST",
    token,
    body: { items: cart.map((item) => ({ product_id: Number(item.productId), quantity: item.qty })), address, phone },
  });
}

/** Loads every order, newest first, for staff. */
export async function apiOrders(token: string): Promise<Order[]> {
  return (await fetchAll<ApiOrder>("/backend/orders", token)).map(toOrder);
}

export async function apiUpdateOrderStatus(token: string, id: string, status: OrderStatus) {
  await request(`/backend/orders/${orderApiId(id)}/status`, { method: "PATCH", token, body: { status } });
}

/* ---------- Referrals ---------- */

type ApiReferral = {
  id: number;
  referrer_id: number;
  referrer_name: string | null;
  referred_id: number;
  referred_name: string | null;
  completed: boolean;
  created_at: string | null;
};

const toReferral = (r: ApiReferral): Referral => ({
  id: String(r.id),
  referrerId: String(r.referrer_id),
  referrerName: r.referrer_name ?? undefined,
  customerId: String(r.referred_id),
  customerName: r.referred_name ?? undefined,
  completed: r.completed,
  createdAt: r.created_at ?? "",
});

/** Loads every referral, for staff. */
export async function apiReferrals(token: string): Promise<Referral[]> {
  return (await fetchAll<ApiReferral>("/backend/referrals", token)).map(toReferral);
}

/* ---------- Customer account ---------- */

/** Everything about the signed-in customer, in the store's shapes. */
export type Account = {
  record: CustomerRecord;
  orders: Order[];
  redemptions: Redemption[];
  restockRequests: RestockRequest[];
  referrals: Referral[];
  tierHistory: TierChange[];
};

export async function apiAccount(token: string): Promise<Account> {
  const { data } = await request<{
    data: {
      profile: ApiCustomer;
      orders: ApiOrder[];
      redemptions: ApiRedemption[];
      restock_requests: ApiRestockRequest[];
      referrals: ApiReferral[];
      tier_history: { id: number; customer_id: number; from: string | null; to: string | null; reason: string | null; created_at: string | null }[];
    };
  }>("/account", { token });
  return {
    record: toCustomerRecord(data.profile),
    orders: data.orders.map(toOrder),
    redemptions: data.redemptions.map(toRedemption),
    restockRequests: data.restock_requests.map(toRestockRequest),
    referrals: data.referrals.map(toReferral),
    tierHistory: data.tier_history.map((t) => ({
      id: String(t.id),
      userId: String(t.customer_id),
      from: t.from ?? "",
      to: t.to ?? "",
      reason: t.reason ?? "",
      createdAt: (t.created_at ?? "").slice(0, 10),
    })),
  };
}

/* ---------- Activity log, reports and settings ---------- */

type ApiLog = {
  id: number;
  customer_id: number | null;
  user_id: number | null;
  actor_name: string;
  event: string;
  description: string | null;
  created_at: string | null;
};

/** The latest activity log entries. Staff ids match the ones `linkApiAdmin` gives API accounts. */
export async function apiActivityLogs(token: string): Promise<LogEntry[]> {
  const { data } = await fetchPage<ApiLog>("/backend/activity-logs", token, { page: 1, perPage: 100 });
  return data.map((log) => ({
    id: String(log.id),
    userId: log.user_id !== null ? `api-admin-${log.user_id}` : log.customer_id !== null ? String(log.customer_id) : "system",
    userName: log.actor_name,
    event: log.event,
    description: log.description ?? "",
    timestamp: (log.created_at ?? "").replace("T", " ").slice(0, 16),
  }));
}

/** The totals the dashboards show, which most staff cannot add up from the ledger themselves. */
export type ReportTotals = { pointsIssued: number; pointsRedeemed: number; rewardsRedeemed: number };

export async function apiReportTotals(token: string): Promise<ReportTotals> {
  const { data } = await request<{ data: { points_issued: number; points_redeemed: number; rewards_redeemed: number } }>(
    "/backend/reports/summary",
    { token },
  );
  return { pointsIssued: data.points_issued, pointsRedeemed: data.points_redeemed, rewardsRedeemed: data.rewards_redeemed };
}

/** Changes the KHR rate for one US dollar. */
export async function apiSaveExchangeRate(token: string, rate: number) {
  await request("/backend/settings/exchange-rate", { method: "PUT", token, body: { rate } });
}

/** Updates the signed-in staff user's own name and email. */
export async function apiUpdateStaffProfile(token: string, fields: { name: string; email: string }) {
  await request("/backend/profile", { method: "PATCH", token, body: fields });
}
