import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileForm from './ProfileForm';
import { fetchGenders, uploadAvatar } from '../../../../services/authServices';

vi.mock('../../../../services/authServices', () => ({
  fetchGenders: vi.fn(),
  removeAvatar: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}));

vi.mock('./AvatarCropModal', () => ({
  default: ({ onConfirm }: { onConfirm: (blob: Blob) => void }) => (
    <button
      type="button"
      onClick={() => onConfirm(new Blob(['avatar'], { type: 'image/jpeg' }))}
    >
      Save cropped photo
    </button>
  ),
}));

describe('ProfileForm avatar updates', () => {
  beforeEach(() => {
    vi.mocked(fetchGenders).mockResolvedValue({ data: [] } as never);
    vi.mocked(uploadAvatar).mockReset();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('shows the persisted avatar URL returned by the backend after upload', async () => {
    const user = userEvent.setup();

    vi.mocked(uploadAvatar).mockResolvedValue({
      data: {
        avatar_url: 'https://cdn.leagueos.test/avatar.jpg',
        updated_at: '2026-09-14T00:00:00Z',
      },
    } as never);

    render(
      <ProfileForm
        isLoading={false}
        profile={{
          first_name: 'Amina',
          last_name: 'Okello',
          email: 'amina@example.com',
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /change photo/i }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    await user.upload(
      input as HTMLInputElement,
      new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: /save cropped photo/i }));

    expect(await screen.findByText('Your photo has been updated.')).toBeInTheDocument();
    expect(screen.getByAltText('Your avatar')).toHaveAttribute(
      'src',
      'https://cdn.leagueos.test/avatar.jpg?v=2026-09-14T00%3A00%3A00Z',
    );
  });

  it('resolves relative avatar upload URLs against the backend origin', async () => {
    const user = userEvent.setup();

    vi.mocked(uploadAvatar).mockResolvedValue({
      data: {
        avatar_url: '/media/avatars/fan/avatar.jpg',
        updated_at: '2026-09-14T00:00:00Z',
      },
    } as never);

    render(
      <ProfileForm
        isLoading={false}
        profile={{
          first_name: 'Amina',
          last_name: 'Okello',
          email: 'amina@example.com',
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /change photo/i }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    await user.upload(
      input as HTMLInputElement,
      new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: /save cropped photo/i }));

    expect(await screen.findByText('Your photo has been updated.')).toBeInTheDocument();
    expect(screen.getByAltText('Your avatar')).toHaveAttribute(
      'src',
      'http://localhost:8000/media/avatars/fan/avatar.jpg?v=2026-09-14T00%3A00%3A00Z',
    );
  });
});
