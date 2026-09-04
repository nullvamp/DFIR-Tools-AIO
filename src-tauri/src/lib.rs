mod registry;
mod launcher;
mod workspace;
mod acquisition;
mod audit;
mod installer;

use registry::ToolRegistry;
use serde::Serialize;
use std::{collections::HashMap, sync::Mutex};

#[derive(Serialize)]
struct CommandResult { ok: bool, message: String }

#[tauri::command]
fn launch_tool(tool_id: String, action: String, case_id: Option<String>, app: tauri::AppHandle, state: tauri::State<'_, Mutex<ToolRegistry>>) -> Result<CommandResult,String> {
    let registry=state.lock().map_err(|_| "Tool registry is unavailable".to_string())?;
    let tool=registry.get(&tool_id).ok_or_else(|| "Tool is not present in the trusted registry".to_string())?;
    let paths=if action=="launch" {case_id.as_deref().map(|id|workspace::launch_paths(id,tool)).transpose()?}else{None};
    let elevation=tool.requires_admin.unwrap_or(false)&&action=="launch";let result=launcher::execute(tool,&action,&app,paths.as_ref()).map(|message|CommandResult{ok:true,message}).map_err(|e|e.to_string());audit::record("tool_action",Some(&tool_id),case_id.as_deref(),result.is_ok(),elevation,result.as_ref().err().map(String::as_str));result
}

#[tauri::command]
fn check_tool_statuses(state: tauri::State<'_, Mutex<ToolRegistry>>) -> Result<HashMap<String,String>,String> {
    let registry=state.lock().map_err(|_| "Tool registry is unavailable".to_string())?;
    Ok(registry.statuses())
}

#[tauri::command]
fn tool_install_mode(tool_id:String)->String{installer::mode(&tool_id).into()}
#[tauri::command]
fn install_tool(tool_id:String)->Result<installer::InstallResult,String>{let result=installer::install(&tool_id);audit::record("install_tool",Some(&tool_id),None,result.is_ok(),false,result.as_ref().err().map(String::as_str));result}
#[tauri::command]
fn remove_tool(tool_id:String)->Result<installer::InstallResult,String>{let result=installer::remove(&tool_id);audit::record("remove_tool",Some(&tool_id),None,result.is_ok(),false,result.as_ref().err().map(String::as_str));result}
#[tauri::command]
fn open_tool_download_page(tool_id:String,app:tauri::AppHandle)->Result<CommandResult,String>{let url=installer::official_page(&tool_id).ok_or("No approved download page is registered for this tool")?;use tauri_plugin_opener::OpenerExt;app.opener().open_url(url,None::<&str>).map_err(|_|"Could not open the official download page".to_string())?;Ok(CommandResult{ok:true,message:"Opened the official tool page".into()})}

#[tauri::command]
fn create_workspace(case_id:String,title:String)->Result<workspace::Workspace,String>{let result=workspace::create(&case_id,&title);audit::record("create_case",None,Some(&case_id),result.is_ok(),false,result.as_ref().err().map(String::as_str));result}

#[tauri::command]
fn start_memory_acquisition(case_id:String,state:tauri::State<'_,Mutex<ToolRegistry>>)->Result<acquisition::AcquisitionStart,String>{let registry=state.lock().map_err(|_|"Tool registry is unavailable".to_string())?;let tool=registry.get("winpmem").ok_or_else(||"WinPmem is not present in the trusted registry".to_string())?;let result=acquisition::start_memory(&case_id,tool);audit::record("memory_acquisition_request",Some("winpmem"),Some(&case_id),result.is_ok(),true,result.as_ref().err().map(String::as_str));result}
#[tauri::command]
fn get_workspace_stats(case_id:String)->Result<workspace::WorkspaceStats,String>{workspace::stats(&case_id)}
#[tauri::command]
fn delete_workspace(case_id:String,confirmation:String)->Result<CommandResult,String>{let result=workspace::delete(&case_id,&confirmation).map(|message|CommandResult{ok:true,message});audit::record("delete_case",None,Some(&case_id),result.is_ok(),false,result.as_ref().err().map(String::as_str));result}
#[tauri::command]
fn open_workspace_folder(case_id:String,app:tauri::AppHandle)->Result<CommandResult,String>{let root=workspace::open_path(&case_id)?;use tauri_plugin_opener::OpenerExt;app.opener().open_path(root.to_string_lossy(),None::<&str>).map_err(|_|"Could not open the case folder".to_string())?;Ok(CommandResult{ok:true,message:"Opened workspace folder".into()})}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let registry=ToolRegistry::load().expect("trusted tool registry must be valid");
    tauri::Builder::default().plugin(tauri_plugin_opener::init()).manage(Mutex::new(registry))
      .invoke_handler(tauri::generate_handler![launch_tool,check_tool_statuses,tool_install_mode,install_tool,remove_tool,open_tool_download_page,create_workspace,start_memory_acquisition,get_workspace_stats,delete_workspace,open_workspace_folder])
      .run(tauri::generate_context!()).expect("error while running DFIR Tools AIO");
}
pub fn run_memory_helper(case_id:&str)->Result<(),String>{let result=acquisition::run_helper(case_id);audit::record("memory_acquisition",Some("winpmem"),Some(case_id),result.is_ok(),true,result.as_ref().err().map(String::as_str));result}
