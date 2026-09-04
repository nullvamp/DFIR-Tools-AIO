import { useState } from 'react';
import { FolderPlus,ShieldCheck,X } from 'lucide-react';
import type { Workspace } from '../../types/tool';
import { createWorkspace } from '../../services/tauri';

export function CreateWorkspaceDialog({close,created}:{close:()=>void;created:(workspace:Workspace)=>void}){
 const parent='C:\\DFIR\\Cases';
 const defaultPrefix=()=>{try{return JSON.parse(localStorage.getItem('dfir:console-settings:v1')||'{}').casePrefix||'INC'}catch{return'INC'}};
 const now=new Date();const stamp=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
 const[caseId,setCaseId]=useState(`${defaultPrefix()}-${stamp}-`);const[title,setTitle]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{created(await createWorkspace(caseId.trim(),title.trim()))}catch(err){setError(String(err))}finally{setBusy(false)}}
 return <div className="modal-wrap" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal" onSubmit={submit}>
  <header><div><span className="overline">INVESTIGATION WORKSPACE</span><h2>Create a new case</h2></div><button type="button" onClick={close}><X size={18}/></button></header>
  <p>Creates a case folder with separate evidence and tool-output directories.</p>
  <label>Case ID<input autoFocus required pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}" value={caseId} onChange={e=>setCaseId(e.target.value)} placeholder="INC-2026-001"/><small>Letters, numbers, periods, underscores, and hyphens only.</small></label>
  <label>Case title<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Suspected endpoint compromise"/></label>
  <label>Cases directory<input className="mono" value={parent} readOnly/></label>
  <div className="folder-preview"><FolderPlus size={18}/><div><span>FOLDERS TO CREATE</span><code>{parent}\\{caseId}\\EVIDENCE</code><code>{parent}\\{caseId}\\OUTPUT</code></div></div>
  {error&&<div className="form-error">{error}</div>}<footer><button type="button" className="btn btn-ghost" onClick={close}>Cancel</button><button className="btn btn-primary" disabled={busy||!caseId||!title}><ShieldCheck size={14}/>{busy?'Creating…':'Create Workspace'}</button></footer>
 </form></div>
}
