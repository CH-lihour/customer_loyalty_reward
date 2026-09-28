export type Tier = "Silver" | "Gold" | "Platinum";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export interface Customer {
  id: string;
  name: string;
  nameKh: string;
  email: string;
  phone: string;
  province: string;
  avatar: string;
  tier: Tier;
  points: number;
  totalSpent: number;
  joinedAt: string;
  lastOrder: string;
  referralCode: string;
  badges: string[];
  ordersCount: number;
}

export interface Product {
  id: string;
  name: string;
  nameKh: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
  normalPoints: number;
  bonusMultiplier: number;
  featured: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: {
    productId: string;
    name: string;
    qty: number;
    price: number;
    basePoints?: number;
    bonusMultiplier?: number;
  }[];
  total: number;
  status: OrderStatus;
  pointsEarned: number;
  createdAt: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  userName: string;
  type: "EARN" | "SPEND" | "ADJUST" | "REFERRAL";
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  orderId?: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  name: string;
  nameKh: string;
  description: string;
  pointsCost: number;
  stock: number;
  minTier: Tier;
  active: boolean;
  category: string;
  image: string;
  expiresAt?: string;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  nameKh: string;
  description: string;
  icon: string;
  color: string;
  metric?: "orders" | "spend" | "referrals" | "qualifyingPoints";
  threshold?: number;
}

export const CURRENT_USER: Customer = {
  id: "u1",
  name: "Sophea Chan",
  nameKh: "ចាន់ សុភា",
  email: "sophea.chan@gmail.com",
  phone: "+855 12 345 678",
  province: "Phnom Penh",
  avatar:
    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=80&h=80&fit=crop&auto=format",
  tier: "Gold",
  points: 2840,
  totalSpent: 485,
  joinedAt: "2024-03-12",
  lastOrder: "2026-09-10",
  referralCode: "KHMER-SOPHEA-4A2F",
  badges: [
    "FIRST_PURCHASE",
    "FIVE_ORDERS",
    "LOYAL_CUSTOMER",
    "POINT_COLLECTOR",
  ],
  ordersCount: 12,
};

