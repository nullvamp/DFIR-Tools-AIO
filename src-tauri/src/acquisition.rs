use crate::{launcher,registry::{Tool,ToolRegistry},workspace};
use serde::Serialize;
use sha2::{Digest,Sha256};
use std::{fs::{self,File},io::{Read,Write},process::{Command,Stdio},time::{SystemTime,UNIX_EPOCH}};

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct AcquisitionStart{pub evidence_directory:String,pub image_path:String,pub message:String}

pub fn start_memory(case_id:&str,tool:&Tool)->Result<AcquisitionStart,String>{
 if tool.id!="winpmem"{return Err("Only WinPmem can perform memory acquisition".into())}workspace::resolve_case(case_id)?;launcher::trusted_executable(tool)?;launcher::elevate_memory_helper(case_id)?;
 let evidence=workspace::resolve_case(case_id)?.join("EVIDENCE").join("Memory");
 Ok(AcquisitionStart{evidence_directory:evidence.to_string_lossy().into_owned(),image_path:"Created by the elevated acquisition process".into(),message:"Administrator approval requested. Memory capture will run as a restricted application operation.".into()})
}

pub fn run_helper(case_id:&str)->Result<(),String>{
 workspace::validate_case_id(case_id)?;let root=workspace::resolve_case(case_id)?;let registry=ToolRegistry::load()?;let tool=registry.get("winpmem").ok_or("WinPmem is not registered")?;let executable=launcher::trusted_executable(tool)?;
 let stamp=timestamp()?;let evidence_dir=root.join("EVIDENCE").join("Memory").join(format!("acquisition-{stamp}"));let output_dir=root.join("OUTPUT").join("WinPmem").join(format!("acquisition-{stamp}"));
 fs::create_dir_all(&evidence_dir).map_err(|_|"Could not create the memory evidence directory")?;fs::create_dir_all(&output_dir).map_err(|_|"Could not create the acquisition log directory")?;
 let image=evidence_dir.join(format!("memory-{stamp}.raw"));let metadata=evidence_dir.join("acquisition.json");let hash_file=evidence_dir.join("SHA256.txt");let log_path=output_dir.join("acquisition.log");let mut log=File::create(&log_path).map_err(|_|"Could not create the acquisition log")?;
 writeln!(log,"Starting WinPmem acquisition for case {case_id}").ok();writeln!(log,"Destination: {}",image.display()).ok();let started=timestamp()?;
 let stdout=log.try_clone().map_err(|_|"Could not prepare the acquisition log")?;let stderr=log.try_clone().map_err(|_|"Could not prepare the acquisition log")?;
 let status=Command::new(&executable).arg(&image).stdin(Stdio::null()).stdout(Stdio::from(stdout)).stderr(Stdio::from(stderr)).status().map_err(|_|"Could not start WinPmem")?;
 if !status.success()||!image.is_file(){write_failure(&metadata,case_id,&image,&started,"WinPmem did not complete successfully")?;return Err("WinPmem did not complete successfully".into())}
 let digest=sha256(&image)?;fs::write(&hash_file,format!("{digest}  {}\r\n",image.file_name().and_then(|v|v.to_str()).unwrap_or("memory.raw"))).map_err(|_|"Could not write the evidence hash")?;
 let size=fs::metadata(&image).map_err(|_|"Could not inspect the memory image")?.len();let completed=timestamp()?;let examiner=format!("{}\\{}",std::env::var("USERDOMAIN").unwrap_or_default(),std::env::var("USERNAME").unwrap_or_default());let hostname=std::env::var("COMPUTERNAME").unwrap_or_default();
 let record=serde_json::json!({"schemaVersion":1,"caseId":case_id,"evidenceType":"physical-memory","tool":"WinPmem","imagePath":image,"sha256":digest,"sizeBytes":size,"examiner":examiner,"hostname":hostname,"startedAtUtc":started,"completedAtUtc":completed,"status":"completed"});write_json(&metadata,&record)?;writeln!(log,"Acquisition complete. SHA-256: {digest}").ok();Ok(())
}
fn sha256(path:&std::path::Path)->Result<String,String>{let mut file=File::open(path).map_err(|_|"Could not open the memory image for hashing")?;let mut hasher=Sha256::new();let mut buffer=vec![0u8;1024*1024];loop{let count=file.read(&mut buffer).map_err(|_|"Could not read the memory image for hashing")?;if count==0{break}hasher.update(&buffer[..count])}Ok(format!("{:x}",hasher.finalize()))}
fn write_failure(path:&std::path::Path,case_id:&str,image:&std::path::Path,started:&str,error:&str)->Result<(),String>{let record=serde_json::json!({"schemaVersion":1,"caseId":case_id,"evidenceType":"physical-memory","tool":"WinPmem","imagePath":image,"startedAtUtc":started,"failedAtUtc":timestamp()?,"status":"failed","error":error});write_json(path,&record)}
fn write_json(path:&std::path::Path,value:&serde_json::Value)->Result<(),String>{fs::write(path,serde_json::to_vec_pretty(value).map_err(|_|"Could not prepare acquisition metadata".to_string())?).map_err(|_|"Could not write acquisition metadata".to_string())}
fn timestamp()->Result<String,String>{SystemTime::now().duration_since(UNIX_EPOCH).map(|v|v.as_secs().to_string()).map_err(|_|"System clock is invalid".into())}
