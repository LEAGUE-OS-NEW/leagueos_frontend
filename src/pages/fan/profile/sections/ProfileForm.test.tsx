import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('displays persisted profile fields when the complete profile arrives', async () => {
    const { rerender } = render(
      <ProfileForm
        isLoading
        profile={null}
      />,
    );

    rerender(
      <ProfileForm
        isLoading={false}
        profile={{
          first_name: 'Fan',
          last_name: 'Alpha',
          email: 'fan@example.com',
          date_of_birth: '1996-10-05',
          city: 'Kampala',
          biography: 'Football supporter',
          avatar_url: 'https://cdn.leagueos.test/fan.jpg',
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Date of birth')).toHaveValue('1996-10-05');
      expect(screen.getByLabelText('Location')).toHaveValue('Kampala');
      expect(screen.getByLabelText('Bio')).toHaveValue('Football supporter');
      expect(screen.getByAltText('Your avatar')).toHaveAttribute(
        'src',
        'https://cdn.leagueos.test/fan.jpg',
      );
    });
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

  it('falls back to the freshly cropped image when the persisted avatar URL fails to load', async () => {
    const user = userEvent.setup();
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce('blob:selected-avatar')
      .mockReturnValueOnce('blob:cropped-avatar');

    vi.mocked(uploadAvatar).mockResolvedValue({
      data: {
        avatar_url: 'https://cdn.leagueos.test/missing-avatar.jpg',
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

    const avatar = await screen.findByAltText('Your avatar');
    expect(avatar).toHaveAttribute(
      'src',
      'https://cdn.leagueos.test/missing-avatar.jpg?v=2026-09-14T00%3A00%3A00Z',
    );

    fireEvent.error(avatar);

    expect(screen.getByAltText('Your avatar')).toHaveAttribute('src', 'blob:cropped-avatar');
  });
});
