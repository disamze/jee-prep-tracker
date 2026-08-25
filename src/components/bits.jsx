import { X, Inbox } from "lucide-react";

export const SUBJECTS = ["Physics", "Chemistry", "Mathematics"];
export const SUBJECT_COLORS = { Physics: "#38bdf8", Chemistry: "#2dd4bf", Mathematics: "#fbbf24" };
export const ERROR_TYPES = [
  "Conceptual Error", "Calculation Error", "Silly Mistake", "Formula Forgotten",
  "Misread Question", "Time Pressure", "Wrong Approach", "Guessing",
];
export const CONFIDENCE = {
  weak: { label: "Weak", color: "#f87171" },
  improving: { label: "Needs Improvement", color: "#fb923c" },
  average: { label: "Average", color: "#facc15" },
  strong: { label: "Strong", color: "#4ade80" },
  mastered: { label: "Mastered", color: "#60a5fa" },
};
export const PRIORITY_COLORS = { critical: "#f87171", high: "#fb923c", medium: "#facc15", low: "#4ade80" };

export function Card({ className = "", children, testid }) {
  return (
    <div data-testid={testid} className={`rounded-xl border border-border bg-card p-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5 ${className}`}>
      {children}
    </div>
  );
}

export function Btn({ variant = "primary", size = "md", className = "", testid, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "text-xs px-2.5 py-1.5", md: "text-sm px-4 py-2", lg: "text-base px-6 py-3" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:brightness-110",
    ghost: "bg-secondary text-secondary-foreground hover:bg-muted",
    outline: "border border-border hover:bg-secondary",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  };
  return <button data-testid={testid} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function Input({ label, testid, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>}
      <input data-testid={testid} {...props} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary" />
    </label>
  );
}

export function Select({ label, options, testid, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>}
      <select data-testid={testid} {...props} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary">
        {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  );
}

export function Textarea({ label, testid, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>}
      <textarea data-testid={testid} rows={3} {...props} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary" />
    </label>
  );
}

export function Badge({ color, children, testid }) {
  return (
    <span data-testid={testid} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: `${color}22`, color }}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, color = "hsl(var(--primary))", className = "" }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 92, stroke = 8, color = "hsl(var(--primary))", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" data-testid="modal-overlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-border p-6 shadow-2xl fade-in sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button data-testid="modal-close-btn" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ text, children, testid }) {
  return (
    <div data-testid={testid} className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-14 text-center">
      <Inbox className="text-muted-foreground" size={32} />
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

export function PageHead({ title, sub, actions, testid }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 fade-in" data-testid={testid}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, color = "hsl(var(--primary))", testid }) {
  return (
    <Card testid={testid} className="group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mono mt-2 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110" style={{ background: `${color}1a`, color }}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
