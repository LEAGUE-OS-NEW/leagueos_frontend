import apiClient from './apiClient.ts';
import { extractApiError } from './apiUtils.ts';
import type { ClubMerchandiseProduct, ClubStoreOrder } from './clubStoreService.ts';

export interface AdminStoreReport {
  overview: { total_orders: number; sales: string; by_status: Record<string, number> };
  products: ClubMerchandiseProduct[];
  orders: ClubStoreOrder[];
}

export async function fetchAdminStoreReport(): Promise<AdminStoreReport> {
  try {
    const response = await apiClient.get('/admin/store/');
    return response.data as AdminStoreReport;
  } catch (error) {
    throw new Error(extractApiError(error).message, { cause: error });
  }
}
