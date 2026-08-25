import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { crud, fmtMinutes, today } from "./lib/api";
import { Card, Btn, Modal, Input, Select, Empty, PageHead, SUBJECTS, SUBJECT_COLORS } from "./components/bits";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const practiceApi = crud("practice");
const BLANK = { date: today(), subject: "Physics", chapter: "", source: "", attempted: 0, correct: 0, incorrect: 0, time_taken: 0 };

export default function Questions() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);

  const load = () => practiceApi.list().then(setItems);
  useEffect(() => { load().catch(() => {}); }, []);

  const week = useMemo(() => { 
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const rows = items.filter((x) => x.date === d);
      days.push({
        label: new Date(d + "T00:00").toLocaleDateString("en-IN", { weekday: "short" }),
        attempted: rows.reduce((s, x) => s + x.attempted, 0),
        correct: rows.reduce((s, x) => s + x.correct, 0),
      });
    }
    return days;
  }, [items]);

  const records = useMemo(() => {
    const byDay = {};
    items.forEach((x) => { byDay[x.date] = (byDay[x.date] || 0) + x.attempted; });
    const totalA = items.reduce((s, x) => s + x.attempted, 0);
    const totalC = items.reduce((s, x) => s + x.correct, 0);
    return {
      bestDay: Math.max(0, ...Object.values(byDay)),
      accuracy: totalA ? Math.round((totalC / totalA) * 100) : 0,
      total: totalA,
      sessions: items.length,
    };
  }, [items]);

  const save = async () => {
    if (form.attempted <= 0) { toast.error("Enter questions attempted"); return; }
    try {
      await practiceApi.create({ ...form, incorrect: form.incorrect || Math.max(0, form.attempted - form.correct) });
      toast.success("Practice logged");
      setModal(false); setForm(BLANK); load();
    } catch { toast.error("Could not save"); }
  };

  const acc = form.attempted ? Math.round((form.correct / form.attempted) * 100) : 0;
  const qph = form.time_taken ? Math.round((form.attempted / form.time_taken) * 60) : 0;

  return (
    <div data-testid="questions-page">
      <PageHead testid="questions-head" title="Question Tracker"
        sub="Log every practice session. Volume × accuracy = rank."
        actions={<Btn testid="add-practice-btn" onClick={() => { setForm(BLANK); setModal(true); }}><Plus size={16} /> Log practice</Btn>} />

      {/* Records */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: "Total questions", v: records.total },
          { l: "Overall accuracy", v: `${records.accuracy}%` },
          { l: "Best day", v: records.bestDay },
          { l: "Sessions", v: records.sessions },
        ].map((r, i) => (
          <Card key={r.l} testid={`record-${i}`} className="py-4 text-center">
            <p className="mono text-2xl font-bold text-primary">{r.v}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{r.l}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card testid="questions-week-chart" className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold">Last 7 days</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="attempted" name="Attempted" radius={[5, 5, 0, 0]} fill="hsl(var(--primary))" />
                <Bar dataKey="correct" name="Correct" radius={[5, 5, 0, 0]} fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card testid="questions-tips">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Trophy size={15} className="text-accent" /> Personal records</h3>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex justify-between"><span>Most in one day</span><span className="mono font-semibold text-foreground">{records.bestDay}</span></li>
            <li className="flex justify-between"><span>Best accuracy (overall)</span><span className="mono font-semibold text-foreground">{records.accuracy}%</span></li>
          </ul>
          <p className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            Log the questions you got wrong into the <span className="text-foreground">Error Book</span> — that's where improvement compounds.
          </p>
        </Card>
      </div>

      {/* Session list */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Practice log</h2>
        {items.length === 0 ? (
          <Empty testid="practice-empty" text="No practice sessions logged yet. Finished a problem set? Log it." />
        ) : (
          <div className="space-y-2">
            {[...items].reverse().slice(0, 20).map((x) => {
              const a = x.attempted ? Math.round((x.correct / x.attempted) * 100) : 0;
              return (
                <Card key={x.id} testid={`practice-${x.id}`} className="flex items-center gap-4 py-3">
                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: SUBJECT_COLORS[x.subject] }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{x.subject}{x.chapter ? ` · ${x.chapter}` : ""}{x.source ? ` · ${x.source}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{x.date} · {x.attempted} attempted · {x.correct} correct · {fmtMinutes(x.time_taken)}</p>
                  </div>
                  <span className="mono text-sm font-bold" style={{ color: a >= 75 ? "#4ade80" : a >= 50 ? "#facc15" : "#f87171" }}>{a}%</span>
                  <button data-testid={`delete-practice-${x.id}`} onClick={async () => { await practiceApi.remove(x.id); toast.success("Deleted"); load(); }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Log practice session">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" testid="practice-form-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Select label="Subject" testid="practice-form-subject" options={SUBJECTS} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <Input label="Chapter" testid="practice-form-chapter" value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} />
          <Input label="Source / book" testid="practice-form-source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Coaching module, PYQ" />
          <Input label="Attempted" testid="practice-form-attempted" type="number" min={0} value={form.attempted} onChange={(e) => setForm({ ...form, attempted: +e.target.value || 0 })} />
          <Input label="Correct" testid="practice-form-correct" type="number" min={0} value={form.correct} onChange={(e) => setForm({ ...form, correct: +e.target.value || 0 })} />
          <Input label="Incorrect" testid="practice-form-incorrect" type="number" min={0} value={form.incorrect} onChange={(e) => setForm({ ...form, incorrect: +e.target.value || 0 })} />
          <Input label="Time taken (min)" testid="practice-form-time" type="number" min={0} value={form.time_taken} onChange={(e) => setForm({ ...form, time_taken: +e.target.value || 0 })} />
        </div>
        <div className="mt-4 flex gap-6 rounded-lg bg-secondary p-3 text-sm">
          <span className="text-muted-foreground">Accuracy: <span className="mono font-semibold text-foreground">{acc}%</span></span>
          <span className="text-muted-foreground">Speed: <span className="mono font-semibold text-foreground">{qph} q/hr</span></span>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn testid="practice-form-save" onClick={save}>Log session</Btn>
        </div>
      </Modal>
    </div>
  );
}
