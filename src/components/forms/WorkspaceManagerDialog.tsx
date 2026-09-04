import { useState } from 'react';
import { Check,Clock3,FolderOpen,Plus,Trash2,X } from 'lucide-react';
import type { Workspace } from '../../types/tool';
import { deleteWorkspace,openWorkspaceFolder } from '../../services/tauri';

function createdLabel(value:string){const numeric=Number(value);const date=new Date(Number.isFinite(numeric)&&numeric>0?numeric*1000:value);return Number.isNaN(date.getTime())?'Creation time unavailable':date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'medium'})}

export function WorkspaceManagerDialog({workspaces,active,close,createNew,activate,deleted,notify}:{workspaces:Workspace[];active:Workspace|null;close:()=>void;createNew:()=>void;activate:(workspace:Workspace)=>void;deleted:(workspace:Workspace)=>void;notify:(message:string)=>void}){
 const [deleting,setDeleting]=useState<Workspace|null>(null);const [confirmation,setConfirmation]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function remove(){if(!deleting)return;setBusy(true);setError('');try{const result=await deleteWorkspace(deleting.caseId,confirmation);deleted(deleting);setDeleting(null);setConfirmation('');notify(result.message)}catch(e){setError(String(e))}finally{setBusy(false)}}
 return <div className="modal-wrap" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
  <section className="modal workspace-manager">
   <header><div><span className="overline">INVESTIGATION WORKSPACES</span><h2>Manage incidents</h2></div><button onClick={close} aria-label="Close"><X size={18}/></button></header>
   <p>Switch the active investigation or manage case repositories created by this console.</p>
   <div className="workspace-list">
    {!workspaces.length&&<div className="workspace-list-empty">No case workspaces have been created yet.</div>}
    {workspaces.map(workspace=><article className={active?.root===workspace.root?'active':''} key={workspace.root}>
     <div className="workspace-info"><div><strong>{workspace.caseId}</strong>{active?.root===workspace.root&&<span className="active-pill">ACTIVE</span>}</div><b>{workspace.title}</b><span><Clock3 size={12}/>{createdLabel(workspace.createdAt)}</span><code>{workspace.root}</code></div>
     <div className="workspace-actions"><button className="btn btn-ghost" onClick={()=>openWorkspaceFolder(workspace.caseId).then(r=>notify(r.message)).catch(e=>notify(String(e)))}><FolderOpen size={14}/>Folder</button>{active?.root!==workspace.root&&<button className="btn btn-primary" onClick={()=>activate(workspace)}><Check size={14}/>Activate</button>}<button className="workspace-delete" onClick={()=>{setDeleting(workspace);setConfirmation('');setError('')}} aria-label={`Delete ${workspace.caseId}`}><Trash2 size={14}/></button></div>
    </article>)}
   </div>
   <footer><button className="btn btn-ghost" onClick={close}>Close</button><button className="btn btn-primary" onClick={createNew}><Plus size={14}/>Create New Case</button></footer>
  </section>
  {deleting&&<div className="delete-confirm"><div><span className="overline danger-text">PERMANENT DELETION</span><h3>Delete {deleting.caseId}?</h3><p>This removes the complete repository, including all evidence and tool output. This cannot be undone.</p><label>Type <code>{deleting.caseId}</code> to confirm<input autoFocus value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>{error&&<div className="form-error">{error}</div>}<footer><button className="btn btn-ghost" onClick={()=>setDeleting(null)}>Cancel</button><button className="btn danger-action" disabled={busy||confirmation!==deleting.caseId} onClick={remove}><Trash2 size={14}/>{busy?'Deleting…':'Delete Case Permanently'}</button></footer></div></div>}
 </div>
}
