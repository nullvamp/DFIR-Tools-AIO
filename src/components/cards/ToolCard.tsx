import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FolderOpen, Heart, Info, MoreVertical, Play, ShieldAlert, Trash2, X } from 'lucide-react';
import type { Tool } from '../../types/tool';
import { StatusBadge } from '../common/StatusBadge';
import { ToolIcon } from '../common/ToolIcon';

export function ToolCard({tool,favorite,onFavorite,onAction,onDetails,installMode,onManage}:{tool:Tool;favorite:boolean;onFavorite:()=>void;onAction:(action:string)=>void;onDetails:()=>void;installMode:'automatic'|'manual';onManage:(action:'download'|'remove'|'verify')=>void}){
  const [guideOpen,setGuideOpen]=useState(false);
  const [acknowledged,setAcknowledged]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const menuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!menuOpen)return;
    const closeOutside=(event:PointerEvent)=>{if(!menuRef.current?.contains(event.target as Node))setMenuOpen(false)};
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenuOpen(false)};
    document.addEventListener('pointerdown',closeOutside);
    document.addEventListener('keydown',closeOnEscape);
    return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',closeOnEscape)};
  },[menuOpen]);
  const acquisition=tool.id==='winpmem';
  const main=acquisition?'Capture':tool.type==='web'?'Open':tool.type==='vm'?'Start':tool.type==='cli'||tool.type==='python'||tool.type==='bash'?'CLI':'Launch';
  const capture=()=>{if(acknowledged)onAction('acquire-memory')};

  return <>
    <article className="tool-row">
      <div className="tool-identity">
        <div className="tool-icon"><ToolIcon tool={tool}/></div>
        <div className="tool-title">
          <div className="tool-name-line">
            <h3>{tool.name}</h3>
            <span>{tool.type.toUpperCase()}</span>
          </div>
          <p>{tool.description}</p>
        </div>
      </div>

      <div className="tool-status-cell"><StatusBadge status={tool.status}/></div>
      <code className="tool-version">{tool.version?`v${tool.version}`:'—'}</code>
      <span className={`tool-access ${tool.requires_admin?'requires-admin':''}`}>
        {tool.requires_admin&&<ShieldAlert size={12}/>} {tool.requires_admin?'Admin':'User'}
      </span>
      <span className={`tool-install ${tool.status==='ready'?'installed':installMode}`}>{tool.status==='ready'?'Installed':installMode==='automatic'?'Available':'Manual setup'}</span>
      <code className="path" title={tool.executable||tool.url||tool.vm_name}>{tool.executable||tool.url||tool.vm_name||'—'}</code>

      <div className="tool-actions">
        {acquisition&&<button className="danger-guide-icon" onClick={()=>setGuideOpen(true)} aria-label="Read memory acquisition safety guide" title="Required safety guide">!</button>}
        <div className="tool-menu-wrap" ref={menuRef}>
          <button className="btn btn-ghost tool-menu-trigger" onClick={()=>setMenuOpen(open=>!open)} aria-expanded={menuOpen} aria-label={`${tool.name} actions`} title="Tool actions"><MoreVertical size={15}/></button>
          {menuOpen&&<div className="tool-menu">
            {tool.status==='missing'&&installMode==='automatic'&&<button onClick={()=>{setMenuOpen(false);onManage('download')}}><Download size={13}/>Download</button>}
            {tool.status==='ready'&&<button onClick={()=>{setMenuOpen(false);onManage('verify')}}><CheckCircle2 size={13}/>Verify files</button>}
            <button onClick={()=>{setMenuOpen(false);onFavorite()}}><Heart size={13} fill={favorite?'currentColor':'none'}/>{favorite?'Remove favorite':'Add favorite'}</button>
            <button onClick={()=>{setMenuOpen(false);onDetails()}}><Info size={13}/>{installMode==='manual'&&tool.status==='missing'?'Manual setup':'Details'}</button>
            {tool.executable&&tool.status!=='missing'&&<button onClick={()=>{setMenuOpen(false);onAction('folder')}}><FolderOpen size={13}/>Open folder</button>}
            {tool.status==='ready'&&installMode==='automatic'&&<button className="remove" onClick={()=>{setMenuOpen(false);if(confirm(`Remove ${tool.name} from C:\\DFIR\\Tools?`))onManage('remove')}}><Trash2 size={13}/>Remove tool</button>}
          </div>}
        </div>
        <button className="btn btn-primary" disabled={tool.status==='missing'||(acquisition&&!acknowledged)} title={acquisition&&!acknowledged?'Read and confirm the safety guide first':''} onClick={()=>acquisition?capture():onAction('launch')}><Play size={13}/>{main}</button>
      </div>
    </article>

    {guideOpen&&<div className="modal-wrap memory-guide-wrap" onMouseDown={e=>{if(e.target===e.currentTarget)setGuideOpen(false)}}>
      <section className="modal memory-guide" role="dialog" aria-modal="true" aria-labelledby="memory-guide-title">
        <header><div><h2 id="memory-guide-title"><AlertTriangle size={20}/> Capture physical memory</h2><p>WinPmem will acquire RAM from this computer.</p></div><button type="button" onClick={()=>setGuideOpen(false)} aria-label="Close"><X size={18}/></button></header>
        <p className="memory-warning">The image may be as large as the installed RAM. Check that the active case drive has enough free space before starting.</p>
        <ul className="memory-checks"><li>Confirm the correct case is active.</li><li>Do not restart or use the evidence host during capture.</li><li>Leave the acquisition window open until the hash is complete.</li></ul>
        <div className="memory-destination"><span>Saved to</span><code>CASE\EVIDENCE\Memory\acquisition-&lt;timestamp&gt;\</code><small>Logs and SHA-256 records are saved under CASE\OUTPUT\WinPmem-output.</small></div>
        <label className="guide-ack"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/><span>I confirmed the case and available disk space.</span></label>
        <footer><button className="btn btn-ghost" onClick={()=>setGuideOpen(false)}>Cancel</button><button className="btn danger-action" disabled={!acknowledged} onClick={()=>setGuideOpen(false)}><ShieldAlert size={14}/> Unlock capture</button></footer>
      </section>
    </div>}
  </>;
}
