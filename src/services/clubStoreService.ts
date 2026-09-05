import apiClient from './apiClient.ts';
import { normalizeApiList } from './apiUtils.ts';

export type MerchandiseStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'ARCHIVED'
  | 'OUT_OF_STOCK';

export interface ClubProductCategory {
  id: string;
  club: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  display_order: number;
}

export interface ClubMerchandiseProduct {
  id: string;
  club: string;
  club_slug?: string;
  club_name?: string;
  category: string | null;
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  sku: string;
  stock: number;
  reserved_stock: number;
  available_stock: number;
  is_low_stock: boolean;
  low_stock_threshold: number;
  images: unknown[];
  metadata: Record<string, unknown>;
  status: MerchandiseStatus;
  is_featured: boolean;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
}

export interface ClubStoreOrder {
  id: string;
  user: string;
  user_email?: string;
  club: string;
  club_name?: string;
  status:
    | 'PENDING'
    | 'PAID'
    | 'PROCESSING'
    | 'READY_FOR_COLLECTION'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'FULFILLED'
    | 'CANCELLED'
    | 'REFUNDED';
  total_amount: string;
  currency: string;
  shipping_address: Record<string, unknown>;
  metadata: Record<string, unknown>;
  items?: ClubStoreOrderItem[];
  fulfilled_at: string | null;
  cancelled_at: string | null;
  payment_transaction?: string | null;
  payment_reference?: string | null;
  refund_transaction?: string | null;
  refund_reference?: string | null;
  delivery_reference?: string;
}

export interface ClubStoreOrderItem {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface CreatePublicStoreOrderInput {
  idempotency_key: string;
  items: Array<{
    product: string;
    quantity: number;
    size?: string;
  }>;
  shipping_address?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SaveClubProductInput {
  category: string | null;
  name: string;
  description: string;
  price: string;
  currency: string;
  sku: string;
  stock: number;
  low_stock_threshold: number;
  images: unknown[];
  metadata: Record<string, unknown>;
  status: MerchandiseStatus;
  is_featured: boolean;
}

export async function fetchClubProducts(
  clubId: string,
): Promise<ClubMerchandiseProduct[]> {
  const response = await apiClient.get(
    `/${encodeURIComponent(clubId)}/merchandise/`,
  );

  return normalizeApiList<ClubMerchandiseProduct>(
    response.data,
  );
}

export async function fetchPublicStoreProducts(params?: {
  club?: string;
  category?: string;
}): Promise<ClubMerchandiseProduct[]> {
  const response = await apiClient.get('/store/products/', { params });

  return normalizeApiList<ClubMerchandiseProduct>(
    response.data,
  );
}

export async function createClubProduct(
  clubId: string,
  payload: SaveClubProductInput,
): Promise<ClubMerchandiseProduct> {
  const response = await apiClient.post(
    `/${encodeURIComponent(clubId)}/merchandise/`,
    payload,
  );

  return response.data as ClubMerchandiseProduct;
}

export async function updateClubProduct(
  clubId: string,
  productId: string,
  payload: Partial<SaveClubProductInput>,
): Promise<ClubMerchandiseProduct> {
  const response = await apiClient.patch(
    `/${encodeURIComponent(clubId)}/merchandise/${encodeURIComponent(productId)}/`,
    payload,
  );

  return response.data as ClubMerchandiseProduct;
}

export async function deleteClubProduct(
  clubId: string,
  productId: string,
): Promise<void> {
  await apiClient.delete(
    `/${encodeURIComponent(clubId)}/merchandise/${encodeURIComponent(productId)}/`,
  );
}

export async function createPublicStoreOrder(
  payload: CreatePublicStoreOrderInput,
): Promise<ClubStoreOrder[]> {
  const response = await apiClient.post('/store/orders/', payload);

  return (response.data as { orders: ClubStoreOrder[] }).orders;
}

export async function fetchClubProductCategories(
  clubId: string,
): Promise<ClubProductCategory[]> {
  const response = await apiClient.get(
    `/${encodeURIComponent(clubId)}/categories/`,
  );

  return normalizeApiList<ClubProductCategory>(
    response.data,
  );
}

export async function createClubProductCategory(
  clubId: string,
  name: string,
): Promise<ClubProductCategory> {
  const response = await apiClient.post(
    `/${encodeURIComponent(clubId)}/categories/`,
    {
      name,
      description: '',
      is_active: true,
      display_order: 0,
    },
  );

  return response.data as ClubProductCategory;
}

export async function fetchClubStoreOrders(
  clubId: string,
): Promise<ClubStoreOrder[]> {
  const response = await apiClient.get(
    `/${encodeURIComponent(clubId)}/orders/`,
  );

  return normalizeApiList<ClubStoreOrder>(
    response.data,
  );
}

export async function updateClubOrderFulfilment(
  clubId: string,
  orderId: string,
  status: 'PROCESSING' | 'READY_FOR_COLLECTION' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
  note = '',
  deliveryReference = '',
): Promise<ClubStoreOrder> {
  const response = await apiClient.post(
    `/${encodeURIComponent(clubId)}/orders/${encodeURIComponent(orderId)}/fulfilment/`,
    { status, note, delivery_reference: deliveryReference },
  );
  return response.data as ClubStoreOrder;
}