export const customers: Customer[] = [
  CURRENT_USER,
  {
    id: "u2",
    name: "Dara Pich",
    nameKh: "ពិជ ដារា",
    email: "dara.pich@gmail.com",
    phone: "+855 17 234 567",
    province: "Siem Reap",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format",
    tier: "Platinum",
    points: 8200,
    totalSpent: 1240,
    joinedAt: "2023-11-05",
    lastOrder: "2026-09-18",
    referralCode: "KHMER-DARA-9B3C",
    badges: [
      "FIRST_PURCHASE",
      "TEN_ORDERS",
      "BIG_SPENDER",
      "REFERRAL_CHAMPION",
      "POINT_COLLECTOR",
    ],
    ordersCount: 28,
  },
  {
    id: "u3",
    name: "Maly Noun",
    nameKh: "នូន មាលី",
    email: "maly.noun@gmail.com",
    phone: "+855 89 345 678",
    province: "Battambang",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&auto=format",
    tier: "Silver",
    points: 420,
    totalSpent: 95,
    joinedAt: "2026-01-20",
    lastOrder: "2026-08-30",
    referralCode: "KHMER-MALY-5D1E",
    badges: ["FIRST_PURCHASE"],
    ordersCount: 3,
  },
  {
    id: "u4",
    name: "Bunna Sok",
    nameKh: "សុក បុណ្ណ",
    email: "bunna.sok@yahoo.com",
    phone: "+855 12 456 789",
    province: "Kampong Cham",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
    tier: "Gold",
    points: 3100,
    totalSpent: 560,
    joinedAt: "2024-06-08",
    lastOrder: "2026-09-05",
    referralCode: "KHMER-BUNNA-7F4G",
    badges: ["FIRST_PURCHASE", "FIVE_ORDERS", "BIG_SPENDER"],
    ordersCount: 15,
  },
  {
    id: "u5",
    name: "Sreyleak Tep",
    nameKh: "តិប ស្រីលក្ខ",
    email: "sreyleak@gmail.com",
    phone: "+855 96 567 890",
    province: "Phnom Penh",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format",
    tier: "Platinum",
    points: 12400,
    totalSpent: 2100,
    joinedAt: "2023-08-14",
    lastOrder: "2026-09-20",
    referralCode: "KHMER-SREY-2H6I",
    badges: [
      "FIRST_PURCHASE",
      "TEN_ORDERS",
      "BIG_SPENDER",
      "REFERRAL_CHAMPION",
      "LOYAL_CUSTOMER",
      "POINT_COLLECTOR",
    ],
    ordersCount: 42,
  },
  {
    id: "u6",
    name: "Vichet Lim",
    nameKh: "លិម វិចិត្រ",
    email: "vichet.lim@gmail.com",
    phone: "+855 77 678 901",
    province: "Sihanoukville",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format",
    tier: "Silver",
    points: 780,
    totalSpent: 145,
    joinedAt: "2025-05-22",
    lastOrder: "2026-07-15",
    referralCode: "KHMER-VICHET-3J7K",
    badges: ["FIRST_PURCHASE", "FIVE_ORDERS"],
    ordersCount: 6,
  },
  {
    id: "u7",
    name: "Chanthy Ros",
    nameKh: "រស ចន្ទ",
    email: "chanthy.ros@gmail.com",
    phone: "+855 12 789 012",
    province: "Kandal",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&auto=format",
    tier: "Gold",
    points: 4200,
    totalSpent: 780,
    joinedAt: "2024-02-18",
    lastOrder: "2026-09-12",
    referralCode: "KHMER-CHANTHY-8L5M",
    badges: ["FIRST_PURCHASE", "TEN_ORDERS", "LOYAL_CUSTOMER"],
    ordersCount: 19,
  },
  {
    id: "u8",
    name: "Piseth Keo",
    nameKh: "កែវ ពិសិទ្ធ",
    email: "piseth.keo@gmail.com",
    phone: "+855 16 890 123",
    province: "Takeo",
    avatar:
      "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=80&h=80&fit=crop&auto=format",
    tier: "Silver",
    points: 220,
    totalSpent: 60,
    joinedAt: "2026-07-10",
    lastOrder: "2026-09-01",
    referralCode: "KHMER-PISETH-9N2O",
    badges: ["FIRST_PURCHASE"],
    ordersCount: 2,
  },
];

