export type ToolType='application'|'portable'|'cli'|'python'|'powershell'|'bash'|'docker'|'web'|'vm'|'script'|'folder';
export type ToolStatus='ready'|'missing'|'running'|'offline'|'unknown'|'update';
export interface Tool { id:string; name:string; description:string; category:string; subcategory?:string; type:ToolType; executable?:string; arguments?:string[]; working_directory?:string; url?:string; cli_command?:string; vm_name?:string; docker_service?:string; requires_admin?:boolean; installed_check?:string; version_command?:string[]; version?:string; documentation?:string; tags?:string[]; capabilities?:string[]; favorite?:boolean; enabled?:boolean; status?:ToolStatus; }
export interface Activity { id:string; toolId:string; toolName:string; timestamp:string; caseId:string; launchType:string; }
export interface Workspace { caseId:string; title:string; root:string; createdAt:string; }
export interface WorkspaceStats { evidenceItems:number; evidenceBytes:number; outputItems:number; outputBytes:number; lastActivity?:string; }
