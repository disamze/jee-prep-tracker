import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame, Target, BookX, Timer, TrendingUp, Plus, ArrowRight,
  AlertTriangle, Info, CalendarDays, Repeat,
} from "lucide-react";
import { api, fmtMinutes } from "../lib/api";
import { Card, StatCard, Ring, Empty, Btn } from "../components/bits";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const MISSION_ICONS = { revision: Repeat, error: BookX, task: CalendarDays, chapter: TrendingUp };

export default function Dashboard() { 
  const [d, setD] = useState(null);

  useEffect(() => { api.dashboard().then(setD).catch(() => {}); }, []);

  if (!d) return <div className="py-20 text-center text-muted-foreground">Loading your day…</div>;

  const name = d.settings?.name || "Aspirant";
  const dateLabel = new Date(d.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const isEmpty = d.totals.questions === 0 && d.totals.focus_minutes === 0 && d.totals.errors === 0;

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      {/* Header */}
      <div className="fade-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {d.greeting}, <span className="text-primary">{name}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Analyze → Identify weakness → Fix mistakes → Practice → Revise → Improve.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
            <Flame size={18} className="text-accent" />
            <div>
              <p className="mono text-lg font-bold leading-none" data-testid="streak-value">{d.streak}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">day streak</p>
            </div>
          </div>
          <Link to="/focus">
            <Btn testid="start-focus-btn" className="pulse-ring"><Timer size={16} /> Focus</Btn>
          </Link>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card testid="stat-study-time" className="fade-in stagger-1 col-span-2 flex items-center justify-between gap-4 lg:col-span-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Study today</p>
            <p className="mono mt-2 text-2xl font-bold">{fmtMinutes(d.study_minutes)}</p>
            <p className="mt-1 text-xs text-muted-foreground">target {d.settings.daily_target_hours}h</p>
          </div>
          <Ring value={d.target_pct} size={76}>
            <span className="mono text-sm font-bold">{d.target_pct}%</span>
          </Ring>
        </Card>
        <StatCard testid="stat-questions" icon={Target} label="Questions today" value={d.questions_today} color="#38bdf8" />
        <StatCard testid="stat-mistakes" icon={BookX} label="Mistakes logged" value={d.mistakes_today} sub={`${d.totals.errors} total · ${d.totals.mastered} mastered`} color="#f87171" />
        <StatCard testid="stat-focus" icon={Timer} label="Focus sessions" value={d.focus_sessions_today} sub={`${fmtMinutes(d.totals.focus_minutes)} all time`} color="#a78bfa" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Mission */}
        <Card testid="todays-mission" className="fade-in stagger-2 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's Mission</h2>
            <span className="text-xs text-muted-foreground">{d.mission.length} priorities</span>
          </div>
          {d.mission.length === 0 ? (
            <Empty testid="mission-empty" text={isEmpty
              ? "Your mission control is empty. Add chapters, plan today's tasks, or log your first practice session."
              : "Nothing urgent right now. Plan tomorrow or start a focus session."}>
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/planner"><Btn size="sm" testid="mission-add-task"><Plus size={14} /> Plan task</Btn></Link>
                <Link to="/questions"><Btn size="sm" variant="ghost" testid="mission-log-questions">Log questions</Btn></Link>
                <Link to="/error-book"><Btn size="sm" variant="ghost" testid="mission-add-error">Add error</Btn></Link>
              </div>
            </Empty>
          ) : (
            <ul className="space-y-2.5">
              {d.mission.map((m, i) => {
                const Icon = MISSION_ICONS[m.kind] || Target;
                return (
                  <li key={i} className="fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
                    <Link to={m.link} data-testid={`mission-item-${i}`}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-secondary">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon size={16} /></div>
                      <p className="flex-1 text-sm">{m.text}</p>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{m.tag}</span>
                      <ArrowRight size={14} className="text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Week chart + alerts */}
        <div className="space-y-6">
          <Card testid="week-chart" className="fade-in stagger-3">
            <h2 className="mb-3 text-sm font-semibold">This week — focus minutes</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.week}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                    formatter={(v, name) => [name === "minutes" ? fmtMinutes(v) : v, name === "minutes" ? "Focus" : "Questions"]} />
                  <Bar dataKey="minutes" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card testid="alerts-card" className="fade-in stagger-4">
            <h2 className="mb-3 text-sm font-semibold">Alerts</h2>
            {d.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All clear. Nothing needs your attention.</p>
            ) : (
              <ul className="space-y-2">
                {d.alerts.map((a, i) => (
                  <li key={i} data-testid={`alert-${i}`} className="flex items-start gap-2 text-sm">
                    {a.type === "warn"
                      ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-accent" />
                      : <Info size={15} className="mt-0.5 shrink-0 text-primary" />}
                    <span className="text-muted-foreground">{a.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div className="fade-in grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: "/questions", icon: Target, label: "Log practice", color: "#38bdf8" },
          { to: "/error-book", icon: BookX, label: "Add error", color: "#f87171" },
          { to: "/planner", icon: CalendarDays, label: "Plan tomorrow", color: "#fbbf24" },
          { to: "/revision", icon: Repeat, label: "Revision queue", color: "#4ade80" },
        ].map((q) => (
          <Link key={q.to} to={q.to} data-testid={`quick-${q.label.replace(/\s+/g, "-").toLowerCase()}`}>
            <Card className="flex items-center gap-3 py-4 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="rounded-lg p-2" style={{ background: `${q.color}1a`, color: q.color }}><q.icon size={17} /></div>
              <span className="text-sm font-medium">{q.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
