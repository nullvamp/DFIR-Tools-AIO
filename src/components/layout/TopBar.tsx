import { Bell, ChevronDown } from "lucide-react";
import { SearchBar } from "../common/SearchBar";
const notificationsEnabled = false;
export function TopBar({
  search,
  setSearch,
  activeCase,
  onCaseClick,
}: {
  search: string;
  setSearch: (v: string) => void;
  activeCase?: string;
  onCaseClick: () => void;
}) {
  return (
    <header className="topbar">
      <div className="top-actions">
        <SearchBar value={search} onChange={setSearch} />
        <button className="case" onClick={onCaseClick} title="Switch investigation">
          <span className={`case-dot ${activeCase?'online':''}`}/>
          <code>{activeCase ?? "No active case"}</code>
          <ChevronDown size={14} />
        </button>
        {notificationsEnabled&&<button className="notify" aria-label="Notifications"><Bell size={16}/><i/></button>}
      </div>
    </header>
  );
}
