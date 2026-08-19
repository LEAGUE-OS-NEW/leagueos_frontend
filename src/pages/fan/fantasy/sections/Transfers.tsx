import { useEffect, useMemo, useState } from 'react';
import type { Competition, FantasyTeam, Player } from '../types';
import type { FantasyTransfer, FantasyTransferPreview } from '../../../../services/fantasyService';
import { fetchTransferHistory, previewFantasyTransfer } from '../../../../services/fantasyService';
import { SearchBar, Badge } from './shared';
import PlayerAvatar from './PlayerAvatar';
import { Modal } from './Modal';

interface Props { competition:Competition; team:FantasyTeam; players:Player[]; onConfirm:(outId:string,inId:string)=>Promise<void>; onBack:()=>void }

// Statuses where the backend deadline_locked() gate is active — transfers are
// rejected server-side for any of these. We mirror the same set here so the
// fan sees a clear explanation before making any API call.
const LOCKED_STATUSES = new Set(['LOCKED', 'LIVE', 'SCORING', 'FINALIZED'] as const);

function lockedMessage(status: string): string {
  switch (status) {
    case 'LOCKED':   return 'The transfer window is closed. Squads are locked until this gameweek is over.';
    case 'LIVE':     return 'Fixtures are currently in progress. Transfers are locked until the gameweek ends.';
    case 'SCORING':  return 'Scores are being calculated. Transfers will reopen for the next gameweek.';
    case 'FINALIZED': return 'This gameweek has been finalised. Transfers will reopen when the next gameweek opens.';
    default:         return 'Transfers are currently locked.';
  }
}

