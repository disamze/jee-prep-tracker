import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, PlusCircle, MinusCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { crud } from "../lib/api";
import { Card, Btn, Modal, Input, Select, Empty, PageHead, ProgressBar } from "../components/bits";

const goalsApi = crud("goals");
const BLANK = { title: "", type: "daily", target: 1, current: 0, unit: "", deadline: "", done: false };
const TYPES = [
  { key: "daily", label: "Daily goals", hint: "Study 6h · Solve 100 questions · Revise 2 chapters" },
  { key: "weekly", label: "Weekly goals", hint: "Complete a chapter · Finish 3 modules · 300 questions" },
  { key: "longterm", label: "Long-term goals", hint: "Accuracy 80%+ in Chemistry · Master 10 chapters" },
];

export default function Goals() {
  const [items, setItems] = useState([]); 
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);

  const load = () => goalsApi.list().then(setItems);
  useEffect(() => { load().catch(() => {}); }, []);

  const save = async () => {
    if (!form.title.trim()) { toast.error("Goal title required"); return; }
    try {
      if (editId) await goalsApi.update(editId, form);
      else await goalsApi.create(form);
      toast.success("Goal saved");
      setModal(false); setEditId(null); setForm(BLANK); load();
    } catch { toast.error("Could not save"); }
  };

  const bump = async (g, d) => {
    const current = Math.max(0, (g.current || 0) + d);
    await goalsApi.update(g.id, { ...g, current, done: current >= g.target });
    load();
  };

  const toggleDone = async (g) => {
    await goalsApi.update(g.id, { ...g, done: !g.done, current: !g.done ? g.target : g.current });
    load();
  };

  return (
    <div data-testid="goals-page">
      <PageHead testid="goals-head" title="Goals"
        sub="Small daily wins compound into big rank jumps."
        actions={<Btn testid="add-goal-btn" onClick={() => { setForm(BLANK); setEditId(null); setModal(true); }}><Plus size={16} /> New goal</Btn>} />

      {items.length === 0 ? (
        <Empty testid="goals-empty" text="No goals yet. Set a daily target — 6 focused hours, 100 questions — and watch the streak build." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {TYPES.map((t) => {
            const list = items.filter((g) => g.type === t.key);
            return (
              <div key={t.key}>
                <h2 className="mb-1 text-sm font-semibold">{t.label}</h2>
                <p className="mb-3 text-[11px] text-muted-foreground">{t.hint}</p>
                <div className="space-y-3">
                  {list.length === 0 && <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">No {t.key} goals</p>}
                  {list.map((g) => {
                    const pct = g.target ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
                    return (
                      <Card key={g.id} testid={`goal-card-${g.id}`} className={`py-4 ${g.done ? "opacity-70" : ""}`}>
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${g.done ? "text-muted-foreground line-through" : ""}`}>{g.title}</p>
                          <div className="flex shrink-0 gap-1">
                            <button data-testid={`goal-done-${g.id}`} onClick={() => toggleDone(g)}
                              className={`rounded-lg p-1 ${g.done ? "text-green-400" : "text-muted-foreground hover:bg-secondary"}`}><CheckCircle2 size={15} /></button>
                            <button data-testid={`edit-goal-${g.id}`} onClick={() => { setForm({ ...BLANK, ...g }); setEditId(g.id); setModal(true); }}
                              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><Pencil size={14} /></button>
                            <button data-testid={`delete-goal-${g.id}`} onClick={async () => { await goalsApi.remove(g.id); toast.success("Deleted"); load(); }}
                              className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <ProgressBar value={pct} color={g.done ? "#4ade80" : "hsl(var(--primary))"} />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="mono text-xs text-muted-foreground">{g.current}/{g.target} {g.unit}</span>
                          {!g.done && (
                            <div className="flex gap-1">
                              <button data-testid={`goal-minus-${g.id}`} onClick={() => bump(g, -1)} className="rounded p-0.5 text-muted-foreground hover:bg-secondary"><MinusCircle size={16} /></button>
                              <button data-testid={`goal-plus-${g.id}`} onClick={() => bump(g, 1)} className="rounded p-0.5 text-primary hover:bg-primary/10"><PlusCircle size={16} /></button>
                            </div>
                          )}
                        </div>
                        {g.deadline && <p className="mt-1 text-[11px] text-muted-foreground">Deadline: {g.deadline}</p>}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Edit goal" : "New goal"}>
        <div className="space-y-4">
          <Input label="Goal" testid="goal-form-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Solve 100 questions" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" testid="goal-form-type"
              options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "longterm", label: "Long-term" }]}
              value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Input label="Target" testid="goal-form-target" type="number" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: +e.target.value || 1 })} />
            <Input label="Unit" testid="goal-form-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="questions / hours / chapters" />
            <Input label="Deadline" testid="goal-form-deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn testid="goal-form-save" onClick={save}>{editId ? "Save" : "Create goal"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
