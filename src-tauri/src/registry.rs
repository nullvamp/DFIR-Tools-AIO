use serde::Deserialize;
use std::{collections::HashMap,path::Path};
pub const TOOLS_ROOT:&str=r"C:\DFIR\Tools";

#[derive(Clone,Deserialize)]
pub struct Tool { pub id:String, pub name:String, pub r#type:String, pub executable:Option<String>, pub url:Option<String>, pub enabled:Option<bool>, pub requires_admin:Option<bool>, pub arguments:Option<Vec<String>> }
#[derive(Deserialize)] struct RegistryFile { tools:Vec<Tool> }
pub struct ToolRegistry { tools:HashMap<String,Tool> }
impl ToolRegistry {
 pub fn load()->Result<Self,String>{let parsed:RegistryFile=serde_yaml::from_str(include_str!("../../config/tools.yaml")).map_err(|e|e.to_string())?;let mut tools=HashMap::new();for t in parsed.tools {if !valid_id(&t.id)||tools.contains_key(&t.id){return Err(format!("Invalid or duplicate tool id: {}",t.id))}tools.insert(t.id.clone(),t);}Ok(Self{tools})}
 pub fn get(&self,id:&str)->Option<&Tool>{self.tools.get(id).filter(|t|t.enabled.unwrap_or(true))}
 pub fn statuses(&self)->HashMap<String,String>{self.tools.iter().map(|(id,t)|{let s=t.executable.as_ref().map(|p|if Path::new(&expand(p)).is_file(){"ready"}else{"missing"}).unwrap_or("unknown");(id.clone(),s.into())}).collect()}
}
pub fn expand(value:&str)->String{value.replace("${DFIR_ROOT}",r"C:\DFIR").replace("${DFIR_TOOLS}",TOOLS_ROOT).replace("${DFIR_SCRIPTS}",r"C:\DFIR\Scripts").replace("${DFIR_CASES}",r"C:\DFIR\Cases").replace("${LOCALAPPDATA}","")}
fn valid_id(id:&str)->bool{!id.is_empty()&&id.len()<80&&id.chars().all(|c|c.is_ascii_lowercase()||c.is_ascii_digit()||c=='-')}
