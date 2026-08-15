import apiClient from './apiClient.js';

export type TicketStatus =
  | 'ISSUED'
  | 'USED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED'
  | string;

export interface TicketApi {
  id: number;
  ticket_code: string;
  qr_payload: string;
  qr_image_url?: string;
  order: number;
  ticket_type: number;
  ticket_type_name: string;
  match_id: number;
  match_label: string;
  match_date?: string | null;
  venue?: string;
  competition_name?: string;
  home_club_name?: string;
  away_club_name?: string;
  home_club_logo_url?: string;
  away_club_logo_url?: string;
  owner: number;
  status: TicketStatus;
  issued_at?: string | null;
  used_at?: string | null;
  checked_in_by?: number | null;
}

interface MyTicketsResponse {
  tickets?: TicketApi[];
  results?: TicketApi[];
  count?: number;
}

export async function getMyTickets(): Promise<TicketApi[]> {
  const response = await apiClient.get<MyTicketsResponse>('/ticketing/tickets/me/');
  return response.data.tickets ?? response.data.results ?? [];
}

export async function getTicketById(ticketId: string | number): Promise<TicketApi | null> {
  const tickets = await getMyTickets();
  return tickets.find((ticket) => String(ticket.id) === String(ticketId)) ?? null;
}

export async function fetchTicketQrObjectUrl(ticketId: string | number): Promise<string> {
  const response = await apiClient.get<Blob>(`/ticketing/tickets/${ticketId}/qr/`, {
    responseType: 'blob',
    headers: {
      Accept: 'image/svg+xml',
    },
  });

  return URL.createObjectURL(response.data);
}
