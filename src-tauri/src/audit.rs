use std::{fs::{self,OpenOptions},io::Write,path::PathBuf,time::{SystemTime,UNIX_EPOCH}};

pub fn record(operation:&str,tool_id:Option<&str>,case_id:Option<&str>,success:bool,elevation:bool,detail:Option<&str>){
 let directory=PathBuf::from(r"C:\DFIR\Logs");if fs::create_dir_all(&directory).is_err(){return}let path=directory.join("security-audit.jsonl");let timestamp=SystemTime::now().duration_since(UNIX_EPOCH).map(|v|v.as_secs()).unwrap_or_default();let clean=|value:&str|value.chars().filter(|c|!c.is_control()).take(160).collect::<String>();
 let entry=serde_json::json!({"timestamp":timestamp,"operation":clean(operation),"toolId":tool_id.map(clean),"caseId":case_id.map(clean),"success":success,"elevationRequested":elevation,"detail":detail.map(clean)});
 if let Ok(mut file)=OpenOptions::new().create(true).append(true).open(path){let _=serde_json::to_writer(&mut file,&entry);let _=file.write_all(b"\r\n");}
}
