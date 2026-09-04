import type { ToolStatus } from '../../types/tool';
export function StatusBadge({status='unknown'}:{status?:ToolStatus}){
  const labels={ready:'Ready',missing:'Missing',running:'Running',offline:'Offline',unknown:'Unknown',update:'Update'};
  return <span className={`status status-${status}`}><i/>{labels[status]}</span>;
}
