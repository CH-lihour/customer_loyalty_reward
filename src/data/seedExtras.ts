import type { Customer, Product, Tier } from "./mockData";

const rows: [string, string, Tier, number, number, number][] = [
  ["Sokha Meas", "Phnom Penh", "Silver", 180, 72, 2],
  ["Vannak Chea", "Siem Reap", "Gold", 1350, 330, 7],
  ["Sreymom Chhun", "Battambang", "Silver", 90, 28, 1],
  ["Rithy Heng", "Kampot", "Gold", 2200, 460, 9],
  ["Nita San", "Kandal", "Silver", 560, 140, 3],
  ["Bopha Ly", "Kampong Cham", "Platinum", 5100, 890, 16],
  ["Kosal Chhim", "Takeo", "Silver", 310, 82, 2],
  ["Sothea Kim", "Phnom Penh", "Gold", 1780, 390, 8],
  ["Sokunthea Phan", "Sihanoukville", "Silver", 640, 175, 4],
  ["Makara Touch", "Siem Reap", "Platinum", 6200, 1130, 21],
  ["Sreynich Vong", "Battambang", "Gold", 2900, 600, 11],
  ["Pisey Mao", "Kampot", "Silver", 75, 18, 1],
];
export const extraCustomers: Customer[] = rows.map(
  ([name, province, tier, points, totalSpent, ordersCount], index) => ({
    id: `u${index + 9}`,
    name,
    nameKh: "",
    email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
    phone: `+855 12 67${String(1000 + index).slice(1)}`,
    province,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=262a36&color=e8a634`,
    tier,
    points,
    totalSpent,
    ordersCount,
    joinedAt: "2025-03-12",
    lastOrder: index % 3 === 0 ? "2026-07-20" : "2026-09-12",
    referralCode: `KHMER-${name.split(" ")[0].toUpperCase()}-${index + 1000}`,
    badges:
      ordersCount >= 5 ? ["FIRST_PURCHASE", "FIVE_ORDERS"] : ["FIRST_PURCHASE"],
  }),
);
export const extraProducts: Product[] = [
  {
    id: "p13",
    name: "Palm Sugar Candy",
    nameKh: "ស្ករត្នោត",
    category: "Snacks",
    price: 7,
    stock: 55,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop&auto=format",
    description: "Cambodian palm sugar sweets made by local producers.",
    normalPoints: 7,
    bonusMultiplier: 1,
    featured: false,
  },
  {
    id: "p14",
    name: "Kampot Pepper Gift Jar",
    nameKh: "ម្រេចកំពត",
    category: "Food & Grocery",
    price: 15,
    stock: 40,
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop&auto=format",
    description: "A gift jar of fragrant Kampot pepper.",
    normalPoints: 15,
    bonusMultiplier: 2,
    featured: false,
  },
  {
    id: "p15",
    name: "Handwoven Cotton Krama",
    nameKh: "ក្រមាកប្បាស",
    category: "Clothing",
    price: 13,
    stock: 35,
    image:
      "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=300&fit=crop&auto=format",
    description: "Traditional handwoven cotton krama scarf.",
    normalPoints: 13,
    bonusMultiplier: 1.5,
    featured: false,
  },
];
