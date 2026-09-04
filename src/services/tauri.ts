import { invoke } from '@tauri-apps/api/core';
import type { Tool,Workspace,WorkspaceStats } from '../types/tool';

export const isTauri=()=>Boolean((window as unknown as Record<string,unknown>).__TAURI_INTERNALS__);
export async function launchTool(tool:Tool,action='launch',caseId?:string){
 if(!isTauri()) return {ok:true,message:`Preview: ${action} requested for ${tool.name}`};
 return invoke<{ok:boolean;message:string}>('launch_tool',{toolId:tool.id,action,caseId:caseId||null});
}
export async function checkStatuses(){
 if(!isTauri()) return {} as Record<string,string>;
 return invoke<Record<string,string>>('check_tool_statuses');
}
export async function installTool(toolId:string){if(!isTauri())return {message:`Preview install ${toolId}`,status:'ready'};return invoke<{message:string;status:string}>('install_tool',{toolId})}
export async function removeTool(toolId:string){if(!isTauri())return {message:`Preview remove ${toolId}`,status:'missing'};return invoke<{message:string;status:string}>('remove_tool',{toolId})}
export async function openToolDownloadPage(toolId:string){if(!isTauri())return {ok:true,message:'Preview official page'};return invoke<{ok:boolean;message:string}>('open_tool_download_page',{toolId})}
export async function createWorkspace(caseId:string,title:string):Promise<Workspace>{
 if(!isTauri()) return {caseId,title,root:`C:\\DFIR\\Cases\\${caseId}`,createdAt:new Date().toISOString()};
 return invoke<Workspace>('create_workspace',{caseId,title});
}
export async function startMemoryAcquisition(caseId:string):Promise<{evidenceDirectory:string;imagePath:string;message:string}>{
 if(!isTauri()) return {evidenceDirectory:`C:\\DFIR\\Cases\\${caseId}\\EVIDENCE\\Memory`,imagePath:'memory.raw',message:'Preview acquisition requested'};
 return invoke('start_memory_acquisition',{caseId});
}
export async function getWorkspaceStats(caseId:string):Promise<WorkspaceStats>{
 if(!isTauri()) return {evidenceItems:0,evidenceBytes:0,outputItems:0,outputBytes:0};
 return invoke('get_workspace_stats',{caseId});
}
export async function deleteWorkspace(caseId:string,confirmation:string){if(!isTauri())return {ok:true,message:'Preview deletion'};return invoke<{ok:boolean;message:string}>('delete_workspace',{caseId,confirmation})}
export async function openWorkspaceFolder(caseId:string){if(!isTauri())return {ok:true,message:'Preview open workspace'};return invoke<{ok:boolean;message:string}>('open_workspace_folder',{caseId})}
