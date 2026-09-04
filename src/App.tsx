import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Box,
  ExternalLink,
  FolderOpen,
  MemoryStick,
  Plus,
  SearchCode,
  ShieldCheck,
  Terminal,
  Wrench as ToolCase,
  Download,
  X,
} from "lucide-react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { WindowTitleBar } from "./components/layout/WindowTitleBar";
import { ToolCard } from "./components/cards/ToolCard";
import { SearchBar } from "./components/common/SearchBar";
import { StatusBadge } from "./components/common/StatusBadge";
import { ToolIcon } from "./components/common/ToolIcon";
import { CreateWorkspaceDialog } from "./components/forms/CreateWorkspaceDialog";
import { WorkspaceManagerDialog } from "./components/forms/WorkspaceManagerDialog";
import { sampleTools } from "./data/tools";
import { useLocalState } from "./hooks/useLocalState";
import { checkStatuses, getWorkspaceStats, installTool, launchTool, openToolDownloadPage, removeTool, startMemoryAcquisition } from "./services/tauri";
import type { Activity as ActivityType, Tool, Workspace, WorkspaceStats } from "./types/tool";

const categories = [
  "Collection",
  "Windows Forensics",
  "Memory Forensics",
  "Disk Forensics",
  "Timeline",
  "Network Forensics",
  "Malware Analysis",
  "Threat Hunting",
  "Browser Forensics",
  "Email / Document Analysis",
  "Linux Forensics",
  "Utilities",
];
const libraryTabs:Record<string,string[]>={
  "Windows Forensics":["All","Collection","Event Logs","Parsers","Viewers"],
  "Disk Forensics":["All","Parsers","Viewers"],
  "Timeline":["All","Parsers","Viewers"],
  "Linux Forensics":["All","Collection","Parsers"],
  "Email / Document Analysis":["All","Office / OLE","PDF","Email","Archives","Images","Utilities"],
};
const quick = [
  ["Create Investigation Workspace", Plus],
  ["Collection Tools", FolderOpen],
  ["Windows Forensics", Box],
  ["Event Log Analysis", Activity],
  ["Memory Analysis", MemoryStick],
  ["Open Malware Lab", ShieldCheck],
] as const;
export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useLocalState<string[]>("dfir:favorites", [
    "kape",
    "hayabusa",
    "volatility3",
  ]);
  const [recent, setRecent] = useLocalState<ActivityType[]>("dfir:recent:v2", []);
  const [sidebar, setSidebar] = useState(false);
  const [selected, setSelected] = useState<Tool | null>(null);
  const [toast, setToast] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useLocalState<Workspace | null>("dfir:active-workspace", null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [managingWorkspaces, setManagingWorkspaces] = useState(false);
  const [workspaces,setWorkspaces]=useLocalState<Workspace[]>("dfir:workspaces",[]);
  const [tools, setTools] = useState<Tool[]>(()=>sampleTools.map(tool=>({...tool,status:"unknown"})));
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".search input")?.focus();
      }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, []);
  useEffect(()=>{if(activeWorkspace&&!workspaces.some(workspace=>workspace.root===activeWorkspace.root))setWorkspaces(current=>[activeWorkspace,...current])},[activeWorkspace,workspaces,setWorkspaces]);
  useEffect(() => {
    checkStatuses()
      .then((statuses) => {
        if (Object.keys(statuses).length) {
          setTools((current) => current.map((tool) => ({
            ...tool,
            status: (statuses[tool.id] as Tool["status"]) ?? "missing",
          })));
        }
      })
      .catch((error) => setToast(`Status check failed: ${String(error)}`));
  }, []);
  const visible = useMemo(() => {
    let t = tools;
    if (page === "Favorites") t = t.filter((x) => favorites.includes(x.id));
    else if (categories.includes(page))
      t = t.filter((x) => x.category === page || (x.id === "plaso" && (page === "Windows Forensics" || page === "Linux Forensics")));
    if (search) {
      const q = search.toLowerCase();
      t = t.filter((x) =>
        [
          x.name,
          x.description,
          x.category,
          x.subcategory,
          ...(x.tags || []),
          ...(x.capabilities || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return t;
  }, [page, search, favorites, tools]);
  async function action(tool: Tool, kind: string) {
    try {
      if (kind === "launch" && tool.id === "plaso" && !activeWorkspace) throw new Error("Select an active case before starting Plaso");
      if (kind === "acquire-memory") {
        if (!activeWorkspace) throw new Error("Create or select an active case before capturing memory");
        const acquisition = await startMemoryAcquisition(activeWorkspace.caseId);
        setToast(acquisition.message);setTimeout(() => setToast(""), 7000);
        setRecent([{id:crypto.randomUUID(),toolId:tool.id,toolName:tool.name,timestamp:new Date().toISOString(),caseId:activeWorkspace.caseId,launchType:"Acquisition"},...recent].slice(0,12));
        return;
      }
      const result = await launchTool(tool, kind, activeWorkspace?.caseId);
      setToast(result.message);
    } catch (error) {
      setToast(`Launch failed: ${String(error)}`);
      setTimeout(() => setToast(""), 5000);
      return;
    }
    setTimeout(() => setToast(""), 2800);
    if (kind === "launch") {
      setRecent(
        [
          {
            id: crypto.randomUUID(),
            toolId: tool.id,
            toolName: tool.name,
            timestamp: new Date().toISOString(),
            caseId: activeWorkspace?.caseId ?? "No workspace",
            launchType: tool.type.toUpperCase(),
          },
          ...recent.filter((x) => x.toolId !== tool.id),
        ].slice(0, 12),
      );
    }
  }
  async function manageTool(tool:Tool,kind:'download'|'remove'|'verify'){
    try{
      if(kind==='verify'){const statuses=await checkStatuses();const status=(statuses[tool.id] as Tool['status'])??'missing';setTools(current=>current.map(item=>item.id===tool.id?{...item,status}:item));setToast(`${tool.name}: ${status==='ready'?'files verified':'installation not found'}`);}
      else{const result=kind==='download'?await installTool(tool.id):await removeTool(tool.id);setTools(current=>current.map(item=>item.id===tool.id?{...item,status:result.status as Tool['status']}:item));setToast(result.message);}
    }catch(error){setToast(`${tool.name}: ${String(error)}`)}
    setTimeout(()=>setToast(''),5000);
  }
  return (
    <div className="app">
      <WindowTitleBar />
      <Sidebar
        page={page}
        setPage={(p) => {
          setPage(p);
          setSearch("");
        }}
        open={sidebar}
        setOpen={setSidebar}
      />
      <div className="workspace">
        <TopBar search={search} setSearch={setSearch} activeCase={activeWorkspace?.caseId} onCaseClick={() => setManagingWorkspaces(true)} />
        <main>
          {page === "Dashboard" && !search ? (
            <Dashboard
              recent={recent}
              tools={tools}
              workspace={activeWorkspace}
              caseCount={workspaces.length}
              onCreate={() => setManagingWorkspaces(true)}
              openPage={setPage}
            />
          ) : page === "Settings" ? (
            <Settings />
          ) : page === "Recently Used" ? (
            <Recent recent={recent} />
          ) : (
            <ToolLibrary
              page={page}
              tools={visible}
              search={search}
              setSearch={setSearch}
              favorites={favorites}
              setFavorites={setFavorites}
              action={action}
              details={setSelected}
              manage={manageTool}
            />
          )}
        </main>
      </div>
      {selected && (
        <Details
          tool={selected}
          close={() => setSelected(null)}
          action={action}
          manage={manageTool}
        />
      )}{" "}
      {managingWorkspaces&&<WorkspaceManagerDialog workspaces={workspaces} active={activeWorkspace} close={()=>setManagingWorkspaces(false)} createNew={()=>{setManagingWorkspaces(false);setCreatingWorkspace(true)}} activate={workspace=>{setActiveWorkspace(workspace);setManagingWorkspaces(false);setToast(`Active case: ${workspace.caseId}`);setTimeout(()=>setToast(""),3000)}} deleted={workspace=>{setWorkspaces(current=>current.filter(item=>item.root!==workspace.root));if(activeWorkspace?.root===workspace.root)setActiveWorkspace(null)}} notify={message=>{setToast(message);setTimeout(()=>setToast(""),4000)}}/>}
      {creatingWorkspace && <CreateWorkspaceDialog close={() => setCreatingWorkspace(false)} created={(workspace) => { setWorkspaces(current=>[workspace,...current.filter(item=>item.root!==workspace.root)]);setActiveWorkspace(workspace);setCreatingWorkspace(false);setToast(`Workspace created: ${workspace.root}`);setTimeout(() => setToast(""), 3500); }} />}
      {toast && (
        <div className="toast">
          <ShieldCheck size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

function PageHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {count !== undefined && (
        <div className="tool-count"><b>{count}</b><span>tools</span></div>
      )}
    </div>
  );
}
function formatBytes(bytes:number){if(bytes===0)return "0 Bytes";const units=["Bytes","KB","MB","GB","TB"];const index=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),units.length-1);return `${(bytes/1024**index).toFixed(index>1?1:0)} ${units[index]}`}
function formatActivity(value:string){const parsed=Date.parse(value);return Number.isNaN(parsed)?value:new Date(parsed).toLocaleString()}
function formatWorkspaceCreated(value:string){const numeric=Number(value);const date=new Date(Number.isFinite(numeric)&&numeric>0?numeric*1000:value);return Number.isNaN(date.getTime())?"Unknown":date.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"medium"})}
function Dashboard({
  recent,
  tools,
  openPage,
  workspace,
  caseCount,
  onCreate,
}: {
  recent: ActivityType[];
  tools: Tool[];
  openPage: (p: string) => void;
  workspace: Workspace | null;
  caseCount: number;
  onCreate: () => void;
}) {
  const [stats,setStats]=useState<WorkspaceStats|null>(null);
  useEffect(()=>{if(!workspace){setStats(null);return}let active=true;const refresh=()=>getWorkspaceStats(workspace.caseId).then(value=>{if(active)setStats(value)}).catch(()=>{if(active)setStats(null)});refresh();const timer=setInterval(refresh,10000);return()=>{active=false;clearInterval(timer)}},[workspace]);
  const ready=tools.filter(tool=>tool.status==='ready'||tool.status==='running').length;
  const missing=tools.filter(tool=>tool.status==='missing').length;
  const unknown=tools.filter(tool=>tool.status==='unknown').length;
  const lastActivity=stats?.lastActivity?new Date(Number(stats.lastActivity)*1000).toLocaleString():"No filesystem activity";
  const activeCaseBytes=stats ? stats.evidenceBytes+stats.outputBytes : null;
  return (
    <>
      <PageHeader
        title="Investigation"
        description="Current case context, tool readiness, and analyst activity."
      />

      <section className="case-section">
        <div className="section-bar">
          <h2>Active investigation</h2>
          <button className="text-btn" onClick={onCreate}>Manage workspace <ArrowRight size={14}/></button>
        </div>
        {workspace ? <article className="case-card">
          <div className="case-top">
            <div className="case-identity">
              <div className="case-heading"><h2>{workspace.caseId}</h2><StatusBadge status="running"/></div>
              <p>{workspace.title}</p>
              <code className="case-created">Created {formatWorkspaceCreated(workspace.createdAt)}</code>
            </div>
          </div>
          <div className="case-stats">
            <div><span>Case root</span><code>{workspace.root}</code></div>
            <div><span>Evidence</span><strong>{stats?.evidenceItems ?? "—"}</strong>{stats&&<code>{formatBytes(stats.evidenceBytes)}</code>}</div>
            <div><span>Last activity</span><code>{lastActivity}</code></div>
          </div>
        </article> : <article className="case-card case-empty"><h2>No active investigation</h2><p>Create a workspace to establish EVIDENCE and OUTPUT folders.</p><button className="btn btn-primary" onClick={onCreate}><Plus size={14}/> Create workspace</button></article>}
      </section>

      <section className="metric-strip" aria-label="Environment summary">
        <div className="metric-available"><span>Available tools</span><strong>{ready}<em>/ {tools.length}</em></strong></div>
        <div className={missing?'metric-missing':'metric-clear'}><span>Missing tools</span><strong>{missing}</strong></div>
        <div className="metric-cases"><span>Cases</span><strong>{caseCount}</strong></div>
        <div className="metric-storage"><span>Active case size</span><strong>{workspace ? activeCaseBytes===null?'Checking':formatBytes(activeCaseBytes) : 'No active case'}</strong></div>
      </section>

      <div className="dashboard-grid">
        <section>
          <div className="section-bar"><h2>Analyst actions</h2><span>Common workflows</span></div>
          <div className="quick-list">
            {quick.map(([name, Icon]) => (
              <button key={name} onClick={() => {
                if (name === "Create Investigation Workspace") onCreate();
                else if (name === "Collection Tools") openPage("Windows Forensics");
                else if (name === "Event Log Analysis"||name === "Windows Forensics") openPage("Windows Forensics");
                else if (name === "Memory Analysis") openPage("Memory Forensics");
                else if (name === "Open Malware Lab") openPage("Malware Analysis");
              }}>
                <Icon size={16}/><span>{name}</span><ArrowRight size={13}/>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-bar"><h2>Recent activity</h2><button className="text-btn" onClick={() => openPage("Recently Used")}>View all <ArrowRight size={14}/></button></div>
          <div className="activity-list">
            {!recent.length&&<div className="activity-empty">No tool activity has been recorded yet.</div>}
            {recent.slice(0, 5).map((a) => (
              <button key={a.id}>
                <Terminal size={14}/>
                <div><b>{a.toolName}</b><span>{formatActivity(a.timestamp)} · {a.caseId}</span></div>
                <code>{a.launchType}</code>
                <ArrowRight size={13}/>
              </button>
            ))}
          </div>
          <div className={`registry-status ${missing?'needs-attention':''}`}>
            <div><span className="registry-dot"/><b>{unknown?"Checking tool registry":missing?"Registry needs attention":"Tool registry ready"}</b></div>
            <span>{unknown?"Validating trusted executable paths":`${ready} of ${tools.length} tools ready${missing?` · ${missing} missing`:''}`}</span>
          </div>
        </section>
      </div>
    </>
  );
}
function ToolLibrary({
  page,
  tools,
  search,
  setSearch,
  favorites,
  setFavorites,
  action,
  details,
  manage,
}: {
  page: string;
  tools: Tool[];
  search: string;
  setSearch: (v: string) => void;
  favorites: string[];
  setFavorites: (v: string[]) => void;
  action: (t: Tool, k: string) => void;
  details: (t: Tool) => void;
  manage: (t:Tool,k:'download'|'remove'|'verify')=>Promise<void>;
}) {
  const title = page === "Favorites" ? "Favorite Tools" : page;
  const tabs=libraryTabs[page]??[];
  const [tab,setTab]=useState("All");
  useEffect(()=>setTab("All"),[page]);
  const displayedTools=tab==="All"?tools:tools.filter(tool=>tool.subcategory===tab);
  const automaticIds=new Set(['yara-x','sigcheck','apt-hunter']);
  const missingAutomatic=displayedTools.filter(tool=>tool.status==='missing'&&automaticIds.has(tool.id));
  const [bulkBusy,setBulkBusy]=useState(false);
  const downloadMissing=async()=>{setBulkBusy(true);for(const tool of missingAutomatic)await manage(tool,'download');setBulkBusy(false)};
  return (
    <>
      <PageHeader
        title={title}
        description={page === "Favorites" ? "Locally saved tools for quick access." : `Approved ${page.toLowerCase()} tools available on this console.`}
        count={displayedTools.length}
      />
      {tabs.length>0&&<nav className="library-tabs" aria-label={`${title} sections`}>{tabs.map(item=><button key={item} className={tab===item?'active':''} onClick={()=>setTab(item)}>{item}</button>)}</nav>}
      <div className="library-bar"><SearchBar value={search} onChange={setSearch} large /><button className="btn btn-ghost download-missing" disabled={!missingAutomatic.length||bulkBusy} onClick={downloadMissing}><Download size={13}/>{bulkBusy?'Installing...':`Download missing (${missingAutomatic.length})`}</button></div>
      {displayedTools.length ? (
        <section className="tool-registry" aria-label={`${title} registry`}>
          <div className="tool-registry-head">
            <span>Tool</span><span>Status</span><span>Version</span><span>Access</span><span>Installation</span><span>Executable / endpoint</span><span>Actions</span>
          </div>
          <div className="tool-list">
            {displayedTools.map((t) => (
              <ToolCard
                key={t.id}
                tool={t}
                favorite={favorites.includes(t.id)}
                onFavorite={() => setFavorites(favorites.includes(t.id) ? favorites.filter((x) => x !== t.id) : [...favorites, t.id])}
                onAction={(k) => action(t, k)}
                onDetails={() => details(t)}
                installMode={automaticIds.has(t.id)?'automatic':'manual'}
                onManage={(kind)=>manage(t,kind)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="empty"><SearchCode size={28}/><h2>No tools found</h2><p>Try a different capability, artifact, or category.</p><button className="btn btn-primary" onClick={() => {setSearch("");setTab("All")}}>Clear filters</button></div>
      )}
    </>
  );
}
function Recent({ recent }: { recent: ActivityType[] }) {
  return (
    <>
      <PageHeader
        title="Recently Used"
        description="Local launch history. Command contents and evidence metadata are not recorded."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>TOOL</th>
              <th>TYPE</th>
              <th>INVESTIGATION</th>
              <th>LAST USED</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((a) => (
              <tr key={a.id}>
                <td>
                  <b>{a.toolName}</b>
                </td>
                <td>
                  <code>{a.launchType}</code>
                </td>
                <td>
                  <code>{a.caseId}</code>
                </td>
                <td>
                  <code>{formatActivity(a.timestamp)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Settings() {
  const sections = [
    "Workspace",
    "Tool Paths",
    "Security",
  ];
  type SettingsSection = (typeof sections)[number];
  type ConsoleSettings = {
    dfirRoot: string; casesRoot: string; offlineFirst: boolean; commandHistory: boolean;
    toolsRoot: string; registryPath: string; serverUrl: string; dockerPath: string;
    vmProvider: string; esxiHost: string; esxiUser: string; casePrefix: string;
    terminal: string; keepTerminalOpen: boolean; confirmAcquisition: boolean;
    logLevel: string; retainLogsDays: string;
  };
  const defaults: ConsoleSettings = {
    dfirRoot: "C:\\DFIR", casesRoot: "C:\\DFIR\\Cases", offlineFirst: true, commandHistory: false,
    toolsRoot: "C:\\DFIR\\Tools", registryPath: "tools\\registry.yaml", serverUrl: "",
    dockerPath: "docker.exe", vmProvider: "None", esxiHost: "", esxiUser: "",
    casePrefix: "INC", terminal: "PowerShell", keepTerminalOpen: true,
    confirmAcquisition: true, logLevel: "Information", retainLogsDays: "30",
  };
  const [active, setActive] = useState<SettingsSection>("Workspace");
  const [saved, setSaved] = useLocalState<ConsoleSettings>("dfir:console-settings:v1", defaults);
  const [draft, setDraft] = useState<ConsoleSettings>(() => ({ ...defaults, ...saved, casesRoot: saved.casesRoot === "D:\\Cases" ? defaults.casesRoot : saved.casesRoot }));
  const [message, setMessage] = useState("");
  const set = <K extends keyof ConsoleSettings>(key: K, value: ConsoleSettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const field = (label: string, key: keyof ConsoleSettings, placeholder = "") => (
    <label>{label}<input value={String(draft[key])} placeholder={placeholder} onChange={(e) => set(key, e.target.value as never)} /></label>
  );
  const toggle = (title: string, detail: string, key: keyof ConsoleSettings) => (
    <div className="setting-row"><div><b>{title}</b><span>{detail}</span></div><input type="checkbox" checked={Boolean(draft[key])} onChange={(e) => set(key, e.target.checked as never)} /></div>
  );
  const panel = () => {
    switch (active) {
      case "Workspace": return <><h2>Case defaults</h2><p>Used when creating new investigation workspaces.</p>{field("Case ID prefix", "casePrefix")}<label>Cases directory<input value="C:\\DFIR\\Cases" readOnly /></label><div className="settings-note">The cases directory is fixed so case operations cannot reach other locations.</div></>;
      case "Tool Paths": return <><h2>Tool locations</h2><p>Paths currently enforced by the trusted application registry.</p><label>DFIR root directory<input value="C:\\DFIR" readOnly /></label><label>Tools directory<input value="C:\\DFIR\\Tools" readOnly /></label><label>Scripts directory<input value="C:\\DFIR\\Scripts" readOnly /></label><div className="settings-note">Tool paths are read-only until validated registry editing is implemented.</div></>;
      case "Security": return <><h2>Security checks</h2><p>Protections that are active in the app.</p><div className="setting-row"><div><b>Stays on this computer</b><span>The app does not send case details or usage data anywhere</span></div><span className="settings-state">On</span></div><div className="setting-row"><div><b>Admin access when needed</b><span>Windows asks for permission only when a tool requires it</span></div><span className="settings-state">On</span></div><div className="setting-row"><div><b>Memory capture check</b><span>Capture stays disabled until the WinPmem guide is confirmed</span></div><span className="settings-state">On</span></div><div className="setting-row"><div><b>Approved tools only</b><span>The app only opens tools included in its tool list</span></div><span className="settings-state">On</span></div></>;
    }
  };
  const save = () => { setSaved(draft); setMessage("Settings saved locally."); window.setTimeout(() => setMessage(""), 2500); };
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure local paths, providers, and security preferences."
      />
      <div className="settings">
        <nav>
          {sections.map((x) => (
            <button className={active === x ? "active" : ""} key={x} onClick={() => { setActive(x); setMessage(""); }}>
              {x}
            </button>
          ))}
        </nav>
        <section>
          {panel()}
          {active === "Workspace" && <div className="settings-actions"><button className="btn btn-primary" onClick={save}>Save settings</button>{message && <span>{message}</span>}</div>}
        </section>
      </div>
    </>
  );
}
function Details({
  tool,
  close,
  action,
  manage,
}: {
  tool: Tool;
  close: () => void;
  action: (t: Tool, k: string) => void;
  manage: (t:Tool,k:'download'|'remove'|'verify')=>Promise<void>;
}) {
  const missing=tool.status==='missing';
  const expected=(tool.executable||'').replace('${DFIR_TOOLS}','C:\\DFIR\\Tools').replace('${DFIR_ROOT}','C:\\DFIR');
  return (
    <div
      className="drawer-wrap"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <aside className="drawer">
        <header>
          <div className="tool-icon">
            <ToolIcon tool={tool} />
          </div>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <h2>{tool.name}</h2>
        <p>{tool.description}</p>
        <StatusBadge status={tool.status} />
        <dl>
          <div>
            <dt>TYPE</dt>
            <dd>{tool.type.toUpperCase()}</dd>
          </div>
          <div>
            <dt>CATEGORY</dt>
            <dd>{tool.category}</dd>
          </div>
          <div>
            <dt>VERSION</dt>
            <dd>{tool.version || "Not detected"}</dd>
          </div>
          <div>
            <dt>ADMINISTRATOR</dt>
            <dd>{tool.requires_admin ? "Required" : "Not required"}</dd>
          </div>
        </dl>
        <div className="detail-path">
          <span>EXECUTABLE / ENDPOINT</span>
          <code>{tool.executable || tool.url || tool.vm_name}</code>
        </div>
        <div className="tags">
          {tool.tags?.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        {missing&&<section className="manual-setup">
          <h3>Install this tool</h3>
          <ol><li>Open the approved publisher page and download the Windows package.</li><li>Extract or install it so the registered executable exists at the path below.</li><li>Return here and select Verify installation.</li></ol>
          <code>{expected}</code>
          <div><button className="btn btn-ghost" onClick={()=>openToolDownloadPage(tool.id)}><ExternalLink size={13}/> Official download page</button><button className="btn btn-primary" onClick={()=>manage(tool,'verify')}><ShieldCheck size={13}/> Verify installation</button></div>
        </section>}
        <footer>
          <button className="btn btn-ghost" onClick={close}>
            Close
          </button>
          <button
            className="btn btn-primary"
            disabled={missing}
            onClick={() => action(tool, tool.id === "winpmem" ? "acquire-memory" : "launch")}
          >
            {tool.type === "web" ? (
              <ExternalLink size={15} />
            ) : (
              <Terminal size={15} />
            )}{" "}
            {tool.id === "winpmem" ? "Capture Memory" : tool.type === "web" ? "Open Interface" : "Launch Tool"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
