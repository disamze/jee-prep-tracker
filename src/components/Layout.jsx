import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookX, Atom, Repeat, CalendarDays, Timer, Target, Flag,
  BarChart3, Settings as SettingsIcon, Menu, X, Sun, Moon, Zap,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/error-book", label: "Error Book", icon: BookX },
  { to: "/subjects", label: "Subjects", icon: Atom },
  { to: "/revision", label: "Revision", icon: Repeat },
  { to: "/planner", label: "Study Planner", icon: CalendarDays },
  { to: "/focus", label: "Focus Mode", icon: Timer },
  { to: "/questions", label: "Questions", icon: Target },
  { to: "/goals", label: "Goals", icon: Flag },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function applyTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("jee-theme", dark ? "dark" : "light");
}

export default function Layout() {
  const [dark, setDark] = useState(() => localStorage.getItem("jee-theme") !== "light");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { applyTheme(dark); }, [dark]);

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  const navContent = (
    <>
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Zap size={18} />
        </div>
        <div>
          <p className="text-base font-bold leading-tight">Ascent</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">JEE Study OS</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} className={linkCls}
            data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => setMenuOpen(false)}>
            <n.icon size={17} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border bg-card/50 p-4 backdrop-blur lg:block">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="glass sticky top-0 z-40 flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <button data-testid="mobile-menu-btn" onClick={() => setMenuOpen(true)} className="rounded-lg p-2 hover:bg-secondary">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Zap size={14} /></div>
          <span className="font-bold">Ascent</span>
        </div>
        <button data-testid="theme-toggle-mobile" onClick={() => setDark(!dark)} className="rounded-lg p-2 hover:bg-secondary">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="fade-in absolute inset-y-0 left-0 w-64 border-r border-border bg-card p-4">
            <button data-testid="mobile-menu-close" onClick={() => setMenuOpen(false)} className="mb-4 rounded-lg p-2 text-muted-foreground hover:bg-secondary">
              <X size={18} />
            </button>
            {navContent}
          </div>
        </div>
      )}

      {/* Main */}
      <main className="px-4 pb-24 pt-6 sm:px-6 lg:ml-60 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Desktop theme toggle */}
      <button data-testid="theme-toggle" onClick={() => setDark(!dark)}
        className="fixed bottom-6 right-6 z-40 hidden rounded-full border border-border bg-card p-3 shadow-lg transition-transform hover:scale-110 lg:block">
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Mobile bottom nav */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border py-2 lg:hidden">
        {NAV.slice(0, 4).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} data-testid={`bottomnav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
            <n.icon size={19} />
            {n.label.split(" ")[0]}
          </NavLink>
        ))}
        <button onClick={() => navigate("/focus")} data-testid="bottomnav-focus"
          className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] text-muted-foreground">
          <Timer size={19} />
          Focus
        </button>
      </nav>
    </div>
  );
}
