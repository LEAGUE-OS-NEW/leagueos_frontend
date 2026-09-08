import apiClient from './apiClient.ts';
import { extractApiError } from './apiUtils.ts';
import type { ClubMerchandiseProduct, ClubStoreOrder } from './clubStoreService.ts';

export type AdminStoreResource = 'products' | 'orders' | 'payments' | 'deliveries';
export interface AdminStoreOverview {
  total_orders: number; sales: string; total_products: number; payments: number;
  refunds: number; by_status: Record<string, number>;
}
export interface AdminStorePage {
  overview: AdminStoreOverview; resource: AdminStoreResource; count: number;
  page: number; page_size: number; total_pages: number;
  results: (ClubMerchandiseProduct | ClubStoreOrder)[];
}
export interface AdminStoreQuery {
  resource: AdminStoreResource; page?: number; page_size?: number; search?: string;
  status?: string; club?: string; date_from?: string; date_to?: string;
}

export async function fetchAdminStoreReport(query: AdminStoreQuery): Promise<AdminStorePage> {
  try {
    const response = await apiClient.get('/admin/store/', { params: query });
    return response.data as AdminStorePage;
  } catch (error) {
    throw new Error(extractApiError(error).message, { cause: error });
  }
}

export async function fetchAdminStoreOrder(orderId: string): Promise<ClubStoreOrder> {
  try {
    const response = await apiClient.get(`/admin/store/orders/${orderId}/`);
    return response.data as ClubStoreOrder;
  } catch (error) {
    throw new Error(extractApiError(error).message, { cause: error });
  }
}
