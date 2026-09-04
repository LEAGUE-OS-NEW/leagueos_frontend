import apiClient from './apiClient.ts';
import { normalizeApiList } from './apiUtils.ts';

export type ApiPlayerStatus = 'FIT' | 'INJURED' | 'SUSPENDED';

export interface ClubPlayer {
  id: string;
  club: string;
  name: string;
  position: string;
  nationality: string;
  status: ApiPlayerStatus;
  contract_end: string;
  market_value: string;
  jersey_number?: number | null;
  photo?: string | null;
}

export interface SavePlayerInput {
  name: string;
  position: string;
  nationality: string;
  status: ApiPlayerStatus;
  contract_end: string;
  market_value: string;
  jersey_number?: number;
}

export async function fetchClubPlayers(clubId: string): Promise<ClubPlayer[]> {
  const response = await apiClient.get(
    `/${encodeURIComponent(clubId)}/players/`,
  );
  return normalizeApiList<ClubPlayer>(response.data);
}

export async function createClubPlayer(
  clubId: string,
  payload: SavePlayerInput,
): Promise<ClubPlayer> {
  const response = await apiClient.post(
    `/${encodeURIComponent(clubId)}/players/`,
    payload,
  );
  return response.data as ClubPlayer;
}

export async function updateClubPlayer(
  clubId: string,
  playerId: string,
  payload: Partial<SavePlayerInput>,
): Promise<ClubPlayer> {
  const response = await apiClient.patch(
    `/${encodeURIComponent(clubId)}/players/${encodeURIComponent(playerId)}/`,
    payload,
  );
  return response.data as ClubPlayer;
}

export async function deleteClubPlayer(
  clubId: string,
  playerId: string,
): Promise<void> {
  await apiClient.delete(
    `/${encodeURIComponent(clubId)}/players/${encodeURIComponent(playerId)}/`,
  );
}
