import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { crud, api, today } from "./lib/api";
import {
  Card, Btn, Modal, Input, Select, Textarea, Badge, Empty, PageHead,
  SUBJECTS, SUBJECT_COLORS, ERROR_TYPES,
} from "./components/bits";

const errorsApi = crud("errors");
const BLANK = { 
  subject: "Physics", chapter: "", topic: "", source: "", question_ref: "",
  error_type: "Conceptual Error", difficulty: "Moderate", date: today(),
  description: "", correct_concept: "", remember: "",
  status: "new", revision_stage: 0, next_revision: "",
};

const STATUS_COLORS = { new: "#f87171", revising: "#fbbf24", mastered: "#4ade80" };

export default function ErrorBook() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [fSubject, setFSubject] = useState("All");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);

  const load = () => errorsApi.list().then(setItems);
  useEffect(() => { load().catch(() => {}); }, []);

  const t = today();
  const filtered = useMemo(() => items.filter((e) => {
    if (tab === "due" && !(e.status !== "mastered" && e.next_revision && e.next_revision <= t)) return false;
    if (tab === "mastered" && e.status !== "mastered") return false;
    if (tab === "all") { /* no-op */ }
    if (fSubject !== "All" && e.subject !== fSubject) return false;
    if (q && !`${e.chapter} ${e.topic} ${e.description} ${e.source}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, tab, q, fSubject, t]);

  const save = async () => {
    try {
      if (editId) await errorsApi.update(editId, form);
      else await errorsApi.create(form);
      toast.success(editId ? "Error updated" : "Error logged — revision scheduled");
      setModal(false); setEditId(null); setForm(BLANK); load();
    } catch { toast.error("Could not save"); }
  };

  const master = async (e) => {
    const updated = await api.masterError(e.id);
    toast.success(updated.status === "mastered" ? "Error mastered. It won't haunt you again." : `Revision ${updated.revision_stage}/4 done — next review ${updated.next_revision}`);
    load();
  };

  const openEdit = (e) => { setForm({ ...BLANK, ...e }); setEditId(e.id); setModal(true); };

  return (
    <div data-testid="error-book-page">
      <PageHead testid="error-book-head" title="Error Book"
        sub="Every question that beat you — logged, scheduled, conquered."
        actions={<Btn testid="add-error-btn" onClick={() => { setForm(BLANK); setEditId(null); setModal(true); }}><Plus size={16} /> Log error</Btn>} />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-card p-1">
          {[["all", "All"], ["due", "Due for revision"], ["mastered", "Mastered"]].map(([k, l]) => (
            <button key={k} data-testid={`tab-${k}`} onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input data-testid="error-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chapter, topic…"
            className="rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <Select testid="error-filter-subject" options={["All", ...SUBJECTS]} value={fSubject} onChange={(e) => setFSubject(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Empty testid="errors-empty" text="No errors here yet. When a question beats you in a module or practice set, log it — that's where the marks are hiding." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((e, i) => (
            <Card key={e.id} testid={`error-card-${e.id}`} className="fade-in" >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={SUBJECT_COLORS[e.subject]}>{e.subject}</Badge>
                    <Badge color={STATUS_COLORS[e.status]}>{e.status}</Badge>
                    <span className="text-[11px] text-muted-foreground">{e.date}</span>
                  </div>
                  <h3 className="mt-2 font-semibold">{e.chapter || "General"}{e.topic ? ` · ${e.topic}` : ""}</h3>
                </div>
                <div className="flex gap-1">
                  <button data-testid={`edit-error-${e.id}`} onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil size={14} /></button>
                  <button data-testid={`delete-error-${e.id}`} onClick={async () => { await errorsApi.remove(e.id); toast.success("Deleted"); load(); }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Type:</span> {e.error_type} · {e.difficulty}</p>
                {e.source && <p><span className="font-medium text-foreground">Source:</span> {e.source}{e.question_ref ? ` · Q${e.question_ref}` : ""}</p>}
                {e.description && <p>{e.description}</p>}
                {e.correct_concept && <p><span className="font-medium text-primary">Correct concept:</span> {e.correct_concept}</p>}
                {e.remember && <p className="italic">"Next time: {e.remember}"</p>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-1.5" title="Revision progress">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-1.5 w-6 rounded-full" style={{ background: e.revision_stage >= n ? "#4ade80" : "hsl(var(--muted))" }} />
                  ))}
                  {e.status !== "mastered" && e.next_revision && (
                    <span className={`ml-2 text-[11px] ${e.next_revision <= t ? "text-destructive" : "text-muted-foreground"}`}>
                      {e.next_revision <= t ? "Review due" : `Next: ${e.next_revision}`}
                    </span>
                  )}
                </div>
                {e.status !== "mastered" && (
                  <Btn size="sm" variant="outline" testid={`master-error-${e.id}`} onClick={() => master(e)}>
                    <ShieldCheck size={13} /> I won't make this again
                  </Btn>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Edit error" : "Log a new error"} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Subject" testid="error-form-subject" options={SUBJECTS} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <Input label="Chapter" testid="error-form-chapter" value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="e.g. Rotational Mechanics" />
          <Input label="Topic" testid="error-form-topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Torque" />
          <Input label="Source / book" testid="error-form-source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. HC Verma, Coaching module" />
          <Input label="Question no." testid="error-form-qref" value={form.question_ref} onChange={(e) => setForm({ ...form, question_ref: e.target.value })} />
          <Input label="Date" testid="error-form-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Error type" testid="error-form-type" options={ERROR_TYPES} value={form.error_type} onChange={(e) => setForm({ ...form, error_type: e.target.value })} />
          <Select label="Difficulty" testid="error-form-difficulty" options={["Easy", "Moderate", "Hard"]} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} />
        </div>
        <div className="mt-4 space-y-4">
          <Textarea label="What went wrong?" testid="error-form-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea label="Correct concept" testid="error-form-concept" value={form.correct_concept} onChange={(e) => setForm({ ...form, correct_concept: e.target.value })} />
          <Textarea label="What should I remember next time?" testid="error-form-remember" value={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn testid="error-form-save" onClick={save}>{editId ? "Save changes" : "Log error"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