export default function Transfers({competition,team,players,onConfirm,onBack}:Props){
  const byId=useMemo(()=>new Map(players.map(p=>[p.id,p])),[players]);
  const [outId,setOutId]=useState<string|null>(null); const [inId,setInId]=useState<string|null>(null);
  const [search,setSearch]=useState(''); const [preview,setPreview]=useState<FantasyTransferPreview|null>(null);
  const [history,setHistory]=useState<FantasyTransfer[]>([]); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const gameweek=competition.api.current_gameweek?.id;

  // Derive the locked state directly from the current gameweek status.
  // This matches the backend deadline_locked() check: any status other than
  // DRAFT or OPEN means transfers are not permitted.
  const gwStatus=competition.api.current_gameweek?.status;
  const transfersLocked=gwStatus!=null && LOCKED_STATUSES.has(gwStatus as typeof LOCKED_STATUSES extends Set<infer S> ? S : never);

  useEffect(()=>{void fetchTransferHistory(team.id).then(setHistory).catch(()=>setHistory([]));},[team.id]);
  useEffect(()=>{if(!outId||!inId||!gameweek)return;void previewFantasyTransfer(team.id,{gameweek,player_out:outId,player_in:inId}).then(setPreview).catch(e=>setError(e instanceof Error?e.message:'Transfer preview failed.'));},[gameweek,inId,outId,team.id]);
  const out=outId?byId.get(outId):undefined;
  const market=players.filter(p=>!team.squad.some(s=>s.playerId===p.id)).filter(p=>!out||p.position===out.position).filter(p=>(p.name+' '+p.club).toLowerCase().includes(search.toLowerCase()));
  async function confirm(){if(!outId||!inId||!preview)return;setBusy(true);setError('');try{await onConfirm(outId,inId);setOutId(null);setInId(null);setPreview(null);setHistory(await fetchTransferHistory(team.id));}catch(e){setError(e instanceof Error?e.message:'Transfer failed.');}finally{setBusy(false);}}

  // Show a locked notice in place of the transfer UI when the gameweek
  // status prevents transfers. Transfer history is still shown below.
  if(transfersLocked && gwStatus){
    return <div className="transfers">
      <div className="sb-summary-bar"><div>Transfer players before <strong>{competition.deadline}</strong>.</div></div>
      <div className="transfer-locked-notice" role="status">
        <span className="transfer-locked-icon" aria-hidden="true">🔒</span>
        <p>{lockedMessage(gwStatus)}</p>
        <p className="transfer-locked-status">Gameweek status: <strong>{gwStatus}</strong></p>
      </div>
      <div className="sb-actions"><button className="btn btn-ghost" onClick={onBack}>Back to My Team</button></div>
      <section className="hub-section"><h3>Transfer history</h3>{history.length?<div className="transfer-list">{history.map(row=><div className="transfer-row" key={row.id}><strong>{byId.get(row.player_out_id??row.player_out??'')?.name??row.player_out_id} → {byId.get(row.player_in_id??row.player_in??'')?.name??row.player_in_id}</strong><span>{row.price_out}M → {row.price_in}M · {row.penalty_points} penalty points</span></div>)}</div>:<p>No transfers yet.</p>}</section>
    </div>;
  }

  return <div className="transfers">
    <div className="sb-summary-bar"><div>Transfer players before <strong>{competition.deadline}</strong>.</div><div className="sb-budget"><Badge tone="purple">{preview?.free_transfers_remaining??team.freeTransfers} free remaining</Badge><Badge tone={preview?.penalty_if_confirmed?'red':'green'}>{preview?.penalty_if_confirmed?`-${preview.penalty_if_confirmed} pts`:'No point cost'}</Badge><Badge tone="orange">Budget {Number(preview?.new_budget??team.budgetRemaining).toFixed(1)}M</Badge></div></div>
    {error&&<p className="transfer-cost-warning" role="alert">{error}</p>}
    <div className="transfers-layout"><div className="transfers-out"><h4>Your squad — select one player out</h4><div className="transfer-list">{team.squad.map(s=>{const p=byId.get(s.playerId);return p&&<div className={`transfer-row ${outId===p.id?'changed':''}`} key={p.id}><button className="transfer-player" onClick={()=>{setOutId(p.id);setInId(null)}}><PlayerAvatar player={p} size={36}/><span><strong>{p.name}</strong><em>{p.clubShort} · {p.positionLabel} · {p.price.toFixed(1)}M</em></span></button></div>})}</div><div className="sb-actions"><button className="btn btn-ghost" onClick={onBack}>Back to My Team</button></div></div>
    <div className="transfers-in"><h4>{out?`Replace ${out.name}`:'Select a player to replace'}</h4><SearchBar value={search} onChange={setSearch} placeholder="Search replacement…"/><div className="market-table"><div className="market-list">{market.map(p=><div className="market-row" key={p.id}><div className="market-player"><PlayerAvatar player={p} size={32}/><span><strong>{p.name}</strong><em>{p.clubShort}</em></span></div><span>{p.price.toFixed(1)}</span><button className="btn btn-add" disabled={!out} onClick={()=>setInId(p.id)}>+</button></div>)}</div></div></div></div>
    {preview&&outId&&inId&&<Modal title="Confirm transfer" onClose={()=>setInId(null)} footer={<><button className="btn btn-ghost" onClick={()=>setInId(null)}>Keep editing</button><button className="btn btn-primary" disabled={busy} onClick={()=>void confirm()}>{busy?'Confirming…':'Confirm transfer'}</button></>}><ul className="sb-review-list"><li><span>{byId.get(outId)?.name} → {byId.get(inId)?.name}</span><strong>{preview.price_out}M → {preview.price_in}M</strong></li><li><span>Budget before / after</span><strong>{preview.current_budget}M / {preview.new_budget}M</strong></li><li><span>Free transfers remaining</span><strong>{preview.free_transfers_remaining}</strong></li><li><span>Penalty if confirmed</span><strong>{preview.penalty_if_confirmed} points</strong></li></ul></Modal>}
    <section className="hub-section"><h3>Transfer history</h3>{history.length?<div className="transfer-list">{history.map(row=><div className="transfer-row" key={row.id}><strong>{byId.get(row.player_out_id??row.player_out??'')?.name??row.player_out_id} → {byId.get(row.player_in_id??row.player_in??'')?.name??row.player_in_id}</strong><span>{row.price_out}M → {row.price_in}M · {row.penalty_points} penalty points</span></div>)}</div>:<p>No transfers yet.</p>}</section>
  </div>;
}