export const products: Product[] = [
  {
    id: "p1",
    name: "Kampot Pepper Coffee",
    nameKh: "កាហ្វេម្រេចកំពត",
    category: "Coffee & Tea",
    price: 12,
    stock: 45,
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop&auto=format",
    description:
      "Premium Cambodian coffee blended with authentic Kampot pepper. Bold, aromatic, and uniquely local.",
    normalPoints: 12,
    bonusMultiplier: 2,
    featured: true,
  },
  {
    id: "p2",
    name: "Khmer Snack Variety Box",
    nameKh: "ប្រអប់អាហារសម្ល",
    category: "Snacks",
    price: 18,
    stock: 30,
    image:
      "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=300&fit=crop&auto=format",
    description:
      "A curated box of traditional Cambodian snacks — dried mango, banana chips, coconut candy, and more.",
    normalPoints: 18,
    bonusMultiplier: 1.5,
    featured: true,
  },
  {
    id: "p3",
    name: "Silk Krama Scarf",
    nameKh: "ក្រមាសូត្រ",
    category: "Clothing",
    price: 35,
    stock: 20,
    image:
      "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&h=300&fit=crop&auto=format",
    description:
      "Traditional Cambodian krama woven from pure silk. Versatile — wear it as a scarf, headband, or sarong.",
    normalPoints: 35,
    bonusMultiplier: 1,
    featured: true,
  },
  {
    id: "p4",
    name: "Jasmine Rice (5kg)",
    nameKh: "អង្ករ​ម្លិះ (5គីឡូ)",
    category: "Food & Grocery",
    price: 8,
    stock: 100,
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop&auto=format",
    description:
      "Phka Malis jasmine rice — Cambodia's award-winning fragrant white rice. Grown in Takeo province.",
    normalPoints: 8,
    bonusMultiplier: 1,
    featured: false,
  },
  {
    id: "p5",
    name: "Coconut Body Lotion",
    nameKh: "លីកូនខ្លាញ់ដូង",
    category: "Beauty",
    price: 14,
    stock: 60,
    image:
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=300&fit=crop&auto=format",
    description:
      "Natural body lotion made with Cambodian coconut oil and lemongrass. Deeply moisturising.",
    normalPoints: 14,
    bonusMultiplier: 2,
    featured: true,
  },
  {
    id: "p6",
    name: "Angkor Craft Beer 6-Pack",
    nameKh: "ស្រាបៀរអង្គរ (6ដប)",
    category: "Beverages",
    price: 16,
    stock: 50,
    image:
      "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop&auto=format",
    description:
      "Cambodia's iconic Angkor beer. Crisp and refreshing, perfect for a warm Phnom Penh evening.",
    normalPoints: 16,
    bonusMultiplier: 1,
    featured: false,
  },
  {
    id: "p7",
    name: "Wireless Earbuds",
    nameKh: "កាស​ wireless",
    category: "Electronics",
    price: 45,
    stock: 25,
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=300&fit=crop&auto=format",
    description:
      "Compact wireless earbuds with 20-hour battery life. Perfect for commuting through Phnom Penh.",
    normalPoints: 45,
    bonusMultiplier: 1.5,
    featured: true,
  },
  {
    id: "p8",
    name: "Dried Mango Strips",
    nameKh: "ស្វាយស្ងួត",
    category: "Snacks",
    price: 6,
    stock: 80,
    image:
      "https://images.unsplash.com/photo-1601493700631-2851384deff5?w=400&h=300&fit=crop&auto=format",
    description:
      "Sun-dried Cambodian mango strips. Naturally sweet with no added sugar. Sourced from Kampong Speu.",
    normalPoints: 6,
    bonusMultiplier: 3,
    featured: false,
  },
  {
    id: "p9",
    name: "Lemongrass Essential Oil",
    nameKh: "ប្រេងស្ករស",
    category: "Beauty",
    price: 22,
    stock: 35,
    image:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=300&fit=crop&auto=format",
    description:
      "Pure lemongrass oil extracted from Cambodian farms. Great for aromatherapy and skin care.",
    normalPoints: 22,
    bonusMultiplier: 2,
    featured: false,
  },
  {
    id: "p10",
    name: "Cambodian Coffee Drip Bag Box",
    nameKh: "ថង់ទម្លាក់កាហ្វេ",
    category: "Coffee & Tea",
    price: 20,
    stock: 55,
    image:
      "https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=400&h=300&fit=crop&auto=format",
    description:
      "Single-serve drip coffee bags from Mondulkiri highlands. Rich, dark roast with chocolate notes.",
    normalPoints: 20,
    bonusMultiplier: 2,
    featured: false,
  },
  {
    id: "p11",
    name: "Phone Stand (Bamboo)",
    nameKh: "ជំហររ​ទូរស័ព្ទ",
    category: "Accessories",
    price: 9,
    stock: 70,
    image:
      "https://images.unsplash.com/photo-1586816879360-004f4d142167?w=400&h=300&fit=crop&auto=format",
    description:
      "Handcrafted bamboo phone stand made by local artisans in Siem Reap. Eco-friendly and stylish.",
    normalPoints: 9,
    bonusMultiplier: 1,
    featured: false,
  },
  {
    id: "p12",
    name: "Traditional Khmer Pottery",
    nameKh: "ភាជន៍ប្រឡោះ",
    category: "Accessories",
    price: 28,
    stock: 15,
    image:
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop&auto=format",
    description:
      "Hand-thrown clay pottery in traditional Khmer designs. A unique home decor piece and cultural gift.",
    normalPoints: 28,
    bonusMultiplier: 1.5,
    featured: false,
  },
];

