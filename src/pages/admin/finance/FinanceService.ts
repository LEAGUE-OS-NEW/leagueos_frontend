import apiClient from '../../../services/apiClient';
import { extractApiError } from '../../../services/apiUtils';

export type FinanceResource = 'deposits' | 'wallet_transactions' | 'settlements' | 'settlement_participants' | 'refunds' | 'withdrawals' | 'club_commerce' | 'reconciliation_exceptions';
export interface FinanceOverview { deposit_count:number; deposit_total:string; wallet_transaction_count:number; settlement_count:number; settlement_gross_total:string; refund_count:number; refund_total:string; withdrawal_count:number; withdrawal_total:string; club_commerce_count:number; club_commerce_total:string; reconciliation_exception_count:number; }
export interface FinancePage { overview:FinanceOverview; resource:FinanceResource; count:number; page:number; page_size:number; total_pages:number; results:Array<Record<string, unknown>>; }
export interface FinanceQuery { resource:FinanceResource; page?:number; page_size?:number; search?:string; status?:string; provider?:string; market?:string; club?:string; date_from?:string; date_to?:string; }

export async function getFinancePage(query: FinanceQuery): Promise<FinancePage> {
  try {
    const response = await apiClient.get('/admin/finance/', { params: query });
    return response.data as FinancePage;
  } catch (error) {
    throw new Error(extractApiError(error).message, { cause: error });
  }
}
