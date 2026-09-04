use serde::Serialize;
use sha2::{Digest,Sha256};
use std::{fs,io::{self,Cursor,Read},path::{Path,PathBuf}};

const TOOLS_ROOT:&str=r"C:\DFIR\Tools";

struct Package{url:&'static str,sha256:&'static str,destination:&'static str}

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct InstallResult{pub message:String,pub status:String}

fn package(id:&str)->Option<Package>{match id{
 "yara-x"=>Some(Package{url:"https://github.com/VirusTotal/yara-x/releases/download/v1.20.0/yara-x-v1.20.0-x86_64-pc-windows-msvc.zip",sha256:"b1e2840bac593aea353d2b2b341f5a862c9d61c0c406d9abbbad9e1fa35163a1",destination:r"ThreatHunting\YARA-X\1.20.0"}),
 "sigcheck"=>Some(Package{url:"https://download.sysinternals.com/files/Sigcheck.zip",sha256:"e28a0ee282023abefdaa422b9529bc771c2e16d96360d109807ed4c048ddf1c1",destination:r"ThreatHunting\Sigcheck\2.91"}),
 "apt-hunter"=>Some(Package{url:"https://github.com/ahmedkhlief/APT-Hunter/releases/download/V3.3.1/APT-Hunter.zip",sha256:"c95b1246e15520903b41e9ce238a5c8c2c160b0bc8a56e0411c6677b9ae2b867",destination:r"ThreatHunting\APT-Hunter\3.3.1"}),
 _=>None}}

pub fn mode(id:&str)->&'static str{if package(id).is_some(){"automatic"}else{"manual"}}

pub fn official_page(id:&str)->Option<&'static str>{match id{
 "kape"=>Some("https://www.kroll.com/en/services/cyber/reactive-services/kroll-artifact-parser-and-extractor-kape"),"ftk-imager"=>Some("https://www.exterro.com/digital-forensics-software/ftk-imager"),
 "winpmem"=>Some("https://github.com/Velocidex/WinPmem/releases"),"hayabusa"=>Some("https://github.com/Yamato-Security/hayabusa/releases"),"chainsaw"=>Some("https://github.com/WithSecureLabs/chainsaw/releases"),
 "volatility3"=>Some("https://github.com/volatilityfoundation/volatility3"),"memprocfs"=>Some("https://github.com/ufrisk/MemProcFS/releases"),"autopsy"=>Some("https://www.autopsy.com/download/"),
 "wireshark"=>Some("https://www.wireshark.org/download.html"),"ghidra"=>Some("https://github.com/NationalSecurityAgency/ghidra/releases"),"capa"=>Some("https://github.com/mandiant/capa/releases"),"floss"=>Some("https://github.com/mandiant/flare-floss/releases"),
 "yara"=>Some("https://github.com/VirusTotal/yara/releases"),"yara-x"=>Some("https://github.com/VirusTotal/yara-x/releases"),"sigcheck"=>Some("https://learn.microsoft.com/sysinternals/downloads/sigcheck"),"thor-lite"=>Some("https://www.nextron-systems.com/thor-lite/"),"zircolite"=>Some("https://github.com/wagga40/Zircolite"),"apt-hunter"=>Some("https://github.com/ahmedkhlief/APT-Hunter/releases"),
 "browser-history"=>Some("https://github.com/obsidianforensics/hindsight"),"cyberchef"=>Some("https://github.com/gchq/CyberChef/releases"),"exiftool"=>Some("https://exiftool.org/"),"plaso"=>Some("https://plaso.readthedocs.io/en/latest/sources/user/Installation-instructions.html"),"uac"=>Some("https://github.com/tclahr/uac/releases"),
 "oledump"|"rtfdump"|"pdfid"|"pdf-parser"|"emldump"|"zipdump"|"jpegdump"|"base64dump"=>Some("https://blog.didierstevens.com/programs/"),
 "evtxecmd"|"timeline-explorer"|"amcache-parser"|"appcompatcache-parser"|"bstrings"|"ezviewer"|"iis-geolocate"|"jlecmd"|"jump-list-explorer"|"lecmd"|"mftecmd"|"mft-explorer"|"pecmd"|"rbcmd"|"recent-file-cache-parser"|"recmd"|"registry-explorer"|"rla"|"sbecmd"|"sdb-explorer"|"shellbags-explorer"|"sqlecmd"|"srumecmd"|"sumecmd"|"vscmount"|"wxtcmd"=>Some("https://ericzimmerman.github.io/#!index.md"),
 _=>None}}

