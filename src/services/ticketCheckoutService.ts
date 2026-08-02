import apiClient from './apiClient.js';

export interface TicketTypeApi {
  id: number;
  match: number;
  match_label: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  quantity_available: number;
  quantity_sold: number;
  active_reserved_quantity: number;
  remaining_quantity: number;
  sale_start_at?: string | null;
  sale_end_at?: string | null;
  status: string;
}

export interface MatchTicketTypesResponse {
  match: {
    id: number;
    label: string;
    venue: string;
    match_date: string;
    status: string;
  };
  count: number;
  ticket_types: TicketTypeApi[];
}

export interface TicketOrderApi {
  id: number;
  total_amount: string;
  currency: string;
  status: string;
  provider: string;
  payment_reference: string;
  checkout_url?: string;
  reservation_expires_at?: string | null;
  is_reservation_active?: boolean;
  is_reservation_expired?: boolean;
  tickets_count?: number;
}

export interface InitializeTicketCheckoutResponse {
  message: string;
  order: TicketOrderApi;
  tx_ref: string;
  checkout_url: string;
}

export interface VerifyTicketPaymentResponse {
  message: string;
  order: TicketOrderApi;
  tickets?: Array<{
    id: number;
    ticket_code: string;
    ticket_type_name: string;
    match_label: string;
    status: string;
  }>;
}

export async function getMatchTicketTypes(
  matchId: string | number,
): Promise<MatchTicketTypesResponse> {
  const response = await apiClient.get<MatchTicketTypesResponse>(
    `/ticketing/matches/${matchId}/ticket-types/`,
  );

  return response.data;
}

export async function initializeTicketCheckout(payload: {
  ticket_type_id: number;
  quantity: number;
}): Promise<InitializeTicketCheckoutResponse> {
  const response = await apiClient.post<InitializeTicketCheckoutResponse>(
    '/ticketing/orders/flutterwave/initialize/',
    payload,
  );

  return response.data;
}

export async function verifyTicketPayment(
  txRef: string,
): Promise<VerifyTicketPaymentResponse> {
  const response = await apiClient.get<VerifyTicketPaymentResponse>(
    `/ticketing/flutterwave/verify/?tx_ref=${encodeURIComponent(txRef)}`,
  );

  return response.data;
}
