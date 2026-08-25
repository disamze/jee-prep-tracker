import { useEffect, useRef, useState } from "react";
import { Download, Upload, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Card, Btn, Input, PageHead, Modal } from "../components/bits";

const COL_LABELS = {
  errors: "Error Book", chapters: "Chapters", tasks: "Tasks",
  focus_sessions: "Focus Sessions", practice_sessions: "Practice Sessions",
  goals: "Goals", revisions: "Revisions",
};

function toCSV(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
 
function download(name, content, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Settings() {
  const [s, setS] = useState({ name: "", daily_target_hours: 6 });
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { api.settings().then(setS).catch(() => {}); }, []);

  const save = async () => {
    await api.saveSettings({ name: s.name, daily_target_hours: +s.daily_target_hours || 6 });
    toast.success("Settings saved");
  };

  const exportJSON = async () => {
    const data = await api.exportAll();
    download(`jee-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    toast.success("Backup downloaded");
  };

  const exportCSV = async () => {
    const data = await api.exportAll();
    for (const [col, label] of Object.entries(COL_LABELS)) {
      const csv = toCSV(data[col] || []);
      if (csv) download(`${label.replace(/\s+/g, "-").toLowerCase()}.csv`, csv, "text/csv");
    }
    toast.success("CSV files downloaded");
  };

  const importJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.importAll(JSON.parse(reader.result));
        toast.success("Backup restored");
      } catch { toast.error("Invalid backup file"); }
    };
    reader.readAsText(file);
  };

  const clearAll = async () => {
    await api.clearAll();
    setConfirmClear(false);
    toast.success("All data cleared — fresh start");
  };

  return (
    <div data-testid="settings-page" className="max-w-2xl space-y-6">
      <PageHead testid="settings-head" title="Settings" sub="Profile, targets and your data." />

      <Card testid="settings-profile">
        <h3 className="mb-4 text-sm font-semibold">Profile & targets</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Your name" testid="settings-name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="Used in your greeting" />
          <Input label="Daily study target (hours)" testid="settings-target" type="number" min={1} max={16} step={0.5}
            value={s.daily_target_hours} onChange={(e) => setS({ ...s, daily_target_hours: e.target.value })} />
        </div>
        <Btn testid="settings-save" className="mt-4" onClick={save}><Save size={15} /> Save</Btn>
      </Card>

      <Card testid="settings-data">
        <h3 className="mb-2 text-sm font-semibold">Backup & export</h3>
        <p className="mb-4 text-xs text-muted-foreground">Your data lives in the database. Export regularly to keep a personal copy.</p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" testid="export-json" onClick={exportJSON}><Download size={15} /> Export JSON backup</Btn>
          <Btn variant="outline" testid="export-csv" onClick={exportCSV}><Download size={15} /> Export CSVs</Btn>
          <Btn variant="outline" testid="import-json" onClick={() => fileRef.current?.click()}><Upload size={15} /> Restore backup</Btn>
          <input ref={fileRef} type="file" accept=".json" className="hidden" data-testid="import-file" onChange={importJSON} />
        </div>
      </Card>

      <Card testid="settings-danger" className="border-destructive/30">
        <h3 className="mb-2 text-sm font-semibold text-destructive">Danger zone</h3>
        <p className="mb-4 text-xs text-muted-foreground">Delete every error, chapter, task, session and goal. This cannot be undone.</p>
        <Btn variant="danger" testid="clear-all-btn" onClick={() => setConfirmClear(true)}><Trash2 size={15} /> Clear all data</Btn>
      </Card>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Delete everything?">
        <p className="text-sm text-muted-foreground">This permanently wipes all your tracker data. Export a backup first if you care about it.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Btn>
          <Btn variant="danger" testid="confirm-clear-btn" onClick={clearAll}>Yes, delete all</Btn>
        </div>
      </Modal>
    </div>
  );
}
