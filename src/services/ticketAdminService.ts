import apiClient from './apiClient.js';

export type TicketProductStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'SOLD_OUT';
export type TicketOrderStatus = 'PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';

export interface TicketProduct {
  id: string;
  club: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  event: string | null;
  venue: string;
  sales_start: string | null;
  sales_end: string | null;
  capacity: number | null;
  sold: number;
  status: TicketProductStatus;
  is_refundable: boolean;
  metadata: Record<string, unknown>;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
}

export interface TicketOrder {
  id: string;
  product: string;
  product_name: string;
  buyer_email: string;
  quantity: number;
  unit_price: string;
  total_amount: string;
  currency: string;
  status: TicketOrderStatus;
  code: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SaveTicketProductInput {
  name: string;
  description?: string;
  price: string;
  currency?: string;
  venue?: string;
  sales_start?: string | null;
  sales_end?: string | null;
  capacity?: number | null;
  is_refundable?: boolean;
  metadata?: Record<string, unknown>;
}

export async function fetchTicketProducts(clubId: string): Promise<TicketProduct[]> {
  const response = await apiClient.get<TicketProduct[]>(
    `/${encodeURIComponent(clubId)}/ticket-products/`,
  );
  return response.data;
}

export async function createTicketProduct(
  clubId: string,
  payload: SaveTicketProductInput,
): Promise<TicketProduct> {
  const response = await apiClient.post<TicketProduct>(
    `/${encodeURIComponent(clubId)}/ticket-products/`,
    payload,
  );
  return response.data;
}

export async function updateTicketProduct(
  clubId: string,
  productId: string,
  payload: Partial<SaveTicketProductInput>,
): Promise<TicketProduct> {
  const response = await apiClient.patch<TicketProduct>(
    `/${encodeURIComponent(clubId)}/ticket-products/${encodeURIComponent(productId)}/`,
    payload,
  );
  return response.data;
}

export async function deleteTicketProduct(clubId: string, productId: string): Promise<void> {
  await apiClient.delete(
    `/${encodeURIComponent(clubId)}/ticket-products/${encodeURIComponent(productId)}/`,
  );
}

export async function publishTicketProduct(
  clubId: string,
  productId: string,
): Promise<TicketProduct> {
  const response = await apiClient.post<TicketProduct>(
    `/${encodeURIComponent(clubId)}/ticket-products/${encodeURIComponent(productId)}/publish/`,
  );
  return response.data;
}

export async function fetchTicketOrders(
  clubId: string,
  productId: string,
): Promise<TicketOrder[]> {
  const response = await apiClient.get<TicketOrder[]>(
    `/${encodeURIComponent(clubId)}/ticket-products/${encodeURIComponent(productId)}/orders/`,
  );
  return response.data;
}

export async function scanTicketCode(clubId: string, code: string): Promise<TicketOrder> {
  const response = await apiClient.post<TicketOrder>(
    `/${encodeURIComponent(clubId)}/ticket-orders/scan/`,
    { code },
  );
  return response.data;
}
