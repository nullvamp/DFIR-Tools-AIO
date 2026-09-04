import { useEffect,useState } from "react";
import { Clock3, Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../../services/tauri";

export function WindowTitleBar() {
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer)},[]);
  const run = async (action: "minimize" | "maximize" | "close") => {
    if (!isTauri()) return;
    const window = getCurrentWindow();
    if (action === "minimize") await window.minimize();
    if (action === "maximize") await window.toggleMaximize();
    if (action === "close") await window.close();
  };

  return (
    <div className="window-titlebar" data-tauri-drag-region>
      <div className="window-title" data-tauri-drag-region>
        <Clock3 size={13}/>
        <span className="window-clock-label" data-tauri-drag-region>LOCAL TIME</span>
        <code data-tauri-drag-region>{now.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"medium"})}</code>
      </div>
      <div className="window-controls">
        <button onClick={() => run("minimize")} aria-label="Minimize window">
          <Minus size={15} />
        </button>
        <button onClick={() => run("maximize")} aria-label="Maximize window">
          <Square size={12} />
        </button>
        <button className="window-close" onClick={() => run("close")} aria-label="Close window">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
