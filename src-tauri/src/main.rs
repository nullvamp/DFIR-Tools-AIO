#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]
fn main(){let args:Vec<String>=std::env::args().collect();if args.get(1).is_some_and(|v|v=="--memory-acquisition-helper"){let code=match args.get(2){Some(case_id)=>dfir_operations_console_lib::run_memory_helper(case_id).map(|_|0).unwrap_or(1),None=>1};std::process::exit(code)}dfir_operations_console_lib::run()}
