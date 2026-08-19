/**
 * Ticketing admin service — club admin ticket type management.
 * Endpoints mirror the existing ticketCheckoutService fan endpoints
 * but add create/update/delete for ticket types.
 */
import apiClient from './apiClient';
import { normalizeApiList } from './apiUtils';

export interface AdminTicketTypeApi {
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
  sale_start_at: string | null;
  sale_end_at: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

export interface AdminTicketType {
  id: number;
  matchId: number;
  matchLabel: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  quantityAvailable: number;
  quantitySold: number;
  remaining: number;
  saleStartAt: string | null;
  saleEndAt: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

export interface CreateTicketTypeInput {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  quantity_available: number;
  sale_start_at?: string | null;
  sale_end_at?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

function mapTicketType(raw: AdminTicketTypeApi): AdminTicketType {
  return {
    id: raw.id,
    matchId: raw.match,
    matchLabel: raw.match_label,
    name: raw.name,
    description: raw.description,
    price: Number(raw.price),
    currency: raw.currency,
    quantityAvailable: raw.quantity_available,
    quantitySold: raw.quantity_sold,
    remaining: raw.remaining_quantity,
    saleStartAt: raw.sale_start_at,
    saleEndAt: raw.sale_end_at,
    status: raw.status ?? 'DRAFT',
  };
}

export async function fetchMatchTicketTypesAdmin(
  matchId: string | number,
): Promise<AdminTicketType[]> {
  const response = await apiClient.get(
    `/ticketing/matches/${encodeURIComponent(String(matchId))}/ticket-types/`,
  );
  // Response may be { match: {...}, ticket_types: [...] } or a list
  const raw = response.data as { ticket_types?: AdminTicketTypeApi[] } | AdminTicketTypeApi[];
  const items = Array.isArray(raw)
    ? raw
    : (raw.ticket_types ?? []);
  return items.map(mapTicketType);
}

export async function createTicketType(
  matchId: string | number,
  input: CreateTicketTypeInput,
): Promise<AdminTicketType> {
  const response = await apiClient.post(
    `/ticketing/matches/${encodeURIComponent(String(matchId))}/ticket-types/`,
    {
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      price: String(input.price),
      currency: (input.currency ?? 'UGX').toUpperCase(),
      quantity_available: input.quantity_available,
      sale_start_at: input.sale_start_at ?? null,
      sale_end_at: input.sale_end_at ?? null,
      status: input.status ?? 'ACTIVE',
    },
  );
  return mapTicketType(response.data as AdminTicketTypeApi);
}

export async function updateTicketType(
  ticketTypeId: number,
  input: Partial<CreateTicketTypeInput>,
): Promise<AdminTicketType> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.description !== undefined) body.description = input.description.trim();
  if (input.price !== undefined) body.price = String(input.price);
  if (input.currency !== undefined) body.currency = input.currency.toUpperCase();
  if (input.quantity_available !== undefined) body.quantity_available = input.quantity_available;
  if (input.sale_start_at !== undefined) body.sale_start_at = input.sale_start_at;
  if (input.sale_end_at !== undefined) body.sale_end_at = input.sale_end_at;
  if (input.status !== undefined) body.status = input.status;

  const response = await apiClient.patch(
    `/ticketing/ticket-types/${encodeURIComponent(String(ticketTypeId))}/`,
    body,
  );
  return mapTicketType(response.data as AdminTicketTypeApi);
}

export async function deleteTicketType(ticketTypeId: number): Promise<void> {
  await apiClient.delete(
    `/ticketing/ticket-types/${encodeURIComponent(String(ticketTypeId))}/`,
  );
}

/** Fetch all ticket orders for a specific match (club admin view) */
export interface MatchTicketOrderApi {
  id: number;
  fan_email: string;
  total_amount: string;
  currency: string;
  status: string;
  tickets_count: number;
  created_at: string;
}

export interface MatchTicketOrder {
  id: number;
  fanEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  ticketsCount: number;
  createdAt: string;
}

export async function fetchMatchTicketOrders(
  matchId: string | number,
): Promise<MatchTicketOrder[]> {
  const response = await apiClient.get(
    `/ticketing/matches/${encodeURIComponent(String(matchId))}/orders/`,
  );
  const items = normalizeApiList<MatchTicketOrderApi>(response.data);
  return items.map((o) => ({
    id: o.id,
    fanEmail: o.fan_email,
    totalAmount: Number(o.total_amount),
    currency: o.currency,
    status: o.status,
    ticketsCount: o.tickets_count,
    createdAt: o.created_at,
  }));
}
