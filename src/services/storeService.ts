function delay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export type ProductCategory = 'Jersey' | 'Training Wear' | 'Cap' | 'Scarf' | 'Bundle' | 'Fan Gear' | 'Accessory';

export interface ClubProduct {
  id: string;
  clubSlug: string;
  name: string;
  category: ProductCategory;
  price: string;
  originalPrice?: string;
  accentColor: string;
  badge?: string;
  sizes?: string[];
}

const CLUB_PRODUCTS: Record<string, ClubProduct[]> = {
  'vipers-sc': [
    { id: 'vsc-j1', clubSlug: 'vipers-sc', name: 'Home Jersey 2024/25', category: 'Jersey', price: 'UGX 120,000', accentColor: '#dc2626', badge: 'NEW', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'vsc-j2', clubSlug: 'vipers-sc', name: 'Away Jersey 2024/25', category: 'Jersey', price: 'UGX 120,000', accentColor: '#7f1d1d', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'vsc-j3', clubSlug: 'vipers-sc', name: 'Goalkeeper Jersey 2024/25', category: 'Jersey', price: 'UGX 115,000', accentColor: '#1e3a8a', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'vsc-t1', clubSlug: 'vipers-sc', name: 'Training Top 2024', category: 'Training Wear', price: 'UGX 75,000', accentColor: '#dc2626', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'vsc-t2', clubSlug: 'vipers-sc', name: 'Training Shorts 2024', category: 'Training Wear', price: 'UGX 50,000', accentColor: '#991b1b', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'vsc-c1', clubSlug: 'vipers-sc', name: 'Vipers SC Cap', category: 'Cap', price: 'UGX 35,000', accentColor: '#dc2626' },
    { id: 'vsc-s1', clubSlug: 'vipers-sc', name: 'Vipers SC Scarf', category: 'Scarf', price: 'UGX 28,000', accentColor: '#dc2626' },
    { id: 'vsc-g1', clubSlug: 'vipers-sc', name: 'Vipers SC Flag (Large)', category: 'Fan Gear', price: 'UGX 40,000', accentColor: '#dc2626' },
    { id: 'vsc-g2', clubSlug: 'vipers-sc', name: 'Vipers SC Pennant', category: 'Fan Gear', price: 'UGX 18,000', accentColor: '#7f1d1d' },
    { id: 'vsc-a1', clubSlug: 'vipers-sc', name: 'Vipers SC Water Bottle', category: 'Accessory', price: 'UGX 25,000', accentColor: '#dc2626' },
    { id: 'vsc-a2', clubSlug: 'vipers-sc', name: 'Vipers SC Keyring', category: 'Accessory', price: 'UGX 12,000', accentColor: '#991b1b' },
    { id: 'vsc-b1', clubSlug: 'vipers-sc', name: 'Matchday Bundle — Jersey + Cap', category: 'Bundle', price: 'UGX 144,500', originalPrice: 'UGX 170,000', accentColor: '#dc2626', badge: '-15%' },
  ],
  'kcca-fc': [
    { id: 'kcca-j1', clubSlug: 'kcca-fc', name: 'Home Jersey 2024/25', category: 'Jersey', price: 'UGX 115,000', accentColor: '#ca8a04', badge: 'NEW', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'kcca-j2', clubSlug: 'kcca-fc', name: 'Away Jersey 2024/25', category: 'Jersey', price: 'UGX 115,000', accentColor: '#1e3a8a', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'kcca-t1', clubSlug: 'kcca-fc', name: 'Training Top Navy 2024', category: 'Training Wear', price: 'UGX 85,000', accentColor: '#1e3a8a', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'kcca-t2', clubSlug: 'kcca-fc', name: 'Training Tracksuit 2024', category: 'Training Wear', price: 'UGX 130,000', accentColor: '#ca8a04', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'kcca-c1', clubSlug: 'kcca-fc', name: 'KCCA FC Cap', category: 'Cap', price: 'UGX 32,000', accentColor: '#ca8a04' },
    { id: 'kcca-c2', clubSlug: 'kcca-fc', name: 'KCCA FC Bucket Hat', category: 'Cap', price: 'UGX 38,000', accentColor: '#1e3a8a' },
    { id: 'kcca-s1', clubSlug: 'kcca-fc', name: 'KCCA FC Fan Scarf', category: 'Scarf', price: 'UGX 30,000', accentColor: '#ca8a04' },
    { id: 'kcca-g1', clubSlug: 'kcca-fc', name: 'KCCA FC Flag', category: 'Fan Gear', price: 'UGX 38,000', accentColor: '#ca8a04' },
    { id: 'kcca-a1', clubSlug: 'kcca-fc', name: 'KCCA FC Water Bottle', category: 'Accessory', price: 'UGX 22,000', accentColor: '#ca8a04' },
    { id: 'kcca-a2', clubSlug: 'kcca-fc', name: 'KCCA FC Phone Case', category: 'Accessory', price: 'UGX 30,000', accentColor: '#1e3a8a' },
    { id: 'kcca-b1', clubSlug: 'kcca-fc', name: 'Matchday Bundle — Jersey + Scarf', category: 'Bundle', price: 'UGX 136,000', originalPrice: 'UGX 170,000', accentColor: '#ca8a04', badge: '-20%' },
  ],
  'sc-villa': [
    { id: 'svc-j1', clubSlug: 'sc-villa', name: 'Home Jersey 2024/25', category: 'Jersey', price: 'UGX 110,000', accentColor: '#2563eb', badge: 'NEW', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'svc-j2', clubSlug: 'sc-villa', name: 'Away Jersey 2024/25', category: 'Jersey', price: 'UGX 110,000', accentColor: '#1d4ed8', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'svc-t1', clubSlug: 'sc-villa', name: 'Training Top 2024', category: 'Training Wear', price: 'UGX 72,000', accentColor: '#2563eb', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'svc-c1', clubSlug: 'sc-villa', name: 'SC Villa Cap', category: 'Cap', price: 'UGX 30,000', accentColor: '#2563eb' },
    { id: 'svc-s1', clubSlug: 'sc-villa', name: 'SC Villa Fan Scarf', category: 'Scarf', price: 'UGX 28,000', accentColor: '#2563eb' },
    { id: 'svc-g1', clubSlug: 'sc-villa', name: 'SC Villa Flag', category: 'Fan Gear', price: 'UGX 35,000', accentColor: '#1d4ed8' },
    { id: 'svc-g2', clubSlug: 'sc-villa', name: 'SC Villa Car Sticker Pack', category: 'Fan Gear', price: 'UGX 10,000', accentColor: '#2563eb', badge: 'NEW' },
    { id: 'svc-a1', clubSlug: 'sc-villa', name: 'SC Villa Water Bottle', category: 'Accessory', price: 'UGX 20,000', accentColor: '#2563eb' },
    { id: 'svc-a2', clubSlug: 'sc-villa', name: 'SC Villa Keyring', category: 'Accessory', price: 'UGX 10,000', accentColor: '#1d4ed8' },
    { id: 'svc-b1', clubSlug: 'sc-villa', name: 'Villa Matchday Bundle', category: 'Bundle', price: 'UGX 128,000', originalPrice: 'UGX 155,000', accentColor: '#2563eb', badge: '-17%' },
  ],
  'express-fc': [
    { id: 'efc-j1', clubSlug: 'express-fc', name: 'Home Jersey 2024/25', category: 'Jersey', price: 'UGX 100,000', accentColor: '#b91c1c', badge: 'NEW', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'efc-j2', clubSlug: 'express-fc', name: 'Away Jersey 2024/25', category: 'Jersey', price: 'UGX 100,000', accentColor: '#7f1d1d', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'efc-t1', clubSlug: 'express-fc', name: 'Training Top 2024', category: 'Training Wear', price: 'UGX 65,000', accentColor: '#b91c1c', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'efc-c1', clubSlug: 'express-fc', name: 'Red Eagles Cap', category: 'Cap', price: 'UGX 35,000', accentColor: '#991b1b' },
    { id: 'efc-s1', clubSlug: 'express-fc', name: 'Red Eagles Scarf', category: 'Scarf', price: 'UGX 25,000', accentColor: '#b91c1c' },
    { id: 'efc-g1', clubSlug: 'express-fc', name: 'Express FC Flag', category: 'Fan Gear', price: 'UGX 33,000', accentColor: '#b91c1c' },
    { id: 'efc-a1', clubSlug: 'express-fc', name: 'Express FC Mug', category: 'Accessory', price: 'UGX 18,000', accentColor: '#b91c1c' },
    { id: 'efc-a2', clubSlug: 'express-fc', name: 'Express FC Keyring', category: 'Accessory', price: 'UGX 10,000', accentColor: '#991b1b' },
    { id: 'efc-b1', clubSlug: 'express-fc', name: 'Red Eagles Bundle', category: 'Bundle', price: 'UGX 118,000', originalPrice: 'UGX 140,000', accentColor: '#b91c1c', badge: '-16%' },
  ],
  'kobs-rugby': [
    { id: 'kobs-j1', clubSlug: 'kobs-rugby', name: 'Match Jersey 2024', category: 'Jersey', price: 'UGX 95,000', accentColor: '#15803d', badge: 'NEW', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'kobs-j2', clubSlug: 'kobs-rugby', name: 'Alternate Jersey 2024', category: 'Jersey', price: 'UGX 95,000', accentColor: '#14532d', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'kobs-t1', clubSlug: 'kobs-rugby', name: 'Training Tee', category: 'Training Wear', price: 'UGX 60,000', accentColor: '#16a34a', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'kobs-t2', clubSlug: 'kobs-rugby', name: 'Training Shorts', category: 'Training Wear', price: 'UGX 45,000', accentColor: '#15803d', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'kobs-c1', clubSlug: 'kobs-rugby', name: 'Kobs Fan Cap', category: 'Cap', price: 'UGX 35,000', accentColor: '#15803d' },
    { id: 'kobs-s1', clubSlug: 'kobs-rugby', name: 'Kobs Rugby Scarf', category: 'Scarf', price: 'UGX 26,000', accentColor: '#15803d' },
    { id: 'kobs-g1', clubSlug: 'kobs-rugby', name: 'Kobs Rugby Flag', category: 'Fan Gear', price: 'UGX 32,000', accentColor: '#15803d' },
    { id: 'kobs-a1', clubSlug: 'kobs-rugby', name: 'Kobs Water Bottle', category: 'Accessory', price: 'UGX 22,000', accentColor: '#15803d' },
    { id: 'kobs-b1', clubSlug: 'kobs-rugby', name: 'Kobs Fan Bundle', category: 'Bundle', price: 'UGX 108,000', originalPrice: 'UGX 126,000', accentColor: '#15803d', badge: '-14%' },
  ],
  'black-pirates': [
    { id: 'bp-j1', clubSlug: 'black-pirates', name: 'Match Jersey 2024', category: 'Jersey', price: 'UGX 95,000', accentColor: '#27272a', badge: 'NEW', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'bp-j2', clubSlug: 'black-pirates', name: 'Alternate Jersey 2024', category: 'Jersey', price: 'UGX 95,000', accentColor: '#18181b', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'bp-t1', clubSlug: 'black-pirates', name: 'Pirates Training Tee', category: 'Training Wear', price: 'UGX 58,000', accentColor: '#27272a', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'bp-c1', clubSlug: 'black-pirates', name: 'Pirates Fan Cap', category: 'Cap', price: 'UGX 40,000', accentColor: '#18181b' },
    { id: 'bp-s1', clubSlug: 'black-pirates', name: 'Black Pirates Scarf', category: 'Scarf', price: 'UGX 28,000', accentColor: '#27272a' },
    { id: 'bp-g1', clubSlug: 'black-pirates', name: 'Black Pirates Flag', category: 'Fan Gear', price: 'UGX 35,000', accentColor: '#18181b' },
    { id: 'bp-g2', clubSlug: 'black-pirates', name: 'Pirates Skull Pennant', category: 'Fan Gear', price: 'UGX 20,000', accentColor: '#27272a', badge: 'NEW' },
    { id: 'bp-a1', clubSlug: 'black-pirates', name: 'Pirates Mug', category: 'Accessory', price: 'UGX 18,000', accentColor: '#18181b' },
    { id: 'bp-a2', clubSlug: 'black-pirates', name: 'Pirates Keyring', category: 'Accessory', price: 'UGX 11,000', accentColor: '#27272a' },
    { id: 'bp-b1', clubSlug: 'black-pirates', name: 'Pirates Fan Bundle', category: 'Bundle', price: 'UGX 110,000', originalPrice: 'UGX 130,000', accentColor: '#18181b', badge: '-15%' },
  ],
  'city-oilers': [
    { id: 'co-j1', clubSlug: 'city-oilers', name: 'Home Jersey 2024', category: 'Jersey', price: 'UGX 95,000', accentColor: '#1d4ed8', badge: 'NEW', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'co-j2', clubSlug: 'city-oilers', name: 'Away Jersey 2024', category: 'Jersey', price: 'UGX 95,000', accentColor: '#1e3a8a', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'co-t1', clubSlug: 'city-oilers', name: 'Training Top 2024', category: 'Training Wear', price: 'UGX 70,000', accentColor: '#1e40af', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'co-t2', clubSlug: 'city-oilers', name: 'Warm-Up Jacket', category: 'Training Wear', price: 'UGX 110,000', accentColor: '#1d4ed8', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'co-c1', clubSlug: 'city-oilers', name: 'Oilers Cap', category: 'Cap', price: 'UGX 40,000', accentColor: '#1d4ed8' },
    { id: 'co-c2', clubSlug: 'city-oilers', name: 'Oilers Snapback', category: 'Cap', price: 'UGX 45,000', accentColor: '#1e3a8a', badge: 'NEW' },
    { id: 'co-s1', clubSlug: 'city-oilers', name: 'City Oilers Scarf', category: 'Scarf', price: 'UGX 30,000', accentColor: '#1d4ed8' },
    { id: 'co-g1', clubSlug: 'city-oilers', name: 'City Oilers Flag', category: 'Fan Gear', price: 'UGX 38,000', accentColor: '#1d4ed8' },
    { id: 'co-g2', clubSlug: 'city-oilers', name: 'Oilers Team Poster', category: 'Fan Gear', price: 'UGX 15,000', accentColor: '#1e3a8a' },
    { id: 'co-a1', clubSlug: 'city-oilers', name: 'Oilers Water Bottle', category: 'Accessory', price: 'UGX 24,000', accentColor: '#1d4ed8' },
    { id: 'co-a2', clubSlug: 'city-oilers', name: 'Oilers Phone Case', category: 'Accessory', price: 'UGX 28,000', accentColor: '#1e40af' },
    { id: 'co-b1', clubSlug: 'city-oilers', name: 'Oilers Fan Bundle', category: 'Bundle', price: 'UGX 124,000', originalPrice: 'UGX 148,000', accentColor: '#1d4ed8', badge: '-16%' },
  ],
  'ucu-canons': [
    { id: 'uc-j1', clubSlug: 'ucu-canons', name: 'Home Jersey 2024', category: 'Jersey', price: 'UGX 80,000', accentColor: '#9f1239', badge: 'NEW', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'uc-j2', clubSlug: 'ucu-canons', name: 'Away Jersey 2024', category: 'Jersey', price: 'UGX 80,000', accentColor: '#881337', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'uc-t1', clubSlug: 'ucu-canons', name: 'Training Top', category: 'Training Wear', price: 'UGX 55,000', accentColor: '#881337', sizes: ['S', 'M', 'L', 'XL'] },
    { id: 'uc-c1', clubSlug: 'ucu-canons', name: 'Canons Fan Cap', category: 'Cap', price: 'UGX 32,000', accentColor: '#9f1239' },
    { id: 'uc-s1', clubSlug: 'ucu-canons', name: 'UCU Canons Scarf', category: 'Scarf', price: 'UGX 22,000', accentColor: '#9f1239' },
    { id: 'uc-g1', clubSlug: 'ucu-canons', name: 'Canons Flag', category: 'Fan Gear', price: 'UGX 28,000', accentColor: '#9f1239' },
    { id: 'uc-a1', clubSlug: 'ucu-canons', name: 'Canons Keyring', category: 'Accessory', price: 'UGX 9,000', accentColor: '#9f1239' },
    { id: 'uc-b1', clubSlug: 'ucu-canons', name: 'Canons Fan Bundle', category: 'Bundle', price: 'UGX 92,000', originalPrice: 'UGX 110,000', accentColor: '#9f1239', badge: '-16%' },
  ],
};

