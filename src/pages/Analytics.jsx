import { useEffect, useMemo, useState } from "react";
import { Flame, Trophy, Clock, Target } from "lucide-react";
import { api, fmtMinutes } from "../lib/api";
import { Card, PageHead, Empty, SUBJECT_COLORS } from "../components/bits";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const ERROR_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa", "#f472b6", "#94a3b8"];

function Heatmap({ data }) {
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < data.length; i += 7) w.push(data.slice(i, i + 7));
    return w;
  }, [data]);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-1" style={{ minWidth: 26 * 16 }}>
        {weeks.map((wk, i) => (
          <div key={i} className="flex flex-col gap-1">
            {wk.map((d) => (
              <div key={d.date} title={`${d.date} — ${fmtMinutes(d.minutes)}, ${d.questions} questions, ${d.tasks_done} tasks`}
                data-testid={`heat-${d.date}`}
                className={`heat-${d.level} h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125`} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        Less <span className="heat-0 h-3 w-3 rounded-[3px]" /><span className="heat-1 h-3 w-3 rounded-[3px]" /><span className="heat-2 h-3 w-3 rounded-[3px]" /><span className="heat-3 h-3 w-3 rounded-[3px]" /><span className="heat-4 h-3 w-3 rounded-[3px]" /> More
      </div>
    </div>
  );
}

const ACHIEVEMENTS = [
  { id: "streak7", label: "7-Day Streak", desc: "Study 7 days in a row", ok: (s) => s.streak.longest >= 7 },
  { id: "q1000", label: "1000 Questions", desc: "Solve 1000 questions total", ok: (s) => s.records.total_questions >= 1000 },
  { id: "q100day", label: "Century Day", desc: "100+ questions in one day", ok: (s) => s.records.best_day_questions >= 100 },
  { id: "acc80", label: "Accuracy Master", desc: "80%+ accuracy on a 10+ question day", ok: (s) => s.records.best_accuracy >= 80 },
  { id: "deep3", label: "Deep Worker", desc: "Single session of 3+ hours", ok: (s) => s.records.longest_session >= 180 },
  { id: "crusher", label: "Error Crusher", desc: "Master 10 errors", ok: (s) => s.records.errors_mastered >= 10 },
  { id: "warrior", label: "Revision Warrior", desc: "Complete 15 revision rounds", ok: (s) => s.records.revisions_done >= 15 },
  { id: "focus100", label: "100 Hours", desc: "100 total focus hours", ok: (s) => s.records.total_focus_minutes >= 6000 },
];

export default function Analytics() {
  const [heat, setHeat] = useState([]);
  const [s, setS] = useState(null);

  useEffect(() => {
    api.heatmap().then(setHeat).catch(() => {});
    api.analytics().then(setS).catch(() => {});
  }, []);

  if (!s) return <div className="py-20 text-center text-muted-foreground">Crunching your data…</div>;

  const subjectPie = Object.entries(s.subject_minutes).map(([k, v]) => ({ name: k, value: v }));
  const errorPie = Object.entries(s.error_types).map(([k, v]) => ({ name: k, value: v }));
  const empty = s.records.total_questions === 0 && s.records.total_focus_minutes === 0;

  return (
    <div data-testid="analytics-page" className="space-y-6">
      <PageHead testid="analytics-head" title="Analytics" sub="Consistency, focus and accuracy — measured." />

      {/* Streak + key stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card testid="ana-streak" className="flex items-center gap-3 py-4">
          <Flame className="text-accent" size={22} />
          <div><p className="mono text-2xl font-bold">{s.streak.current}</p><p className="text-[11px] uppercase text-muted-foreground">current streak</p></div>
        </Card>
        <Card testid="ana-longest" className="flex items-center gap-3 py-4">
          <Trophy className="text-accent" size={22} />
          <div><p className="mono text-2xl font-bold">{s.streak.longest}</p><p className="text-[11px] uppercase text-muted-foreground">longest streak</p></div>
        </Card>
        <Card testid="ana-weekly" className="flex items-center gap-3 py-4">
          <Clock className="text-primary" size={22} />
          <div><p className="mono text-2xl font-bold">{fmtMinutes(s.weekly_avg_minutes)}</p><p className="text-[11px] uppercase text-muted-foreground">weekly avg / day</p></div>
        </Card>
        <Card testid="ana-questions" className="flex items-center gap-3 py-4">
          <Target className="text-primary" size={22} />
          <div><p className="mono text-2xl font-bold">{s.records.total_questions}</p><p className="text-[11px] uppercase text-muted-foreground">total questions</p></div>
        </Card>
      </div>

      {/* Heatmap */}
      <Card testid="ana-heatmap">
        <h3 className="mb-4 text-sm font-semibold">Study activity — last 26 weeks</h3>
        <Heatmap data={heat} />
      </Card>

      {empty ? (
        <Empty testid="analytics-empty" text="Charts unlock as you log focus sessions, practice and errors." />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Focus trend */}
            <Card testid="ana-focus-trend">
              <h3 className="mb-3 text-sm font-semibold">Focus minutes — last 30 days</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.focus_by_day}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={6} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                      formatter={(v) => [fmtMinutes(v), "Focus"]} />
                    <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Error types */}
            <Card testid="ana-error-types">
              <h3 className="mb-3 text-sm font-semibold">Where do marks go? — error types</h3>
              {errorPie.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No errors logged yet.</p> : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={errorPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {errorPie.map((_, i) => <Cell key={i} fill={ERROR_COLORS[i % ERROR_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Subject distribution */}
            <Card testid="ana-subjects">
              <h3 className="mb-3 text-sm font-semibold">Focus time by subject</h3>
              {subjectPie.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No focus sessions yet.</p> : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={subjectPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {subjectPie.map((e) => <Cell key={e.name} fill={SUBJECT_COLORS[e.name] || "#94a3b8"} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                        formatter={(v) => fmtMinutes(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Productivity facts */}
            <Card testid="ana-facts">
              <h3 className="mb-3 text-sm font-semibold">Productivity facts</h3>
              <ul className="space-y-3 text-sm">
                {[
                  ["Most productive day", s.most_productive_day],
                  ["Most productive subject", s.most_productive_subject],
                  ["Peak focus time", s.most_productive_hour],
                  ["Longest session", fmtMinutes(s.records.longest_session)],
                  ["Best day (questions)", s.records.best_day_questions],
                  ["Best day accuracy", `${s.records.best_accuracy}%`],
                ].map(([l, v]) => (
                  <li key={l} className="flex justify-between border-b border-border pb-2 last:border-0">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="mono font-semibold">{v || "—"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      {/* Achievements */}
      <Card testid="ana-achievements">
        <h3 className="mb-4 text-sm font-semibold">Achievements</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = a.ok(s);
            return (
              <div key={a.id} data-testid={`achievement-${a.id}`}
                className={`rounded-xl border p-4 text-center transition-all duration-300 ${unlocked ? "border-primary/40 bg-primary/5" : "border-border opacity-45 grayscale"}`}>
                <Trophy size={22} className={`mx-auto ${unlocked ? "text-accent" : "text-muted-foreground"}`} />
                <p className="mt-2 text-xs font-semibold">{a.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
