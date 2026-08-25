import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Volume2, VolumeX, Timer as TimerIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { crud, fmtMinutes, today } from "../lib/api";
import { Card, Btn, Modal, Input, Select, Empty, PageHead, SUBJECTS, SUBJECT_COLORS } from "../components/bits";

const focusApi = crud("focus");
const MODES = {
  pomodoro: { label: "Pomodoro 25/5", work: 25, brk: 5 },
  classic: { label: "50 / 10", work: 50, brk: 10 },
  deep: { label: "Deep Work 90", work: 90, brk: 0 },
  stopwatch: { label: "Stopwatch", work: 0, brk: 0 },
  custom: { label: "Custom", work: 0, brk: 0 }, 
};

const pad = (n) => String(Math.max(0, n)).padStart(2, "0");
const fmt = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

export default function Focus() {
  const [sessions, setSessions] = useState([]);
  const [mode, setMode] = useState("pomodoro");
  const [customMin, setCustomMin] = useState(45);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("work");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [task, setTask] = useState("");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [noiseOn, setNoiseOn] = useState(false);
  const startTimeRef = useRef("");
  const audioRef = useRef(null);

  const load = () => focusApi.list().then(setSessions);
  useEffect(() => { load().catch(() => {}); }, []);

  const workSecs = mode === "custom" ? customMin * 60 : MODES[mode].work * 60;
  const isCountdown = mode !== "stopwatch" && workSecs > 0;

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (isCountdown && running && phase === "work" && elapsed >= workSecs) {
      if (MODES[mode].brk) {
        setPhase("break"); setElapsed(0);
        toast.success("Focus block done — take your break.");
      } else {
        endSession();
      }
    } else if (phase === "break" && running && elapsed >= MODES[mode].brk * 60) {
      setPhase("work"); setElapsed(0);
      toast("Break over — back to work.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, running]);

  const start = () => {
    if (!startTimeRef.current) startTimeRef.current = new Date().toTimeString().slice(0, 5);
    setRunning(true);
  };

  const endSession = async () => {
    setRunning(false);
    if (phase === "break") setPhase("work");
    if (elapsed < 60 && phase === "work") { toast.error("Session under 1 minute — not saved."); reset(); return; }
    setRatingOpen(true);
  };

  const reset = () => { setElapsed(0); setPhase("work"); startTimeRef.current = ""; };

  const saveSession = async (rating) => {
    const minutes = Math.max(1, Math.round((phase === "work" ? elapsed : workSecs) / 60));
    try {
      await focusApi.create({
        date: today(), start_time: startTimeRef.current, duration: minutes,
        mode, subject, chapter, task, rating,
      });
      toast.success(`${fmtMinutes(minutes)} of deep work logged.`);
    } catch { toast.error("Could not save session"); }
    setRatingOpen(false); reset(); load();
  };

  const toggleNoise = () => {
    if (noiseOn) {
      audioRef.current?.ctx.close(); audioRef.current = null; setNoiseOn(false);
    } else {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const gain = ctx.createGain(); gain.gain.value = 0.06;
      src.connect(gain); gain.connect(ctx.destination); src.start();
      audioRef.current = { ctx, src }; setNoiseOn(true);
    }
  };

  const t = today();
  const todaySessions = sessions.filter((s) => s.date === t);
  const todayMin = todaySessions.reduce((s, x) => s + x.duration, 0);
  const longest = sessions.reduce((m, x) => Math.max(m, x.duration), 0);
  const displaySecs = isCountdown && phase === "work" ? workSecs - elapsed
    : phase === "break" ? MODES[mode].brk * 60 - elapsed : elapsed;
  const progress = isCountdown && phase === "work" ? (elapsed / workSecs) * 100 : 0;

  return (
    <div data-testid="focus-page">
      <PageHead testid="focus-head" title="Focus Mode" sub="One task. One timer. Zero distractions." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timer */}
        <Card testid="focus-timer-card" className="lg:col-span-2 flex flex-col items-center py-10">
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {Object.entries(MODES).map(([k, m]) => (
              <button key={k} data-testid={`mode-${k}`} onClick={() => { if (!running) { setMode(k); reset(); } }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${mode === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"} ${running ? "opacity-50" : ""}`}>
                {m.label}
              </button>
            ))}
          </div>
          {mode === "custom" && !running && (
            <div className="mb-4 w-40"><Input label="Minutes" testid="custom-minutes" type="number" min={5} value={customMin} onChange={(e) => setCustomMin(+e.target.value || 5)} /></div>
          )}

          <div className="relative flex h-64 w-64 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" stroke="hsl(var(--muted))" strokeWidth="2.5" fill="none" />
              <circle cx="50" cy="50" r="46" stroke={phase === "break" ? "hsl(var(--accent))" : "hsl(var(--primary))"} strokeWidth="2.5" fill="none"
                strokeLinecap="round" strokeDasharray={289} strokeDashoffset={289 - (progress / 100) * 289}
                style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div className="text-center">
              <p className="mono text-5xl font-bold tracking-tight" data-testid="timer-display">{fmt(displaySecs)}</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                {phase === "break" ? "break" : running ? "focusing" : "ready"}
              </p>
            </div>
          </div>

          {(task || chapter || subject) && (
            <p className="mt-4 text-sm text-muted-foreground">
              <span style={{ color: SUBJECT_COLORS[subject] }}>{subject}</span> {chapter && `· ${chapter}`} {task && `· ${task}`}
            </p>
          )}

          <div className="mt-8 flex items-center gap-3">
            {!running
              ? <Btn size="lg" testid="timer-start" onClick={start}><Play size={18} /> Start</Btn>
              : <Btn size="lg" variant="ghost" testid="timer-pause" onClick={() => setRunning(false)}><Pause size={18} /> Pause</Btn>}
            <Btn size="lg" variant="danger" testid="timer-end" onClick={endSession} disabled={elapsed === 0 && !startTimeRef.current}><Square size={16} /> End session</Btn>
            <button data-testid="noise-toggle" onClick={toggleNoise} title="White noise"
              className={`rounded-xl border p-3 transition-colors ${noiseOn ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
              {noiseOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </Card>

        {/* Setup + stats */}
        <div className="space-y-6">
          <Card testid="focus-setup">
            <h3 className="mb-3 text-sm font-semibold">Session goal</h3>
            <div className="space-y-3">
              <Select label="Subject" testid="focus-subject" options={["", ...SUBJECTS]} value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Input label="Chapter" testid="focus-chapter" value={chapter} onChange={(e) => setChapter(e.target.value)} />
              <Input label="Task" testid="focus-task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. 20 PYQs on Kinematics" />
            </div>
          </Card>
          <Card testid="focus-stats">
            <h3 className="mb-3 text-sm font-semibold">Today</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="mono text-xl font-bold text-primary">{fmtMinutes(todayMin)}</p><p className="text-[10px] uppercase text-muted-foreground">focused</p></div>
              <div><p className="mono text-xl font-bold">{todaySessions.length}</p><p className="text-[10px] uppercase text-muted-foreground">sessions</p></div>
              <div><p className="mono text-xl font-bold text-accent">{fmtMinutes(longest)}</p><p className="text-[10px] uppercase text-muted-foreground">longest</p></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Recent sessions</h2>
        {sessions.length === 0 ? (
          <Empty testid="focus-empty" text="No sessions yet. Start the timer — even 25 minutes counts." />
        ) : (
          <div className="space-y-2">
            {[...sessions].reverse().slice(0, 10).map((s) => (
              <Card key={s.id} testid={`session-${s.id}`} className="flex items-center gap-4 py-3">
                <TimerIcon size={16} className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.task || s.chapter || s.subject || "Focus session"}</p>
                  <p className="text-xs text-muted-foreground">{s.date} {s.start_time && `· ${s.start_time}`} · {MODES[s.mode]?.label || s.mode}</p>
                </div>
                <span className="mono text-sm font-semibold">{fmtMinutes(s.duration)}</span>
                {s.rating > 0 && <span className="text-xs text-accent">{"★".repeat(s.rating)}</span>}
                <button data-testid={`delete-session-${s.id}`} onClick={async () => { await focusApi.remove(s.id); load(); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rating modal */}
      <Modal open={ratingOpen} onClose={() => { setRatingOpen(false); reset(); }} title="How focused were you?">
        <div className="flex justify-center gap-3 py-4">
          {[1, 2, 3, 4, 5].map((r) => (
            <button key={r} data-testid={`rating-${r}`} onClick={() => saveSession(r)}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-border text-lg font-bold transition-all hover:scale-110 hover:border-primary hover:bg-primary/10 hover:text-primary">
              {r}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">1 = distracted · 5 = deep flow</p>
      </Modal>
    </div>
  );
}