export async function fetchProductsForClubs(slugs: string[]): Promise<ClubProduct[]> {
  const products = slugs.flatMap((slug) => CLUB_PRODUCTS[slug] ?? []);
  return delay(products);
}

export async function fetchAllProducts(): Promise<ClubProduct[]> {
  const products = Object.values(CLUB_PRODUCTS).flat();
  return delay(products);
}

export async function fetchProductsByCategory(category: ProductCategory): Promise<ClubProduct[]> {
  const products = Object.values(CLUB_PRODUCTS).flat().filter((p) => p.category === category);
  return delay(products);
}

export const CATEGORY_SLUG_MAP: Record<string, ProductCategory> = {
  jerseys: 'Jersey',
  'training-wear': 'Training Wear',
  caps: 'Cap',
  accessories: 'Accessory',
  'fan-gear': 'Fan Gear',
  scarves: 'Scarf',
  bundles: 'Bundle',
};

export const CATEGORY_META: Record<ProductCategory, { label: string; description: string; slug: string }> = {
  Jersey: { label: 'Jerseys', description: 'Official home, away and third kits from your favourite clubs.', slug: 'jerseys' },
  'Training Wear': { label: 'Training Wear', description: 'Train like a pro in official club training tops, shorts and tracksuits.', slug: 'training-wear' },
  Cap: { label: 'Caps & Hats', description: 'Snapbacks, bucket hats and classic caps in club colours.', slug: 'caps' },
  Accessory: { label: 'Accessories', description: 'Water bottles, keyrings, phone cases and more.', slug: 'accessories' },
  'Fan Gear': { label: 'Fan Gear', description: 'Flags, pennants, posters and everything you need to show your pride.', slug: 'fan-gear' },
  Scarf: { label: 'Scarves', description: 'Wear your colours — traditional fan scarves for every club.', slug: 'scarves' },
  Bundle: { label: 'Bundles', description: 'Save more with official matchday bundles combining multiple items.', slug: 'bundles' },
};
