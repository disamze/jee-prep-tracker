import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { crud, api, today } from "./lib/api";
import { Card, Btn, Modal, Input, Select, Empty, PageHead, SUBJECTS, SUBJECT_COLORS } from "./components/bits";

const revApi = crud("revisions");
const BLANK = { subject: "Physics", chapter: "", topic: "", stage: 0, last_revised: "", next_due: today() };

const GROUPS = [
  { key: "overdue", label: "Overdue", color: "#f87171" },
  { key: "today", label: "Due today", color: "#fb923c" },
  { key: "soon", label: "Due soon (3 days)", color: "#facc15" },
  { key: "later", label: "Upcoming", color: "#38bdf8" },
  { key: "done", label: "Completed", color: "#4ade80" },
];

function groupOf(r, t) { 
  if (r.stage >= 5) return "done";
  if (r.next_due && r.next_due < t) return "overdue";
  if (r.next_due === t) return "today";
  if (r.next_due && r.next_due <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)) return "soon";
  return "later";
}

export default function Revision() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);

  const load = () => revApi.list().then(setItems);
  useEffect(() => { load().catch(() => {}); }, []);

  const t = today();
  const grouped = GROUPS.map((g) => ({ ...g, items: items.filter((r) => groupOf(r, t) === g.key) }));

  const save = async () => {
    if (!form.chapter.trim()) { toast.error("Chapter required"); return; }
    try {
      if (editId) await revApi.update(editId, form);
      else await revApi.create(form);
      toast.success("Revision scheduled");
      setModal(false); setEditId(null); setForm(BLANK); load();
    } catch { toast.error("Could not save"); }
  };

  const complete = async (r) => {
    const u = await api.completeRevision(r.id);
    toast.success(u.stage >= 5 ? `${r.chapter} fully revised — all 5 rounds done` : `Revision ${u.stage}/5 done — next on ${u.next_due}`);
    load();
  };

  return (
    <div data-testid="revision-page">
      <PageHead testid="revision-head" title="Spaced Revision"
        sub="Five rounds: 1d → 3d → 7d → 15d → 30d. Never let a chapter go cold."
        actions={<Btn testid="add-revision-btn" onClick={() => { setForm(BLANK); setEditId(null); setModal(true); }}><Plus size={16} /> Schedule revision</Btn>} />

      {items.length === 0 ? (
        <Empty testid="revision-empty" text="No revisions scheduled. Add a chapter you just studied — the app will space out 5 revision rounds for you." />
      ) : (
        <div className="space-y-6">
          {grouped.filter((g) => g.items.length > 0).map((g) => (
            <div key={g.key}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: g.color }}>
                <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                {g.label} <span className="mono text-xs text-muted-foreground">({g.items.length})</span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {g.items.map((r) => (
                  <Card key={r.id} testid={`revision-card-${r.id}`} className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SUBJECT_COLORS[r.subject] }} />
                        <p className="truncate font-semibold">{r.chapter}{r.topic ? ` · ${r.topic}` : ""}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className="h-1.5 w-5 rounded-full" style={{ background: r.stage >= n ? "#4ade80" : "hsl(var(--muted))" }} />
                        ))}
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {r.stage >= 5 ? "Fully revised" : r.next_due ? `Due ${r.next_due}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {r.stage < 5 && (
                        <Btn size="sm" variant="outline" testid={`complete-revision-${r.id}`} onClick={() => complete(r)}>
                          <CheckCircle2 size={13} /> Done
                        </Btn>
                      )}
                      <button data-testid={`edit-revision-${r.id}`} onClick={() => { setForm({ ...BLANK, ...r }); setEditId(r.id); setModal(true); }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil size={14} /></button>
                      <button data-testid={`delete-revision-${r.id}`} onClick={async () => { await revApi.remove(r.id); toast.success("Deleted"); load(); }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Edit revision" : "Schedule revision"}>
        <div className="space-y-4">
          <Select label="Subject" testid="revision-form-subject" options={SUBJECTS} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <Input label="Chapter" testid="revision-form-chapter" value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} />
          <Input label="Topic (optional)" testid="revision-form-topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          <Input label="Next revision due" testid="revision-form-due" type="date" value={form.next_due} onChange={(e) => setForm({ ...form, next_due: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn testid="revision-form-save" onClick={save}>{editId ? "Save" : "Schedule"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
