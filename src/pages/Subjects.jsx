import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { crud } from "../lib/api";
import {
  Card, Btn, Modal, Input, Select, Badge, Empty, PageHead, ProgressBar,
  SUBJECTS, SUBJECT_COLORS, CONFIDENCE,
} from "../components/bits";

const chaptersApi = crud("chapters");
const BLANK = {
  subject: "Physics", name: "", theory: 0, module: 0, pyq: 0,
  questions_solved: 0, correct: 0, mistakes: 0, confidence: "weak", last_revised: "",
};

export default function Subjects() {
  const [items, setItems] = useState([]);
  const [subject, setSubject] = useState("Physics");
  const [modal, setModal] = useState(false); 
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);

  const load = () => chaptersApi.list().then(setItems);
  useEffect(() => { load().catch(() => {}); }, []);

  const filtered = items.filter((c) => c.subject === subject);

  const insights = useMemo(() => {
    if (!items.length) return null;
    const rank = { weak: 0, improving: 1, average: 2, strong: 3, mastered: 4 };
    const weakest = [...items].sort((a, b) => rank[a.confidence] - rank[b.confidence] || b.mistakes - a.mistakes)[0];
    const mostErrors = [...items].sort((a, b) => b.mistakes - a.mistakes)[0];
    const stale = items.filter((c) => {
      if (!c.last_revised) return true;
      return (Date.now() - new Date(c.last_revised)) / 86400000 >= 10;
    });
    return { weakest, mostErrors, staleCount: stale.length };
  }, [items]);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Chapter name required"); return; }
    try {
      if (editId) await chaptersApi.update(editId, form);
      else await chaptersApi.create(form);
      toast.success("Chapter saved");
      setModal(false); setEditId(null); setForm(BLANK); load();
    } catch { toast.error("Could not save"); }
  };

  return (
    <div data-testid="subjects-page">
      <PageHead testid="subjects-head" title="Subjects & Chapters"
        sub="Track completion, accuracy and confidence for every chapter."
        actions={<Btn testid="add-chapter-btn" onClick={() => { setForm({ ...BLANK, subject }); setEditId(null); setModal(true); }}><Plus size={16} /> Add chapter</Btn>} />

      {/* Subject tabs */}
      <div className="mb-5 flex gap-2">
        {SUBJECTS.map((s) => (
          <button key={s} data-testid={`subject-tab-${s.toLowerCase()}`} onClick={() => setSubject(s)}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200"
            style={subject === s
              ? { background: `${SUBJECT_COLORS[s]}1f`, borderColor: `${SUBJECT_COLORS[s]}66`, color: SUBJECT_COLORS[s] }
              : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
            {s}
          </button>
        ))}
      </div>

      {/* Insights */}
      {insights && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card testid="insight-weakest" className="py-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Weakest chapter</p>
            <p className="mt-1 font-semibold" style={{ color: CONFIDENCE[insights.weakest.confidence].color }}>{insights.weakest.name}</p>
          </Card>
          <Card testid="insight-errors" className="py-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Most mark loss</p>
            <p className="mt-1 font-semibold text-destructive">{insights.mostErrors.name} <span className="mono text-sm">({insights.mostErrors.mistakes} errors)</span></p>
          </Card>
          <Card testid="insight-stale" className="py-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Not revised in 10+ days</p>
            <p className="mono mt-1 text-xl font-bold text-accent">{insights.staleCount}</p>
          </Card>
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty testid="chapters-empty" text={`No ${subject} chapters yet. Add the chapters from your syllabus to start tracking strength.`} />
      ) : (
        <>
          {/* Heatmap strip */}
          <Card testid="chapter-heatmap" className="mb-6">
            <h3 className="mb-3 text-sm font-semibold">Confidence heatmap — {subject}</h3>
            <div className="flex flex-wrap gap-2">
              {filtered.map((c) => (
                <div key={c.id} title={`${c.name} — ${CONFIDENCE[c.confidence].label}`}
                  className="rounded-lg px-3 py-2 text-xs font-medium transition-transform hover:scale-105"
                  style={{ background: `${CONFIDENCE[c.confidence].color}22`, color: CONFIDENCE[c.confidence].color, border: `1px solid ${CONFIDENCE[c.confidence].color}44` }}>
                  {c.name}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {Object.entries(CONFIDENCE).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.color }} /> {v.label}
                </span>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((c) => {
              const acc = c.questions_solved ? Math.round((c.correct / c.questions_solved) * 100) : 0;
              return (
                <Card key={c.id} testid={`chapter-card-${c.id}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <Badge color={CONFIDENCE[c.confidence].color}>{CONFIDENCE[c.confidence].label}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <button data-testid={`edit-chapter-${c.id}`} onClick={() => { setForm({ ...BLANK, ...c }); setEditId(c.id); setModal(true); }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil size={14} /></button>
                      <button data-testid={`delete-chapter-${c.id}`} onClick={async () => { await chaptersApi.remove(c.id); toast.success("Deleted"); load(); }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[["Theory", c.theory], ["Module", c.module], ["PYQs", c.pyq]].map(([l, v]) => (
                      <div key={l}>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{l}</span><span className="mono">{v}%</span></div>
                        <ProgressBar value={v} color={SUBJECT_COLORS[c.subject]} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <div><p className="mono text-lg font-bold">{c.questions_solved}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">solved</p></div>
                    <div><p className="mono text-lg font-bold" style={{ color: acc >= 75 ? "#4ade80" : acc >= 50 ? "#facc15" : "#f87171" }}>{acc}%</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">accuracy</p></div>
                    <div><p className="mono text-lg font-bold text-destructive">{c.mistakes}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">errors</p></div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Edit chapter" : "Add chapter"} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Subject" testid="chapter-form-subject" options={SUBJECTS} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <Input label="Chapter name" testid="chapter-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chemical Bonding" />
          {[["theory", "Theory completion %"], ["module", "Module completion %"], ["pyq", "PYQ completion %"]].map(([k, l]) => (
            <Input key={k} label={l} testid={`chapter-form-${k}`} type="number" min={0} max={100} value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: Math.min(100, Math.max(0, +e.target.value || 0)) })} />
          ))}
          <Input label="Questions solved" testid="chapter-form-questions" type="number" min={0} value={form.questions_solved} onChange={(e) => setForm({ ...form, questions_solved: +e.target.value || 0 })} />
          <Input label="Correct" testid="chapter-form-correct" type="number" min={0} value={form.correct} onChange={(e) => setForm({ ...form, correct: +e.target.value || 0 })} />
          <Input label="Mistakes" testid="chapter-form-mistakes" type="number" min={0} value={form.mistakes} onChange={(e) => setForm({ ...form, mistakes: +e.target.value || 0 })} />
          <Select label="Confidence" testid="chapter-form-confidence"
            options={Object.entries(CONFIDENCE).map(([v, c]) => ({ value: v, label: c.label }))}
            value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value })} />
          <Input label="Last revised" testid="chapter-form-lastrevised" type="date" value={form.last_revised} onChange={(e) => setForm({ ...form, last_revised: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn testid="chapter-form-save" onClick={save}>{editId ? "Save changes" : "Add chapter"}</Btn>
        </div>
      </Modal>
    </div>
  );
}
