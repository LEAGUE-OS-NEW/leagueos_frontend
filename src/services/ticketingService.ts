import apiClient from './apiClient.js';
import { normalizeApiList } from './apiUtils';

export type TicketStatus =
  | 'PENDING'
  | 'PAID'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'REFUNDED'
  | string;

export interface TicketApi {
  id: string;
  ticket_code: string;
  ticket_type_name: string;
  match_label: string;
  match_date?: string | null;
  venue?: string;
  competition_name?: string;
  quantity: number;
  status: TicketStatus;
  created_at: string;
}

export async function getMyTickets(): Promise<TicketApi[]> {
  const response = await apiClient.get('/ticketing/tickets/me/');
  return normalizeApiList<TicketApi>(response.data);
}

export async function getTicketById(ticketId: string | number): Promise<TicketApi | null> {
  const tickets = await getMyTickets();
  return tickets.find((ticket) => String(ticket.id) === String(ticketId)) ?? null;
}
