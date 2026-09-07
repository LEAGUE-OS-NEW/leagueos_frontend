import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FinanceAdmin from './FinanceAdmin';
import { getFinancePage } from './FinanceService';

vi.mock('../../../components/admin/AdminLayout', () => ({ default: ({children}:{children:React.ReactNode}) => <>{children}</> }));
vi.mock('./FinanceService', () => ({ getFinancePage: vi.fn() }));
const overview = { deposit_count:0,deposit_total:'0.0000',wallet_transaction_count:0,settlement_count:0,settlement_gross_total:'0.0000',refund_count:0,refund_total:'0.0000',withdrawal_count:0,withdrawal_total:'0.0000',club_commerce_count:0,club_commerce_total:'0.00',reconciliation_exception_count:0 };

describe('FinanceAdmin authoritative reporting', () => {
  beforeEach(() => vi.mocked(getFinancePage).mockReset().mockResolvedValue({overview,resource:'deposits',count:0,page:1,page_size:25,total_pages:1,results:[]}));
  it('shows loading then empty and has no fake financial action buttons', async () => {
    render(<FinanceAdmin />); expect(screen.getByText(/Loading finance data/)).toBeInTheDocument();
    expect(await screen.findByText(/No records match/)).toBeInTheDocument();
    expect(screen.queryByText(/Approve Step|Mark Resolved|Escalate|Assign analyst/i)).not.toBeInTheDocument();
  });
  it('sends server-side filters and pagination', async () => {
    vi.mocked(getFinancePage).mockResolvedValue({overview,resource:'deposits',count:30,page:1,page_size:25,total_pages:2,results:[{id:'tx-1',fan:'fan@example.com',amount:'1.0000',reference:'REF'}]});
    const user=userEvent.setup(); render(<FinanceAdmin />);
    await screen.findByText('fan@example.com'); await user.type(screen.getByLabelText('Search finance'),'REF');
    await waitFor(()=>expect(getFinancePage).toHaveBeenLastCalledWith(expect.objectContaining({search:'REF'})));
    await user.click(screen.getByRole('button',{name:'Next'}));
    await waitFor(()=>expect(getFinancePage).toHaveBeenLastCalledWith(expect.objectContaining({page:2})));
  });
  it('renders API errors', async () => {
    vi.mocked(getFinancePage).mockRejectedValueOnce(new Error('Finance unavailable')); render(<FinanceAdmin />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Finance unavailable');
  });
});