pub fn install(id:&str)->Result<InstallResult,String>{
 let p=package(id).ok_or("This tool requires manual setup")?;let root=approved_root()?;let destination=root.join(p.destination);
 if destination.exists(){return Ok(InstallResult{message:"Tool is already installed. Use Verify files to check it.".into(),status:"ready".into()})}
 let response=ureq::get(p.url).call().map_err(|e|format!("Download failed: {e}"))?;let length=response.header("Content-Length").and_then(|v|v.parse::<u64>().ok());if length.is_some_and(|v|v>500_000_000){return Err("Package exceeds the approved size limit".into())}
 let mut bytes=Vec::new();response.into_reader().take(500_000_001).read_to_end(&mut bytes).map_err(|e|format!("Could not read download: {e}"))?;if bytes.len()>500_000_000{return Err("Package exceeds the approved size limit".into())}
 let actual=format!("{:x}",Sha256::digest(&bytes));if !actual.eq_ignore_ascii_case(p.sha256){return Err("Downloaded package failed SHA-256 verification".into())}
 let staging=root.join(".staging").join(format!("{}-{}",id,std::process::id()));if staging.exists(){fs::remove_dir_all(&staging).map_err(|_|"Could not clear the installer staging directory")?}fs::create_dir_all(&staging).map_err(|_|"Could not create the installer staging directory")?;
 let extracted=extract_zip(&bytes,&staging);if let Err(error)=extracted{let _=fs::remove_dir_all(&staging);return Err(error)}
 if let Some(parent)=destination.parent(){fs::create_dir_all(parent).map_err(|_|"Could not create the tool directory")?}fs::rename(&staging,&destination).map_err(|e|format!("Could not install the verified package: {e}"))?;
 Ok(InstallResult{message:format!("Downloaded, verified, and installed {id}"),status:"ready".into()})
}

pub fn remove(id:&str)->Result<InstallResult,String>{let p=package(id).ok_or("This tool is not managed automatically")?;let root=approved_root()?;let target=root.join(p.destination);if !target.exists(){return Ok(InstallResult{message:"Tool is already absent".into(),status:"missing".into()})}let meta=fs::symlink_metadata(&target).map_err(|_|"Could not verify the tool directory")?;if meta.file_type().is_symlink()||!meta.is_dir(){return Err("Refusing to remove an unsafe tool path".into())}let canonical=target.canonicalize().map_err(|_|"Could not verify the tool directory")?;if !canonical.starts_with(&root)||canonical==root{return Err("Refusing to remove a path outside the approved tools directory".into())}fs::remove_dir_all(&canonical).map_err(|e|format!("Could not remove tool: {e}"))?;Ok(InstallResult{message:format!("Removed {id}"),status:"missing".into()})}

fn approved_root()->Result<PathBuf,String>{let root=PathBuf::from(TOOLS_ROOT);fs::create_dir_all(&root).map_err(|_|"Could not access the approved tools directory")?;root.canonicalize().map_err(|_|"Could not verify the approved tools directory".into())}
fn extract_zip(bytes:&[u8],destination:&Path)->Result<(),String>{let mut archive=zip::ZipArchive::new(Cursor::new(bytes)).map_err(|_|"Downloaded package is not a valid ZIP archive")?;for index in 0..archive.len(){let mut entry=archive.by_index(index).map_err(|_|"Could not read ZIP entry")?;let relative=entry.enclosed_name().ok_or("Package contains an unsafe path")?.to_path_buf();let output=destination.join(relative);if entry.is_dir(){fs::create_dir_all(&output).map_err(|_|"Could not create extracted directory")?}else{if let Some(parent)=output.parent(){fs::create_dir_all(parent).map_err(|_|"Could not create extracted directory")?}let mut file=fs::File::create(&output).map_err(|_|"Could not create extracted file")?;io::copy(&mut entry,&mut file).map_err(|_|"Could not extract package file")?;}}Ok(())}
