import type { LucideIcon } from 'lucide-react';
export function MetricCard({label,value,note,icon:Icon,tone='accent'}:{label:string;value:string|number;note:string;icon:LucideIcon;tone?:string}){return <article className={`metric metric-${tone}`}><div className="metric-head"><span>{label}</span><Icon size={16}/></div><strong>{value}</strong><small>{note}</small></article>}