export const categories = [
  "All",
  "Coffee & Tea",
  "Snacks",
  "Food & Grocery",
  "Clothing",
  "Beauty",
  "Beverages",
  "Electronics",
  "Accessories",
];

export const orders: Order[] = [
  {
    id: "ORD-2609-001",
    customerId: "u1",
    customerName: "Sophea Chan",
    items: [
      { productId: "p1", name: "Kampot Pepper Coffee", qty: 2, price: 12 },
      { productId: "p5", name: "Coconut Body Lotion", qty: 1, price: 14 },
    ],
    total: 38,
    status: "COMPLETED",
    pointsEarned: 76,
    createdAt: "2026-09-10",
  },
  {
    id: "ORD-2608-045",
    customerId: "u1",
    customerName: "Sophea Chan",
    items: [{ productId: "p3", name: "Silk Krama Scarf", qty: 1, price: 35 }],
    total: 35,
    status: "COMPLETED",
    pointsEarned: 35,
    createdAt: "2026-08-22",
  },
  {
    id: "ORD-2608-032",
    customerId: "u1",
    customerName: "Sophea Chan",
    items: [
      { productId: "p7", name: "Wireless Earbuds", qty: 1, price: 45 },
      { productId: "p8", name: "Dried Mango Strips", qty: 3, price: 6 },
    ],
    total: 63,
    status: "COMPLETED",
    pointsEarned: 100,
    createdAt: "2026-08-10",
  },
  {
    id: "ORD-2609-112",
    customerId: "u1",
    customerName: "Sophea Chan",
    items: [
      { productId: "p2", name: "Khmer Snack Variety Box", qty: 1, price: 18 },
    ],
    total: 18,
    status: "PROCESSING",
    pointsEarned: 0,
    createdAt: "2026-09-18",
  },
  {
    id: "ORD-2609-098",
    customerId: "u2",
    customerName: "Dara Pich",
    items: [
      {
        productId: "p12",
        name: "Traditional Khmer Pottery",
        qty: 2,
        price: 28,
      },
    ],
    total: 56,
    status: "SHIPPED",
    pointsEarned: 0,
    createdAt: "2026-09-15",
  },
  {
    id: "ORD-2609-087",
    customerId: "u5",
    customerName: "Sreyleak Tep",
    items: [
      { productId: "p7", name: "Wireless Earbuds", qty: 2, price: 45 },
      { productId: "p10", name: "Coffee Drip Bag Box", qty: 3, price: 20 },
    ],
    total: 150,
    status: "COMPLETED",
    pointsEarned: 300,
    createdAt: "2026-09-08",
  },
  {
    id: "ORD-2609-055",
    customerId: "u4",
    customerName: "Bunna Sok",
    items: [
      { productId: "p6", name: "Angkor Craft Beer 6-Pack", qty: 2, price: 16 },
    ],
    total: 32,
    status: "CONFIRMED",
    pointsEarned: 0,
    createdAt: "2026-09-03",
  },
];

export const loyaltyTransactions: LoyaltyTransaction[] = [
  {
    id: "lt1",
    userId: "u1",
    userName: "Sophea Chan",
    type: "EARN",
    points: 76,
    balanceBefore: 2764,
    balanceAfter: 2840,
    reason: "Completed order ORD-2609-001",
    orderId: "ORD-2609-001",
    createdAt: "2026-09-10",
  },
  {
    id: "lt2",
    userId: "u1",
    userName: "Sophea Chan",
    type: "SPEND",
    points: -500,
    balanceBefore: 3264,
    balanceAfter: 2764,
    reason: "Redeemed: $5 Discount Voucher",
    createdAt: "2026-09-08",
  },
  {
    id: "lt3",
    userId: "u1",
    userName: "Sophea Chan",
    type: "EARN",
    points: 100,
    balanceBefore: 3164,
    balanceAfter: 3264,
    reason: "Completed order ORD-2608-032",
    orderId: "ORD-2608-032",
    createdAt: "2026-08-10",
  },
  {
    id: "lt4",
    userId: "u1",
    userName: "Sophea Chan",
    type: "EARN",
    points: 35,
    balanceBefore: 3129,
    balanceAfter: 3164,
    reason: "Completed order ORD-2608-045",
    orderId: "ORD-2608-045",
    createdAt: "2026-08-22",
  },
  {
    id: "lt5",
    userId: "u1",
    userName: "Sophea Chan",
    type: "REFERRAL",
    points: 100,
    balanceBefore: 3029,
    balanceAfter: 3129,
    reason: "Referral reward — Maly Noun joined using your code",
    createdAt: "2026-01-21",
  },
];

