import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { getFinancePage, type FinancePage, type FinanceResource } from './FinanceService';
import './FinanceAdmin.css';

const queues: Array<{ key: FinanceResource; label: string }> = [
  { key:'deposits', label:'Deposits' }, { key:'wallet_transactions', label:'Wallet Transactions' },
  { key:'settlements', label:'Settlements' }, { key:'refunds', label:'Void Refunds' },
  { key:'settlement_participants', label:'Settlement Participants' },
  { key:'withdrawals', label:'Withdrawals' }, { key:'club_commerce', label:'Club Commerce' },
  { key:'reconciliation_exceptions', label:'Reconciliation Exceptions' },
];
const text = (value: unknown) => value == null || value === '' ? '—' : String(value);

export default function FinanceAdminDashboard() {
  const [resource,setResource] = useState<FinanceResource>('deposits');
  const [page,setPage] = useState(1); const [search,setSearch] = useState('');
  const [status,setStatus] = useState(''); const [dateFrom,setDateFrom] = useState(''); const [dateTo,setDateTo] = useState('');
  const [data,setData] = useState<FinancePage|null>(null); const [error,setError] = useState('');
  useEffect(() => { let active=true;
    getFinancePage({resource,page,page_size:25,search,status,date_from:dateFrom,date_to:dateTo})
      .then((value) => { if (active) { setData(value); setError(''); } }).catch((reason:unknown) => active && setError(reason instanceof Error ? reason.message : 'Could not load finance data.'));
    return () => { active=false; };
  },[resource,page,search,status,dateFrom,dateTo]);
  const changeQueue=(value:FinanceResource)=>{setResource(value);setPage(1);setStatus('');};
  return <AdminLayout><main className="finance-admin-dashboard">
    <header className="fa-header"><div><h1>Finance</h1><p>Ledger-backed, read-only financial reporting. Operational controls are unavailable unless backed by a canonical workflow.</p></div></header>
    {data && <section className="fa-summary-grid">
      <article className="fa-summary-card"><b>{data.overview.deposit_count}</b><span>Deposits · {data.overview.deposit_total}</span></article>
      <article className="fa-summary-card"><b>{data.overview.settlement_count}</b><span>Settlements · {data.overview.settlement_gross_total}</span></article>
      <article className="fa-summary-card"><b>{data.overview.refund_count}</b><span>Completed void refunds · {data.overview.refund_total}</span></article>
      <article className="fa-summary-card"><b>{data.overview.reconciliation_exception_count}</b><span>Reconciliation exceptions</span></article>
    </section>}
    <nav className="fa-tabs" aria-label="Finance reports">{queues.map((queue)=><button key={queue.key} className={resource===queue.key?'fa-tab fa-tab--active':'fa-tab'} onClick={()=>changeQueue(queue.key)}>{queue.label}</button>)}</nav>
    <section className="fa-filters"><input aria-label="Search finance" placeholder="User, reference, provider or market" value={search} onChange={(e)=>{setSearch(e.target.value);setPage(1);}}/><input aria-label="Date from" type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)}/><input aria-label="Date to" type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)}/><input aria-label="Status" placeholder="Status" value={status} onChange={(e)=>{setStatus(e.target.value);setPage(1);}}/></section>
    {resource==='refunds' && <p className="fa-notice">Market void refunds shown here are completed ledger records and are read-only; there is no refund-request approval workflow.</p>}
    {resource==='reconciliation_exceptions' && <p className="fa-notice">Assignment, escalation, and resolution are read-only until a persisted reconciliation case workflow exists.</p>}
    {error ? <div role="alert" className="fa-error">{error}</div> : !data ? <p>Loading finance data…</p> : data.results.length===0 ? <p className="fa-empty">No records match these filters.</p> : <div className="fa-table-wrap"><table className="fa-table"><thead><tr><th>ID</th><th>User / Market / Club</th><th>Amount</th><th>Reference</th><th>Status</th><th>Date</th></tr></thead><tbody>{data.results.map((row)=><tr key={text(row.id)}><td className="fa-mono">{text(row.id)}</td><td>{text(row.fan ?? row.market ?? row.club ?? row.code)}</td><td>{text(row.amount ?? row.net ?? row.gross_payout ?? row.total_amount)}</td><td className="fa-mono">{text(row.internal_reference ?? row.reference ?? row.ledger_reference ?? row.payment_reference ?? row.source_id)}</td><td>{text(row.status ?? 'COMPLETED')}</td><td>{text(row.created_at ?? row.settled_at ?? row.detected_at)}</td></tr>)}</tbody></table></div>}
    {data && <footer className="fa-pagination"><button disabled={page<=1} onClick={()=>setPage((v)=>v-1)}>Previous</button><span>Page {data.page} of {data.total_pages} ({data.count} records)</span><button disabled={page>=data.total_pages} onClick={()=>setPage((v)=>v+1)}>Next</button></footer>}
  </main></AdminLayout>;
}
