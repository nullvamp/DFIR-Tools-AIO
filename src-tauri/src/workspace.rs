use crate::registry::Tool;
use serde::{Deserialize,Serialize};
use std::{fs,path::{Path,PathBuf}};

pub const CASES_ROOT:&str=r"C:\DFIR\Cases";

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Workspace{case_id:String,title:String,root:String,created_at:String}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct WorkspaceStats{evidence_items:u64,evidence_bytes:u64,output_items:u64,output_bytes:u64,last_activity:Option<String>}
pub struct LaunchPaths{pub case:String,pub evidence:String,pub output:String}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
struct Manifest{case_id:String,title:String,created_at:String}

pub fn create(case_id:&str,title:&str)->Result<Workspace,String>{
 validate_case_id(case_id)?;if title.trim().is_empty()||title.len()>160{return Err("Case title is required and must be under 160 characters".into())}
 let parent=ensure_case_root()?;let root=parent.join(case_id);if root.exists(){return Err("A case folder with this ID already exists".into())}
 fs::create_dir(&root).map_err(|_|"Could not create the case folder")?;
 if let Err(error)=create_case_contents(&root,case_id,title){let _=fs::remove_dir_all(&root);return Err(error)}
 let created_at=timestamp();Ok(Workspace{case_id:case_id.into(),title:title.into(),root:root.to_string_lossy().into_owned(),created_at})
}
fn create_case_contents(root:&Path,case_id:&str,title:&str)->Result<(),String>{
 fs::create_dir(root.join("EVIDENCE")).map_err(|_|"Could not create the EVIDENCE folder")?;
 fs::create_dir(root.join("OUTPUT")).map_err(|_|"Could not create the OUTPUT folder")?;
 let manifest=serde_json::json!({"caseId":case_id,"title":title,"createdAt":timestamp()});
 fs::write(root.join("case.json"),serde_json::to_vec_pretty(&manifest).map_err(|_|"Could not prepare the case manifest".to_string())?).map_err(|_|"Could not write the case manifest".to_string())
}
pub fn resolve_case(case_id:&str)->Result<PathBuf,String>{
 validate_case_id(case_id)?;let parent=ensure_case_root()?;let requested=parent.join(case_id);
 let meta=fs::symlink_metadata(&requested).map_err(|_|"Case folder does not exist")?;if meta.file_type().is_symlink(){return Err("Linked case folders are not allowed".into())}
 let root=requested.canonicalize().map_err(|_|"Could not verify the case folder")?;if root.parent()!=Some(parent.as_path()){return Err("Case folder is outside the approved cases directory".into())}
 let manifest=read_manifest(&root)?;if manifest.case_id!=case_id||root.file_name().and_then(|v|v.to_str())!=Some(case_id){return Err("Case folder does not match its manifest".into())}
 for name in ["EVIDENCE","OUTPUT"]{let child=root.join(name);let child_meta=fs::symlink_metadata(&child).map_err(|_|"Case folder is incomplete")?;if child_meta.file_type().is_symlink()||!child_meta.is_dir(){return Err("Linked case directories are not allowed".into())}let canonical=child.canonicalize().map_err(|_|"Could not verify the case directory")?;if canonical.parent()!=Some(root.as_path()){return Err("Case directory escapes the approved case folder".into())}}
 Ok(root)
}
pub fn prepare_output(case_id:&str,tool:&Tool)->Result<String,String>{let root=resolve_case(case_id)?;let target=root.join("OUTPUT").join(safe_name(&tool.name));if target.exists(){let meta=fs::symlink_metadata(&target).map_err(|_|"Could not verify tool output")?;if meta.file_type().is_symlink()||!meta.is_dir(){return Err("Tool output path is not a normal directory".into())}}else{fs::create_dir(&target).map_err(|_|"Could not create the tool output folder")?}Ok(target.to_string_lossy().into_owned())}
pub fn launch_paths(case_id:&str,tool:&Tool)->Result<LaunchPaths,String>{let root=resolve_case(case_id)?;let output=prepare_output(case_id,tool)?;Ok(LaunchPaths{case:shell_path(&root),evidence:shell_path(&root.join("EVIDENCE")),output:shell_path(Path::new(&output))})}
pub fn stats(case_id:&str)->Result<WorkspaceStats,String>{let root=resolve_case(case_id)?;let(evidence_items,evidence_bytes,evidence_modified)=tree_stats(&root.join("EVIDENCE"),&root)?;let(output_items,output_bytes,output_modified)=tree_stats(&root.join("OUTPUT"),&root)?;let latest=match(evidence_modified,output_modified){(Some(a),Some(b))=>Some(a.max(b)),(Some(a),None)=>Some(a),(None,Some(b))=>Some(b),(None,None)=>None};Ok(WorkspaceStats{evidence_items,evidence_bytes,output_items,output_bytes,last_activity:latest.map(|v|v.to_string())})}
pub fn delete(case_id:&str,confirmation:&str)->Result<String,String>{validate_case_id(case_id)?;if confirmation!=case_id{return Err("Confirmation must exactly match the case ID".into())}let root=resolve_case(case_id)?;let parent=ensure_case_root()?;if root.parent()!=Some(parent.as_path())||root==parent{return Err("Refusing to delete an unsafe path".into())}let verified=resolve_case(case_id)?;fs::remove_dir_all(&verified).map_err(|_|"Could not delete the case folder")?;Ok(format!("Deleted case {case_id}"))}
pub fn open_path(case_id:&str)->Result<PathBuf,String>{resolve_case(case_id)}
fn ensure_case_root()->Result<PathBuf,String>{let configured=PathBuf::from(CASES_ROOT);fs::create_dir_all(&configured).map_err(|_|"Could not access the cases directory")?;let meta=fs::symlink_metadata(&configured).map_err(|_|"Could not verify the cases directory")?;if meta.file_type().is_symlink(){return Err("The cases directory cannot be a link".into())}configured.canonicalize().map_err(|_|"Could not verify the cases directory".into())}
fn read_manifest(root:&Path)->Result<Manifest,String>{let bytes=fs::read(root.join("case.json")).map_err(|_|"Could not read the case manifest")?;let manifest:Manifest=serde_json::from_slice(&bytes).map_err(|_|"Case manifest is invalid")?;validate_case_id(&manifest.case_id)?;if manifest.title.trim().is_empty()||manifest.created_at.is_empty(){return Err("Case manifest is incomplete".into())}Ok(manifest)}
fn tree_stats(start:&Path,case_root:&Path)->Result<(u64,u64,Option<u64>),String>{let mut files=0;let mut bytes=0;let mut latest=None;let mut pending=vec![start.to_path_buf()];while let Some(dir)=pending.pop(){for entry in fs::read_dir(&dir).map_err(|_|"Could not inspect the case directory")?{let entry=entry.map_err(|_|"Could not inspect a case item")?;let meta=fs::symlink_metadata(entry.path()).map_err(|_|"Could not inspect a case item")?;if meta.file_type().is_symlink(){continue}if meta.is_dir(){let canonical=entry.path().canonicalize().map_err(|_|"Could not verify a case directory")?;if !canonical.starts_with(case_root){return Err("A case directory points outside the case".into())}pending.push(canonical)}else if meta.is_file(){files+=1;bytes+=meta.len();if let Ok(changed)=meta.modified().and_then(|t|t.duration_since(std::time::UNIX_EPOCH).map_err(std::io::Error::other)){let value=changed.as_secs();latest=Some(latest.map_or(value,|current:u64|current.max(value)))}}}}Ok((files,bytes,latest))}
pub fn validate_case_id(id:&str)->Result<(),String>{if(3..=64).contains(&id.len())&&id.chars().all(|c|c.is_ascii_alphanumeric()||matches!(c,'.'|'_'|'-'))&&!matches!(id,"."|".."){Ok(())}else{Err("Case ID must be 3-64 letters, numbers, periods, underscores, or hyphens".into())}}
fn safe_name(name:&str)->String{let clean:String=name.chars().filter(|c|c.is_ascii_alphanumeric()||*c=='-'||*c=='_').collect::<String>().to_ascii_lowercase();let mut chars=clean.chars();match chars.next(){Some(first)=>first.to_ascii_uppercase().to_string()+chars.as_str(),None=>"Tool".into()}}
fn shell_path(path:&Path)->String{let value=path.to_string_lossy();if let Some(rest)=value.strip_prefix(r"\\?\UNC\"){format!(r"\\{rest}")}else{value.strip_prefix(r"\\?\").unwrap_or(&value).to_string()}}
fn timestamp()->String{std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d|d.as_secs().to_string()).unwrap_or_default()}

#[cfg(test)]
mod tests{use super::*;#[test]fn accepts_normal_case_ids(){assert!(validate_case_id("INC-2026-001").is_ok())}#[test]fn rejects_traversal_and_separators(){for value in ["..","../case","..\\case","C:\\DFIR","case/name"]{assert!(validate_case_id(value).is_err(),"accepted {value}")}}#[test]fn converts_verbatim_paths_for_cmd(){assert_eq!(shell_path(Path::new(r"\\?\C:\DFIR\Cases\INC-1")),r"C:\DFIR\Cases\INC-1");assert_eq!(shell_path(Path::new(r"\\?\UNC\server\share\case")),r"\\server\share\case");}}