export const rewards: Reward[] = [
  {
    id: "r1",
    name: "$2 Discount Voucher",
    nameKh: "គូប៉ុង $2",
    description: "Get $2 off your next order. Valid for 30 days.",
    pointsCost: 200,
    stock: 999,
    minTier: "Silver",
    active: true,
    category: "Discount",
    image:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=300&h=200&fit=crop&auto=format",
  },
  {
    id: "r2",
    name: "$5 Discount Voucher",
    nameKh: "គូប៉ុង $5",
    description: "Get $5 off your next order. Valid for 30 days.",
    pointsCost: 500,
    stock: 500,
    minTier: "Gold",
    active: true,
    category: "Discount",
    image:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=300&h=200&fit=crop&auto=format",
  },
  {
    id: "r3",
    name: "Free Kampot Coffee",
    nameKh: "កាហ្វេកំពតឥតគិតថ្លៃ",
    description:
      "Redeem a free bag of Kampot Pepper Coffee. Delivered with your next order.",
    pointsCost: 400,
    stock: 50,
    minTier: "Silver",
    active: true,
    category: "Free Product",
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&h=200&fit=crop&auto=format",
  },
  {
    id: "r4",
    name: "Free Shipping Voucher",
    nameKh: "ដឹកជញ្ជូនឥតគិតថ្លៃ",
    description: "Free shipping on your next order, any amount. Valid 14 days.",
    pointsCost: 150,
    stock: 999,
    minTier: "Silver",
    active: true,
    category: "Shipping",
    image:
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300&h=200&fit=crop&auto=format",
  },
  {
    id: "r5",
    name: "Khmer Snack Box",
    nameKh: "ប្រអប់អាហារ",
    description:
      "A premium selection of the best Cambodian snacks. Surprise box!",
    pointsCost: 800,
    stock: 30,
    minTier: "Gold",
    active: true,
    category: "Free Product",
    image:
      "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&h=200&fit=crop&auto=format",
  },
  {
    id: "r6",
    name: "$15 Platinum Voucher",
    nameKh: "គូប៉ុង Platinum $15",
    description: "Exclusive $15 voucher for Platinum members only.",
    pointsCost: 1200,
    stock: 100,
    minTier: "Platinum",
    active: true,
    category: "Discount",
    image:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=300&h=200&fit=crop&auto=format",
  },
  {
    id: "r7",
    name: "Silk Krama Gift",
    nameKh: "ក្រមាសូត្រ​ជា​អំណោយ",
    description:
      "A beautiful traditional Silk Krama — the iconic Cambodian garment. Platinum exclusive.",
    pointsCost: 2000,
    stock: 15,
    minTier: "Platinum",
    active: true,
    category: "Free Product",
    image:
      "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300&h=200&fit=crop&auto=format",
  },
  {
    id: "r8",
    name: "Coffee Tasting Kit",
    nameKh: "ឧបករណ៍ ​សាកល្បងកាហ្វេ",
    description:
      "5 varieties of Cambodian specialty coffee in one curated tasting kit.",
    pointsCost: 600,
    stock: 20,
    minTier: "Gold",
    active: true,
    category: "Free Product",
    image:
      "https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=300&h=200&fit=crop&auto=format",
  },
];

