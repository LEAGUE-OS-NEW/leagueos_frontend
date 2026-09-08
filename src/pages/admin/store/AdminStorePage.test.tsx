import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminStorePage from './AdminStorePage';
import { fetchAdminStoreReport } from '../../../services/adminStoreService';

vi.mock('../../../components/admin/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/adminStoreService', () => ({ fetchAdminStoreReport: vi.fn(), fetchAdminStoreOrder: vi.fn() }));
const overview = { total_orders: 0, sales: '0.00', total_products: 0, payments: 0, refunds: 0, by_status: {} };

describe('AdminStorePage', () => {
  beforeEach(() => vi.mocked(fetchAdminStoreReport).mockReset().mockResolvedValue({ overview, resource: 'orders', count: 0, page: 1, page_size: 25, total_pages: 1, results: [] }));
  it('renders loading and authoritative empty state', async () => {
    render(<AdminStorePage />);
    expect(screen.getByText(/Loading Store operations/)).toBeInTheDocument();
    expect(await screen.findByText(/No orders match/)).toBeInTheDocument();
  });
  it('requests products, search filters, and next page from the server', async () => {
    vi.mocked(fetchAdminStoreReport).mockResolvedValue({ overview, resource: 'products', count: 26, page: 1, page_size: 25, total_pages: 2, results: [] });
    const user = userEvent.setup(); render(<AdminStorePage />);
    await user.click(screen.getByRole('button', { name: 'products' }));
    await user.type(screen.getByLabelText('Search Store'), 'SKU-1');
    await waitFor(() => expect(fetchAdminStoreReport).toHaveBeenLastCalledWith(expect.objectContaining({ resource: 'products', search: 'SKU-1' })));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(fetchAdminStoreReport).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
  it('renders backend errors', async () => {
    vi.mocked(fetchAdminStoreReport).mockRejectedValueOnce(new Error('Store unavailable'));
    render(<AdminStorePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Store unavailable');
  });
});
