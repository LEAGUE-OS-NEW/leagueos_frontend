import { fetchPublicStoreProducts, type ClubMerchandiseProduct } from './clubStoreService';

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
  image?: string;
}

const CATEGORY_TO_PUBLIC_CATEGORY: Record<string, ProductCategory> = {
  Apparel: 'Jersey', Training: 'Training Wear', 'Fan Gear': 'Fan Gear', Accessories: 'Accessory', Other: 'Fan Gear',
};

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Jersey: '#dc2626', 'Training Wear': '#1e3a8a', Cap: '#18181b', Scarf: '#7f1d1d', Bundle: '#7c3aed',
  'Fan Gear': '#7f1d1d', Accessory: '#ca8a04',
};

function priceFromApi(apiPrice: string, currency = 'UGX'): string {
  const num = Math.round(Number(apiPrice));
  return num > 0 ? `${currency} ${num.toLocaleString('en-US')}` : apiPrice;
}

function toClubProduct(product: ClubMerchandiseProduct): ClubProduct {
  const catName = (product.metadata?.cat as string) ?? 'Other';
  const category = CATEGORY_TO_PUBLIC_CATEGORY[catName] ?? 'Fan Gear';
  const createdAt = product.published_at ?? '';
  const isNew = createdAt ? Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000 : false;
  return {
    id: product.id, clubSlug: product.club_slug ?? product.club, name: product.name, category,
    price: priceFromApi(product.price, product.currency), accentColor: CATEGORY_COLORS[category],
    badge: (product.metadata?.badge as string) || (isNew ? 'NEW' : undefined),
    originalPrice: (product.metadata?.originalPrice as string) || undefined,
    sizes: Array.isArray(product.metadata?.sizes)
      ? product.metadata.sizes.filter((size): size is string => typeof size === 'string') : undefined,
    image: (product.metadata?.image as string) || undefined,
  };
}

async function fetchProducts(): Promise<ClubProduct[]> {
  return (await fetchPublicStoreProducts()).map(toClubProduct);
}

export async function fetchProductsForClubs(slugs: string[]): Promise<ClubProduct[]> {
  return (await fetchProducts()).filter((product) => slugs.includes(product.clubSlug));
}

export async function fetchAllProducts(): Promise<ClubProduct[]> { return fetchProducts(); }

export async function fetchProductsByCategory(category: ProductCategory): Promise<ClubProduct[]> {
  return (await fetchProducts()).filter((product) => product.category === category);
}

export const CATEGORY_SLUG_MAP: Record<string, ProductCategory> = {
  jerseys: 'Jersey', 'training-wear': 'Training Wear', caps: 'Cap', accessories: 'Accessory',
  'fan-gear': 'Fan Gear', scarves: 'Scarf', bundles: 'Bundle',
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