export const badges: Badge[] = [
  {
    id: "b1",
    code: "FIRST_PURCHASE",
    name: "First Purchase",
    nameKh: "ការទិញលើកដំបូង",
    description: "Complete your first order",
    icon: "cart",
    color: "#3b82f6",
  },
  {
    id: "b2",
    code: "LOYAL_CUSTOMER",
    name: "Loyal Customer",
    nameKh: "អតិថិជនស្មោះ",
    description: "Active for 6+ months",
    icon: "heart",
    color: "#f59e0b",
  },
  {
    id: "b3",
    code: "BIG_SPENDER",
    name: "Big Spender",
    nameKh: "ចំណាយច្រើន",
    description: "Spend over $500 total",
    icon: "gem",
    color: "#8b5cf6",
  },
  {
    id: "b4",
    code: "FIVE_ORDERS",
    name: "5 Orders",
    nameKh: "ការបញ្ជាទិញ ៥",
    description: "Complete 5 orders",
    icon: "star",
    color: "#10b981",
  },
  {
    id: "b5",
    code: "TEN_ORDERS",
    name: "10 Orders",
    nameKh: "ការបញ្ជាទិញ ១០",
    description: "Complete 10 orders",
    icon: "trophy",
    color: "#f59e0b",
  },
  {
    id: "b6",
    code: "REFERRAL_CHAMPION",
    name: "Referral Champion",
    nameKh: "ជើងឯកណែនាំ",
    description: "Successfully refer 5 friends",
    icon: "users",
    color: "#ec4899",
  },
  {
    id: "b7",
    code: "POINT_COLLECTOR",
    name: "Point Collector",
    nameKh: "អ្នករក​ Point",
    description: "Earn 1,000+ loyalty points",
    icon: "star",
    color: "#f59e0b",
  },
];

export const tierConfig = {
  Silver: { min: 0, max: 999, multiplier: 1, color: "#94a3b8" },
  Gold: { min: 1000, max: 4999, multiplier: 1.5, color: "#e8a634" },
  Platinum: { min: 5000, max: Infinity, multiplier: 2, color: "#a78bfa" },
};

export const activityLog = [
  {
    id: "al1",
    userId: "u1",
    userName: "Sophea Chan",
    event: "POINTS_EARNED",
    description: "Earned 76 points from order ORD-2609-001",
    timestamp: "2026-09-10 14:22",
  },
  {
    id: "al2",
    userId: "u1",
    userName: "Sophea Chan",
    event: "REWARD_REDEEMED",
    description: "Redeemed $5 Discount Voucher (500 pts)",
    timestamp: "2026-09-08 10:05",
  },
  {
    id: "al3",
    userId: "u5",
    userName: "Sreyleak Tep",
    event: "TIER_UPGRADE",
    description: "Upgraded from Gold to Platinum",
    timestamp: "2026-09-08 09:30",
  },
  {
    id: "al4",
    userId: "u2",
    userName: "Dara Pich",
    event: "ORDER_COMPLETED",
    description: "Order ORD-2609-098 shipped",
    timestamp: "2026-09-07 16:45",
  },
  {
    id: "al5",
    userId: "u3",
    userName: "Maly Noun",
    event: "USER_REGISTER",
    description: "New customer registered from referral KHMER-SOPHEA-4A2F",
    timestamp: "2026-01-20 11:10",
  },
  {
    id: "al6",
    userId: "u7",
    userName: "Chanthy Ros",
    event: "BADGE_AWARDED",
    description: "Earned badge: 10 Orders",
    timestamp: "2026-09-12 08:55",
  },
  {
    id: "al7",
    userId: "u4",
    userName: "Bunna Sok",
    event: "POINTS_ADJUSTED",
    description:
      "Manual adjustment: +200 pts — Compensation for delayed shipment",
    timestamp: "2026-09-03 12:00",
  },
];

export const analytics = {
  totalCustomers: 8,
  activeCustomers: 6,
  totalOrders: 24,
  completedOrders: 18,
  totalPointsIssued: 48200,
  totalPointsRedeemed: 12800,
  silverCustomers: 3,
  goldCustomers: 3,
  platinumCustomers: 2,
  totalRewardsRedeemed: 47,
  referralConversions: 6,
  repeatCustomers: 6,
  oneTimeCustomers: 2,
  inactive30: 1,
  inactive60: 0,
  inactive90: 0,
};
