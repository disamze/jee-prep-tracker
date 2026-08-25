import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Check, Minus, X as XIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { crud, fmtMinutes, today } from "./lib/api";
import { Card, Btn, Modal, Input, Select, Empty, PageHead, SUBJECTS, SUBJECT_COLORS, PRIORITY_COLORS } from "./components/bits";

const tasksApi = crud("tasks");
const BLANK = { date: today(), title: "", subject: "", chapter: "", start: "", end: "", duration: 60, priority: "medium", status: "pending" };
const STATUS_STYLE = {
  completed: { label: "Done", color: "#4ade80" },
  partial: { label: "Partial", color: "#facc15" },
  skipped: { label: "Skipped", color: "#f87171" },
  pending: { label: "Pending", color: "hsl(var(--muted-foreground))" },
};

export default function Planner() {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(today()); 
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);

  const load = () => tasksApi.list().then(setItems);
  useEffect(() => { load().catch(() => {}); }, []);

  const dayTasks = useMemo(
    () => items.filter((x) => x.date === date).sort((a, b) => (a.start || "99") < (b.start || "99") ? -1 : 1),
    [items, date]
  );

  const summary = useMemo(() => {
    const planned = dayTasks.reduce((s, x) => s + (x.duration || 0), 0);
    const actual = dayTasks.reduce((s, x) => s + (x.status === "completed" ? x.duration : x.status === "partial" ? x.duration / 2 : 0), 0);
    const bySubject = {};
    dayTasks.filter((x) => x.status === "completed" && x.subject).forEach((x) => {
      bySubject[x.subject] = (bySubject[x.subject] || 0) + x.duration;
    });
    const best = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0];
    const carried = dayTasks.filter((x) => x.status === "pending" || x.status === "partial").length;
    return { planned, actual, pct: planned ? Math.round((actual / planned) * 100) : 0, best: best?.[0] || "—", carried };
  }, [dayTasks]);

  const shiftDate = (d) => {
    const nd = new Date(date); nd.setDate(nd.getDate() + d);
    setDate(nd.toISOString().slice(0, 10));
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Task title required"); return; }
    try {
      if (editId) await tasksApi.update(editId, form);
      else await tasksApi.create(form);
      toast.success("Task saved");
      setModal(false); setEditId(null); load();
    } catch { toast.error("Could not save"); }
  };

  const setStatus = async (x, status) => {
    await tasksApi.update(x.id, { ...x, status });
    load();
  };

  return (
    <div data-testid="planner-page">
      <PageHead testid="planner-head" title="Study Planner"
        sub="Time-block your day. Review it at night."
        actions={<Btn testid="add-task-btn" onClick={() => { setForm({ ...BLANK, date }); setEditId(null); setModal(true); }}><Plus size={16} /> Add task</Btn>} />

      {/* Date nav */}
      <div className="mb-5 flex items-center gap-3">
        <Btn variant="ghost" size="sm" testid="date-prev" onClick={() => shiftDate(-1)}><ChevronLeft size={16} /></Btn>
        <input data-testid="planner-date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <Btn variant="ghost" size="sm" testid="date-next" onClick={() => shiftDate(1)}><ChevronRight size={16} /></Btn>
        <Btn variant="outline" size="sm" testid="date-today" onClick={() => setDate(today())}>Today</Btn>
        <span className="text-sm font-medium text-muted-foreground">
          {new Date(date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <div className="lg:col-span-2">
          {dayTasks.length === 0 ? (
            <Empty testid="tasks-empty" text="Nothing planned for this day. Add study blocks — revision, practice, module work." />
          ) : (
            <div className="space-y-3">
              {dayTasks.map((x) => (
                <Card key={x.id} testid={`task-card-${x.id}`} className="flex items-center gap-4 py-4">
                  <div className="mono w-24 shrink-0 text-center text-xs text-muted-foreground">
                    {x.start ? <>{x.start}{x.end ? <><br />{x.end}</> : ""}</> : "—"}
                  </div>
                  <div className="h-10 w-1 shrink-0 rounded-full" style={{ background: x.subject ? SUBJECT_COLORS[x.subject] : "hsl(var(--muted))" }} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${x.status === "completed" ? "text-muted-foreground line-through" : ""}`}>{x.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {x.subject && <span style={{ color: SUBJECT_COLORS[x.subject] }}>{x.subject}</span>}
                      {x.chapter && <span>· {x.chapter}</span>}
                      <span>· {fmtMinutes(x.duration)}</span>
                      <span className="rounded-full px-1.5 py-0.5 font-medium" style={{ background: `${PRIORITY_COLORS[x.priority]}1f`, color: PRIORITY_COLORS[x.priority] }}>{x.priority}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button title="Completed" data-testid={`task-complete-${x.id}`} onClick={() => setStatus(x, "completed")}
                      className={`rounded-lg p-1.5 transition-colors ${x.status === "completed" ? "bg-green-500/20 text-green-400" : "text-muted-foreground hover:bg-secondary"}`}><Check size={15} /></button>
                    <button title="Partial" data-testid={`task-partial-${x.id}`} onClick={() => setStatus(x, "partial")}
                      className={`rounded-lg p-1.5 transition-colors ${x.status === "partial" ? "bg-yellow-500/20 text-yellow-400" : "text-muted-foreground hover:bg-secondary"}`}><Minus size={15} /></button>
                    <button title="Skipped" data-testid={`task-skip-${x.id}`} onClick={() => setStatus(x, "skipped")}
                      className={`rounded-lg p-1.5 transition-colors ${x.status === "skipped" ? "bg-red-500/20 text-red-400" : "text-muted-foreground hover:bg-secondary"}`}><XIcon size={15} /></button>
                    <button title="Reset" data-testid={`task-reset-${x.id}`} onClick={() => setStatus(x, "pending")}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><RotateCcw size={14} /></button>
                    <button data-testid={`edit-task-${x.id}`} onClick={() => { setForm({ ...BLANK, ...x }); setEditId(x.id); setModal(true); }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><Pencil size={14} /></button>
                    <button data-testid={`delete-task-${x.id}`} onClick={async () => { await tasksApi.remove(x.id); toast.success("Deleted"); load(); }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Day summary */}
        <Card testid="day-summary" className="h-fit">
          <h3 className="mb-4 text-sm font-semibold">Day review</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Planned</span><span className="mono font-semibold">{fmtMinutes(summary.planned)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Actual (est.)</span><span className="mono font-semibold">{fmtMinutes(Math.round(summary.actual))}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Completion</span>
              <span className="mono font-semibold" style={{ color: summary.pct >= 80 ? "#4ade80" : summary.pct >= 50 ? "#facc15" : "#f87171" }}>{summary.pct}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Most productive subject</span><span className="font-semibold">{summary.best}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Carried forward</span><span className="mono font-semibold">{summary.carried}</span></div>
          </div>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Edit task" : "Add study block"}>
        <div className="space-y-4">
          <Input label="Task" testid="task-form-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Circular Motion revision + 30 PYQs" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Subject" testid="task-form-subject" options={["", ...SUBJECTS]} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <Input label="Chapter" testid="task-form-chapter" value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} />
            <Input label="Date" testid="task-form-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Duration (min)" testid="task-form-duration" type="number" min={5} step={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value || 0 })} />
            <Input label="Start time" testid="task-form-start" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <Input label="End time" testid="task-form-end" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </div>
          <Select label="Priority" testid="task-form-priority"
            options={[{ value: "critical", label: "🔥 Critical" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]}
            value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn testid="task-form-save" onClick={save}>{editId ? "Save changes" : "Add task"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
