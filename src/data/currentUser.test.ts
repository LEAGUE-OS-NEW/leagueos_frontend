import { describe, expect, it } from 'vitest';
import { mapProfileToCurrentUser } from './currentUser';

describe('mapProfileToCurrentUser', () => {
  it('uses the persisted profile city as the fan location', () => {
    const currentUser = mapProfileToCurrentUser({
      id: 9,
      first_name: 'Amina',
      last_name: 'Okello',
      email: 'amina@example.com',
      city: 'Entebbe',
    });

    expect(currentUser.location).toBe('Entebbe');
  });

  it('versions avatar URLs with avatar_updated_at so saved photos refresh', () => {
    const currentUser = mapProfileToCurrentUser({
      first_name: 'Amina',
      avatar_url: 'https://cdn.leagueos.test/avatar.jpg',
      avatar_updated_at: '2026-09-14T00:00:00Z',
    });

    expect(currentUser.avatarUrl).toBe(
      'https://cdn.leagueos.test/avatar.jpg?v=2026-09-14T00%3A00%3A00Z',
    );
  });

  it('resolves API media avatar URLs against the backend origin', () => {
    const currentUser = mapProfileToCurrentUser({
      first_name: 'Amina',
      avatar_url: '/media/avatars/fan/avatar.jpg',
      avatar_updated_at: '2026-09-14T00:00:00Z',
    });

    expect(currentUser.avatarUrl).toBe(
      'http://localhost:8000/media/avatars/fan/avatar.jpg?v=2026-09-14T00%3A00%3A00Z',
    );
  });
});
