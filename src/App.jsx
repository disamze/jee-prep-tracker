import { useEffect, useRef, useState } from "react";
import "./App.css";
import axios from "axios";

import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";

// ===============================
// BACKEND CONFIGURATION
// ===============================

// VITE_BACKEND_URL may be set to either the server root or its /api endpoint.
// The deployed tracker backend is used by default, while browser storage remains
// available as a fallback if the server is temporarily unavailable.
const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  "https://jee-prep-tracker-tqdf.onrender.com"
).replace(/\/api\/?$/, "");
const API = `${BACKEND_URL}/api`;
const LOCAL_STORAGE_KEY = "jee-apex-tracker-data";

const timeToMinutes = (time) => {
  const [hours, minutes] = (time || "").split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return (hours * 60) + minutes;
};

const formatTime = (time) => {
  const [hours, minutes] = (time || "").split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "Flexible";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, hours, minutes));
};

const formatCountdown = (seconds) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

// ===============================
// EMPTY DATA
// ===============================

const empty = {
  exams: [],
  timetable: [],
  tasks: [],
  syllabus: [],
  errors: [],
  extras: [],
  archives: [],
};

const readLocalData = () => {
  try {
    const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? { ...empty, ...JSON.parse(saved) } : empty;
  } catch {
    return empty;
  }
};

const saveLocalData = (nextData) => {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextData));
};

// ===============================
// REUSABLE CARD COMPONENT
// ===============================

const Card = ({
  children,
  className = "",
  title,
  icon: Icon,
}) => {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-title">
          <div className="title-icon">
            {Icon && <Icon size={16} />}
          </div>

          <h2>{title}</h2>
        </div>
      )}

      {children}
    </section>
  );
};

// ===============================
// REUSABLE INPUT FIELD
// ===============================

const Field = ({ label, ...props }) => {
  return (
    <label className="field">
      <span>{label}</span>

      <input
        {...props}
        data-testid={
          props["data-testid"] ||
          `input-${props.name || label.toLowerCase().replaceAll(" ", "-")}`
        }
      />
    </label>
  );
};

const TimeField = ({ name, label, value = "" }) => {
  const [savedHour, savedMinute] = value.split(":").map(Number);
  const period = savedHour >= 12 ? "PM" : "AM";
  const hour = savedHour % 12 || 12;

  return (
    <label className="field">
      <span>{label}</span>
      <div className="time-picker">
        <select name={`${name}_hour`} defaultValue={value ? String(hour) : ""}>
          <option value="">Hour</option>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((item) =>
            <option key={item} value={item}>{item}</option>
          )}
        </select>
        <select name={`${name}_minute`} defaultValue={value ? String(savedMinute).padStart(2, "0") : ""}>
          <option value="">Min</option>
          {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((item) =>
            <option key={item} value={item}>{item}</option>
          )}
        </select>
        <select name={`${name}_period`} defaultValue={value ? period : "AM"}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </label>
  );
};

// ===============================
// MAIN APP
// ===============================

function App() {
  const [data, setData] = useState(empty);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isOffline, setIsOffline] = useState(!BACKEND_URL);
  const [editingBlock, setEditingBlock] = useState(null);
  const [focusEndsAt, setFocusEndsAt] = useState(null);
  const alarmContext = useRef(null);

  // ===============================
  // LOAD DASHBOARD
  // ===============================

  const load = async () => {
    if (!BACKEND_URL) {
      setData(readLocalData());
      setNotice("Offline mode: changes are saved in this browser.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/dashboard`);

      const nextData = {
        ...empty,
        ...response.data,
      };

      setData(nextData);
      saveLocalData(nextData);
      setIsOffline(false);

      setNotice("");
    } catch (error) {
      console.warn("Dashboard is offline; using browser storage.", error);
      setData(readLocalData());
      setIsOffline(true);
      setNotice("Offline mode: changes are saved in this browser.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      load();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(clock);
  }, []);

  // ===============================
  // EXAM CALCULATIONS
  // ===============================

  const activeExam = data.exams?.[0];

  const daysLeft = activeExam?.date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(`${activeExam.date}T00:00:00`) -
            new Date()) /
            86400000
        )
      )
    : null;

  // ===============================
  // SYLLABUS PROGRESS
  // ===============================

  const syllabusTotal = data.syllabus?.length || 0;

  const syllabusPct =
    syllabusTotal > 0
      ? Math.round(
          data.syllabus.reduce(
            (total, item) => total + (Number.isFinite(Number(item.progress))
              ? Number(item.progress) : item.completed ? 100 : 0),
            0
          ) / syllabusTotal
        )
      : 0;

  // ===============================
  // OVERDUE TASKS
  // ===============================

  const today = new Date().toISOString().slice(0, 10);

  const overdue =
    data.tasks?.filter(
      (item) =>
        !item.completed &&
        item.date &&
        item.date < today
    ) || [];

  const todayName = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });

  const incompleteTodayBlocks = data.timetable?.filter(
    (item) => item.day === todayName && !item.completed
  ) || [];

  const currentMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();
  const activeStudyBlock = data.timetable?.find((item) => {
    const start = timeToMinutes(item.start);
    const end = timeToMinutes(item.end);

    return item.day === todayName && !item.completed && start !== null &&
      end !== null && currentMinutes >= start && currentMinutes < end;
  });
  const activeStudyEnd = activeStudyBlock ? timeToMinutes(activeStudyBlock.end) : null;
  const activeStudySecondsLeft = activeStudyEnd === null
    ? 0
    : Math.max(0, (activeStudyEnd * 60) - (currentTime.getHours() * 3600) -
      (currentTime.getMinutes() * 60) - currentTime.getSeconds());
  const focusSecondsLeft = focusEndsAt
    ? Math.max(0, Math.ceil((focusEndsAt - currentTime.getTime()) / 1000))
    : 0;

  const startFocus = (minutes) => {
    setFocusEndsAt(Date.now() + (minutes * 60 * 1000));
    document.documentElement.requestFullscreen?.();
    setModal(null);
  };

  const endFocus = () => {
    setFocusEndsAt(null);
    if (document.fullscreenElement) document.exitFullscreen?.();
  };

  // ===============================
  // STUDY BREAK REMINDERS
  // ===============================

  const prepareAlarm = () => {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!alarmContext.current) {
      alarmContext.current = new AudioContextClass();
    }

    if (alarmContext.current.state === "suspended") {
      alarmContext.current.resume();
    }

    return alarmContext.current;
  };

  useEffect(() => {
    const playAlarm = () => {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      if (!alarmContext.current) {
        alarmContext.current = new AudioContextClass();
      }

      const context = alarmContext.current;

      if (context.state === "suspended") {
        context.resume();
      }

      [0, 0.22, 0.44].forEach((delay) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = context.currentTime + delay;

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(880, startAt);
        gain.gain.setValueAtTime(0.28, startAt);
        gain.gain.exponentialRampToValueAtTime(0.01, startAt + 0.16);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.17);
      });
    };

    const timers = data.timetable
      .filter((item) => item.day === todayName && !item.completed)
      .filter((item) => item.end)
      .map((item) => {
        const [hours, minutes] = item.end.split(":").map(Number);
        const reminderTime = new Date();

        reminderTime.setHours(hours, minutes, 0, 0);

        if (Number.isNaN(hours) || Number.isNaN(minutes) || reminderTime <= new Date()) {
          return null;
        }

        return window.setTimeout(() => {
          playAlarm();

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Break over — back to study", {
              body: `${item.title || "Your study block"} is ready for your next session.`,
            });
          }
        }, reminderTime.getTime() - Date.now());
      })
      .filter(Boolean);

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [data.timetable, todayName]);

  // ===============================
  // UPDATE ITEM
  // ===============================

  const mutate = async (collection, id, changes) => {
    if (isOffline) {
      setData((current) => {
        const nextData = {
          ...current,
          [collection]: current[collection].map((item) =>
            item.id === id ? { ...item, ...changes } : item
          ),
        };
        saveLocalData(nextData);
        return nextData;
      });
      setNotice("Saved in this browser.");
      return;
    }

    try {
      await axios.patch(
        `${API}/${collection}/${id}`,
        changes
      );

      await load();
    } catch (error) {
      console.warn("Update failed; saving in browser instead.", error);
      setIsOffline(true);
      setData((current) => {
        const nextData = {
          ...current,
          [collection]: current[collection].map((item) =>
            item.id === id ? { ...item, ...changes } : item
          ),
        };
        saveLocalData(nextData);
        return nextData;
      });
      setNotice("Offline mode: update saved in this browser.");
    }
  };

  // ===============================
  // DELETE ITEM
  // ===============================

  const remove = async (collection, id) => {
    if (isOffline) {
      setData((current) => {
        const nextData = {
          ...current,
          [collection]: current[collection].filter((item) => item.id !== id),
        };
        saveLocalData(nextData);
        return nextData;
      });
      setNotice("Saved in this browser.");
      return;
    }

    try {
      await axios.delete(
        `${API}/${collection}/${id}`
      );

      await load();
    } catch (error) {
      console.warn("Delete failed; saving in browser instead.", error);
      setIsOffline(true);
      setData((current) => {
        const nextData = {
          ...current,
          [collection]: current[collection].filter((item) => item.id !== id),
        };
        saveLocalData(nextData);
        return nextData;
      });
      setNotice("Offline mode: deletion saved in this browser.");
    }
  };

  // ===============================
  // ADD ITEM
  // ===============================

  const add = async (collection, payload) => {
    const body =
      collection === "exams"
        ? payload
        : {
            ...payload,
            exam_id: activeExam?.id || "",
          };

    const saveNewItemLocally = () => {
      const item = {
        id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        completed: false,
        archived: false,
        ...body,
      };

      setData((current) => {
        const nextData = {
          ...current,
          [collection]: [item, ...current[collection]],
        };
        saveLocalData(nextData);
        return nextData;
      });
      setModal(null);
      setNotice("Saved in this browser.");
    };

    if (isOffline) {
      saveNewItemLocally();
      return;
    }

    try {
      await axios.post(
        `${API}/${collection}`,
        body
      );

      await load();

      setModal(null);

      setNotice("Saved successfully.");
    } catch (error) {
      console.warn("Save failed; saving in browser instead.", error);
      setIsOffline(true);
      saveNewItemLocally();
    }
  };

  // ===============================
  // ENABLE NOTIFICATIONS
  // ===============================

  const notify = () => {
    prepareAlarm();

    if ("Notification" in window) {
      Notification.requestPermission().then(
        (permission) => {
          if (permission === "granted") {
            setNotice("Browser reminders and break-over alarms are enabled.");
          } else {
            setNotice("Notification permission was not granted.");
          }
        }
      );
    } else {
      setNotice(
        "Notifications are not supported by this browser."
      );
    }
  };

  // ===============================
  // NAVIGATION
  // ===============================

  const nav = [
    {
      id: "overview",
      label: "Command center",
      icon: Target,
    },
    {
      id: "timetable",
      label: "Weekly timetable",
      icon: CalendarDays,
    },
    {
      id: "syllabus",
      label: "Syllabus & extras",
      icon: BookOpen,
    },
    {
      id: "errors",
      label: "Error book",
      icon: CircleAlert,
    },
    {
      id: "archives",
      label: "Archive vault",
      icon: History,
    },
  ];

  // ===============================
  // LOADING SCREEN
  // ===============================

  if (loading) {
    return (
      <div className="loading">
        Loading your command center…
      </div>
    );
  }

  // ===============================
  // APP UI
  // ===============================

  return (
    <div className="shell">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">
            J
          </div>

          <div>
            <b>JEE APEX</b>

            <small>
              STUDY COMMAND
            </small>
          </div>
        </div>

        <div className="nav-label">
          WORKSPACE
        </div>

        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${
              tab === id ? "active" : ""
            }`}
            onClick={() => setTab(id)}
            data-testid={`nav-${id}`}
          >
            <Icon size={17} />

            {label}

            {id === "overview" &&
              overdue.length > 0 && (
                <em>{overdue.length}</em>
              )}
          </button>
        ))}

        <div className="sidebar-foot">

          <div className="streak">

            <Trophy size={18} />

            <div>
              <b>Build the streak</b>

              <span>
                One focused block at a time
              </span>
            </div>

          </div>

          <button
            className="reminder-btn"
            onClick={notify}
            data-testid="enable-browser-reminders"
          >
            <Bell size={15} />

            Enable reminders
          </button>

        </div>

      </aside>

      {/* MAIN AREA */}

      <main className="main">

        <header className="topbar">

          <div>

            <p className="eyebrow">
              {new Date().toLocaleDateString(
                "en-IN",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }
              )}
            </p>

            <h1>
              {tab === "overview"
                ? "Good morning, future engineer."
                : nav.find(
                    (item) => item.id === tab
                  )?.label}
            </h1>

          </div>

          <div className="header-actions">

            <span className="sync">
              <span />
              Live sync
            </span>

            <button
              className="icon-btn"
              onClick={load}
              data-testid="refresh-dashboard"
              title="Refresh"
            >
              <RotateCcw size={17} />
            </button>

            <button
              className="outline"
              onClick={() => setModal("focus")}
            >
              <Clock3 size={15} />
              Focus timer
            </button>

            <button
              className="primary"
              onClick={() => setModal("exam")}
              data-testid="add-exam-button"
            >
              <Plus size={17} />

              Add test
            </button>

          </div>

        </header>

        {/* NOTICE */}

        {notice && (
          <div
            className="notice"
            data-testid="status-notice"
          >
            {notice}

            <button
              onClick={() => setNotice("")}
              data-testid="dismiss-notice"
            >
              <X size={14} />
            </button>

          </div>
        )}

        {/* PAGES */}

        {tab === "overview" && (
          <Overview
            activeExam={activeExam}
            daysLeft={daysLeft}
            syllabusPct={syllabusPct}
            data={data}
            overdue={overdue}
            incompleteTodayBlocks={incompleteTodayBlocks}
            activeStudyBlock={activeStudyBlock}
            activeStudySecondsLeft={activeStudySecondsLeft}
            currentTime={currentTime}
            setTab={setTab}
            setModal={setModal}
            mutate={mutate}
          />
        )}

        {tab === "timetable" && (
          <Timetable
            items={data.timetable || []}
            setModal={setModal}
            editBlock={(item) => {
              setEditingBlock(item);
              setModal("timetable");
            }}
            mutate={mutate}
            remove={remove}
          />
        )}

        {tab === "syllabus" && (
          <Syllabus
            syllabus={data.syllabus || []}
            extras={data.extras || []}
            syllabusPct={syllabusPct}
            setModal={setModal}
            mutate={mutate}
            mutateSubjectProgress={async (subject, progress) => {
              const matchingItems = data.syllabus.filter(
                (item) => (item.subject || "General") === subject
              );

              if (isOffline) {
                setData((current) => {
                  const nextData = {
                    ...current,
                    syllabus: current.syllabus.map((item) =>
                      (item.subject || "General") === subject
                        ? { ...item, progress, completed: progress === 100 }
                        : item
                    ),
                  };
                  saveLocalData(nextData);
                  return nextData;
                });
                setNotice("Saved in this browser.");
                return;
              }

              try {
                await Promise.all(matchingItems.map((item) =>
                  axios.patch(`${API}/syllabus/${item.id}`, {
                    progress,
                    completed: progress === 100,
                  })
                ));
                await load();
              } catch (error) {
                console.warn("Progress update failed; saving in browser instead.", error);
                setIsOffline(true);
                setData((current) => {
                  const nextData = {
                    ...current,
                    syllabus: current.syllabus.map((item) =>
                      (item.subject || "General") === subject
                        ? { ...item, progress, completed: progress === 100 }
                        : item
                    ),
                  };
                  saveLocalData(nextData);
                  return nextData;
                });
                setNotice("Offline mode: progress saved in this browser.");
              }
            }}
            remove={remove}
          />
        )}

        {tab === "errors" && (
          <Errors
            items={data.errors || []}
            setModal={setModal}
            remove={remove}
          />
        )}

        {tab === "archives" && (
          <Archives
            items={data.archives || []}
          />
        )}

        {/* MODAL */}

        {modal && (
          <Modal
            type={modal}
            add={add}
            editItem={modal === "timetable" ? editingBlock : null}
            update={mutate}
            startFocus={startFocus}
            close={() => {
              setModal(null);
              setEditingBlock(null);
            }}
          />
        )}

        {focusEndsAt && (
          <div className="focus-overlay" role="dialog" aria-modal="true">
            <span>FOCUS MODE</span>
            <strong>{formatCountdown(focusSecondsLeft)}</strong>
            <p>Stay with this one study session. Everything else in the tracker is paused.</p>
            <button className="outline" onClick={endFocus}>End focus session</button>
          </div>
        )}

      </main>

    </div>
  );
}

// =================================
// OVERVIEW PAGE
// =================================

function Overview({
  activeExam,
  daysLeft,
  syllabusPct,
  data,
  overdue,
  incompleteTodayBlocks,
  activeStudyBlock,
  activeStudySecondsLeft,
  currentTime,
  setTab,
  setModal,
  mutate,
}) {
  const todayName = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
    }
  );

  const backlog = [
    ...overdue.map((item) => ({ ...item, collection: "tasks" })),
    ...incompleteTodayBlocks.map((item) => ({
      ...item,
      collection: "timetable",
    })),
  ];

  return (
    <div className="content">

      <div className="hero-grid">

        <Card className="countdown">

          <div className="countdown-copy">

            <span className="tag">
              <span className="live-dot" />
              NEXT TEST
            </span>

            <h2>
              {activeExam?.title ||
                "No test scheduled"}
            </h2>

            <p>
              {activeExam
                ? `${activeExam.subject || "All subjects"} · ${new Date(
                    activeExam.date
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )}`
                : "Add your next coaching test to start your plan."}
            </p>

            <div
              className="count-number"
              data-testid="exam-countdown"
            >
              <strong>
                {daysLeft ?? "—"}
              </strong>

              <span>
                {daysLeft !== null
                  ? "DAYS LEFT"
                  : "ADD TEST"}
              </span>
            </div>

          </div>

          <div className="radar">

            <div>
              <Target size={29} />

              <span>
                Focus window
              </span>
            </div>

          </div>

        </Card>

        <Card
          title="Syllabus pulse"
          icon={BookOpen}
          className="pulse"
        >

          <div
            className="big-percent"
            data-testid="syllabus-progress-percent"
          >
            {syllabusPct}
            <small>%</small>
          </div>

          <div className="progress">
            <i
              style={{
                width: `${syllabusPct}%`,
              }}
            />
          </div>

          <p>
            Track each subject as you complete it, one topic at a time.
          </p>

          <button
            className="text-link"
            onClick={() =>
              setTab("syllabus")
            }
          >
            View syllabus

            <ChevronRight size={14} />
          </button>

        </Card>

      </div>

      {/* TODAY'S EXECUTION */}

      <div className="section-head">

        <div>

          <span className="eyebrow">
            TODAY'S EXECUTION
          </span>

          <h2>
            Stay ahead of the curve
          </h2>

        </div>

        <button
          className="outline"
          onClick={() =>
            setModal("task")
          }
        >
          <Plus size={15} />

          Add task
        </button>

      </div>

      <div className="lower-grid">

        {/* BACKLOG */}

        <Card
          title="Backlog alert"
          icon={CircleAlert}
          className={
            backlog.length
              ? "alert-panel"
              : ""
          }
        >

          <div className="metric-row">

            <strong>
              {backlog.length}
            </strong>

            <span>
              incomplete tasks need a second look
            </span>

          </div>

          {backlog.length > 0 ? (
            backlog
              .slice(0, 3)
              .map((item) => (

                <div
                  className="task-row"
                  key={item.id}
                >

                  <span className="warning-dot" />

                  <div>

                    <b>
                      {item.title}
                    </b>

                    <small>
                      {item.subject || "General"} · {item.notes || item.date || "Needs attention"}
                    </small>

                  </div>

                  <button
                    onClick={() =>
                      mutate(
                        item.collection,
                        item.id,
                        {
                          completed: true,
                        }
                      )
                    }
                  >
                    <Check size={15} />
                  </button>

                </div>

              ))
          ) : (
            <div className="empty">
              You're clear. Protect this momentum.
            </div>
          )}

        </Card>

        {/* TODAY PLAN */}

        <Card title="Today's plan" icon={Clock3} className="today-plan">

          {activeStudyBlock && (
            <div className="active-study-clock">
              <span>STUDY BLOCK LIVE</span>
              <strong>
                {formatCountdown(activeStudySecondsLeft)}
              </strong>
              <b>{activeStudyBlock.title}</b>
              <small>
                Ends at {formatTime(activeStudyBlock.end)}
              </small>
            </div>
          )}

          {!activeStudyBlock && (
            <div className="active-study-clock idle">
              <span>STUDY CLOCK</span>
              <strong>
                {currentTime.toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </strong>
              <b>No study block is running right now.</b>
              <small>Your countdown appears here automatically at the next slot.</small>
              <button className="text-link" onClick={() => setModal("focus")}>
                Start a focus timer <ChevronRight size={14} />
              </button>
            </div>
          )}

          {data.timetable
            .filter(
              (item) =>
                item.day === todayName
            )
            .slice(0, 4)
            .map((item) => (

              <div
                className="schedule-row"
                key={item.id}
              >

                <span>
                  {item.start ? formatTime(item.start) : "Flexible"}

                  {item.end &&
                    ` — ${formatTime(item.end)}`}
                </span>

                <div>

                  <b>
                    {item.title}
                  </b>

                  <small>
                    {item.subject ||
                      "Study block"}
                  </small>

                  {item.notes && <p>{item.notes}</p>}

                </div>

                <button
                  className={`schedule-check ${item.completed ? "done" : ""}`}
                  onClick={() => mutate("timetable", item.id, {
                    completed: !item.completed,
                  })}
                  aria-label={item.completed ? "Mark task incomplete" : "Mark task complete"}
                >
                  {item.completed && <Check size={14} />}
                </button>

              </div>

            ))}

          {!data.timetable.some((item) => item.day === todayName) && (
            <div className="empty">
              Your week is waiting for a plan.
            </div>
          )}

          <button
            className="text-link"
            onClick={() =>
              setTab("timetable")
            }
          >
            Open weekly timetable

            <ChevronRight size={14} />
          </button>

        </Card>

        {/* ERRORS */}

        <Card
          title="Recent errors"
          icon={CircleAlert}
        >

          <div className="error-summary">

            {data.errors
              .slice(0, 3)
              .map((item) => (

                <div key={item.id}>

                  <span>
                    {item.subject ||
                      "Review"}
                  </span>

                  <b>
                    {item.title}
                  </b>

                </div>

              ))}

            {!data.errors.length && (
              <div className="empty">
                No errors logged yet.
              </div>
            )}

          </div>

          <button
            className="text-link"
            onClick={() =>
              setTab("errors")
            }
          >
            Open error book

            <ChevronRight size={14} />
          </button>

        </Card>

      </div>

    </div>
  );
}

// =================================
// TIMETABLE PAGE
// =================================

function Timetable({
  items,
  setModal,
  editBlock,
  mutate,
  remove,
}) {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="content">

      <div className="page-actions">

        <p>
          Design the week that gets you ready.
        </p>

        <button
          className="primary"
          onClick={() =>
            setModal("timetable")
          }
        >
          <Plus size={16} />

          Add study block
        </button>

      </div>

      <div className="week-grid">

        {days.map((day) => {

          const dayItems =
            items.filter(
              (item) =>
                item.day === day
            );

          return (
            <div
              className="day-column"
              key={day}
            >

              <div className="day-name">

                {day
                  .slice(0, 3)
                  .toUpperCase()}

                <span>
                  {dayItems.length}
                </span>

              </div>

              {dayItems.map(
                (item) => (

                  <div
                    className={`block ${item.completed ? "done" : ""}`}
                    key={item.id}
                  >

                    <small>

                      {item.start ? formatTime(item.start) : "Flexible"}

                      {item.end &&
                        ` – ${formatTime(item.end)}`}

                    </small>

                    <b>
                      {item.title}
                    </b>

                    <span>
                      {item.subject ||
                        "Open study"}
                    </span>

                    {item.notes && <p className="block-task">{item.notes}</p>}

                    <button
                      className={`block-check ${item.completed ? "done" : ""}`}
                      onClick={() => mutate("timetable", item.id, {
                        completed: !item.completed,
                      })}
                      title={item.completed ? "Mark task incomplete" : "Mark task complete"}
                      aria-label={item.completed ? "Mark task incomplete" : "Mark task complete"}
                    >
                      {item.completed && <Check size={13} />}
                    </button>

                    <button
                      className="block-edit"
                      onClick={() => editBlock(item)}
                      title="Edit study block"
                      aria-label="Edit study block"
                    >
                      <Pencil size={13} /> Edit
                    </button>

                    <button
                      className="block-delete"
                      onClick={() =>
                        remove(
                          "timetable",
                          item.id
                        )
                      }
                    >
                      <Trash2 size={13} />
                    </button>

                  </div>

                )
              )}

              <button
                className="add-day"
                onClick={() =>
                  setModal("timetable")
                }
              >
                <Plus size={14} />

                Add block
              </button>

            </div>
          );
        })}

      </div>

    </div>
  );
}

// =================================
// SYLLABUS PAGE
// =================================

function Syllabus({
  syllabus,
  extras,
  syllabusPct,
  setModal,
  mutate,
  mutateSubjectProgress,
  remove,
}) {
  const subjects = Object.values(syllabus.reduce((groups, item) => {
    const name = item.subject || "General";
    if (!groups[name]) groups[name] = { name, items: [] };
    groups[name].items.push(item);
    return groups;
  }, {}));

  return (
    <div className="content">

      <div className="section-head">

        <div>

          <span className="eyebrow">
            TOPIC LOCKER
          </span>

          <h2>
            {syllabusPct}% of your syllabus is complete
          </h2>

        </div>

        <div>

          <button
            className="outline"
            onClick={() =>
              setModal("extra")
            }
          >
            <Plus size={15} />

            Extra study
          </button>

          {" "}

          <button
            className="primary"
            onClick={() =>
              setModal("syllabus")
            }
          >
            <Plus size={15} />

            Add topic
          </button>

        </div>

      </div>

      <Card
        title="Syllabus checklist"
        icon={BookOpen}
      >

        <div className="subject-progress-list">
          {subjects.map(({ name, items }) => {
            const progress = Math.round(items.reduce(
              (total, item) => total + (Number.isFinite(Number(item.progress))
                ? Number(item.progress) : item.completed ? 100 : 0), 0
            ) / items.length);

            return (
              <div className="subject-progress" key={name}>
                <div><b>{name}</b><span>{progress}% complete</span></div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(event) => mutateSubjectProgress(name, Number(event.target.value))}
                  aria-label={`${name} progress`}
                />
                <div className="subject-checklist" aria-label={`${name} checklist`}>
                  {[
                    ["module_completed", "Complete module"],
                    ["lectures_completed", "Lectures"],
                    ["pyq_completed", "Next PYQ"],
                    ["races_completed", "Next races"],
                    ["reference_book_completed", "Reference book"],
                  ].map(([field, label]) => (
                    <label key={field}>
                      <input
                        type="checkbox"
                        checked={Boolean(items[0][field])}
                        onChange={(event) => mutate("syllabus", items[0].id, {
                          [field]: event.target.checked,
                        })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="topic-list">

          {syllabus.map(
            (item) => (

              <div
                className={`topic ${
                  item.completed
                    ? "done"
                    : ""
                }`}
                key={item.id}
              >

                <button
                  className="check"
                  onClick={() =>
                    mutate(
                      "syllabus",
                      item.id,
                      {
                        completed:
                          !item.completed,
                        progress: item.completed ? 0 : 100,
                      }
                    )
                  }
                >
                  {item.completed && (
                    <Check size={14} />
                  )}
                </button>

                <div>

                  <b>
                    {item.title}
                  </b>

                  <small>
                    {item.subject}
                  </small>

                </div>

                <button
                  className="delete"
                  onClick={() =>
                    remove(
                      "syllabus",
                      item.id
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>

              </div>

            )
          )}

          {!syllabus.length && (
            <div className="empty">
              Add the first topic from your upcoming test.
            </div>
          )}

        </div>

      </Card>

      <Card
        title="Beyond the syllabus"
        icon={BookOpen}
      >

        <div className="extra-grid">

          {extras.map(
            (item) => (

              <div
                className="extra-item"
                key={item.id}
              >

                <span>
                  {item.subject ||
                    "GENERAL"}
                </span>

                <b>
                  {item.title}
                </b>

                <small>
                  {item.notes}
                </small>

              </div>

            )
          )}

          {!extras.length && (
            <div className="empty">
              Keep a list of the things you want to explore.
            </div>
          )}

        </div>

      </Card>

    </div>
  );
}

// =================================
// ERROR BOOK PAGE
// =================================

function Errors({
  items,
  setModal,
  remove,
}) {
  return (
    <div className="content">

      <div className="page-actions">

        <p>
          Turn every wrong answer into a future mark.
        </p>

        <button
          className="primary"
          onClick={() =>
            setModal("error")
          }
        >
          <Plus size={16} />

          Log an error
        </button>

      </div>

      <div className="error-grid">

        {items.map(
          (item) => (

            <article
              className="error-card"
              key={item.id}
            >

              <div className="error-top">

                <span>
                  {item.subject ||
                    "GENERAL"}
                </span>

                <button
                  onClick={() =>
                    remove(
                      "errors",
                      item.id
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>

              </div>

              <h3>
                {item.title}
              </h3>

              <div>

                <label>
                  MISTAKE
                </label>

                <p>
                  {item.mistake ||
                    "Not noted"}
                </p>

              </div>

              <div>

                <label>
                  CONCEPT TO REVISIT
                </label>

                <p>
                  {item.concept ||
                    "Not noted"}
                </p>

              </div>

            </article>

          )
        )}

        {!items.length && (
          <div className="empty wide">
            Your error book is empty.
            Log the first lesson.
          </div>
        )}

      </div>

    </div>
  );
}

// =================================
// ARCHIVES PAGE
// =================================

function Archives({ items }) {
  return (
    <div className="content">

      <div className="page-actions">

        <p>
          Past tests, preserved for reflection.
        </p>

      </div>

      <Card
        title="Archived tests"
        icon={History}
      >

        {items.map(
          (item) => (

            <div
              className="archive-row"
              key={item.id}
            >

              <div>

                <b>
                  {item.title}
                </b>

                <small>
                  {item.subject} · {item.date}
                </small>

              </div>

              <span>
                ARCHIVED
              </span>

            </div>

          )
        )}

        {!items.length && (
          <div className="empty">
            Completed tests will appear here automatically.
          </div>
        )}

      </Card>

    </div>
  );
}

// =================================
// MODAL
// =================================

function Modal({
  type,
  add,
  editItem,
  update,
  startFocus,
  close,
}) {
  const configs = {
    exam: [
      "Schedule a test",
      "exams",
      ["title", "subject", "date"],
    ],

    task: [
      "Add a task",
      "tasks",
      ["title", "subject", "date", "notes"],
    ],

    timetable: [
      "Plan a study block",
      "timetable",
      [
        "title",
        "subject",
        "day",
        "start",
        "end",
        "notes",
      ],
    ],

    syllabus: [
      "Add syllabus topic",
      "syllabus",
      ["title", "subject"],
    ],

    extra: [
      "Add extra study",
      "extras",
      ["title", "subject", "notes"],
    ],

    error: [
      "Log an error",
      "errors",
      [
        "title",
        "subject",
        "mistake",
        "concept",
      ],
    ],

    focus: [
      "Start focus mode",
      "focus",
      ["duration"],
    ],
  };

  const [heading, collection, fields] =
    configs[type];

  const submit = async (event) => {
    event.preventDefault();

    const form = new FormData(
      event.currentTarget
    );

    const payload = Object.fromEntries(form);

    ["start", "end"].forEach((field) => {
      const hour = Number(payload[`${field}_hour`]);
      const minute = payload[`${field}_minute`];
      const period = payload[`${field}_period`];

      if (hour && minute !== "" && period) {
        const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
        payload[field] = `${String(hour24).padStart(2, "0")}:${minute}`;
      }

      delete payload[`${field}_hour`];
      delete payload[`${field}_minute`];
      delete payload[`${field}_period`];
    });

    if (type === "focus") {
      startFocus(Number(payload.duration));
    } else if (editItem) {
      await update(collection, editItem.id, payload);
      close();
    } else {
      add(collection, payload);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          close();
        }
      }}
    >

      <form
        className="modal"
        onSubmit={submit}
      >

        <div className="modal-head">

          <h2>
            {heading}
          </h2>

          <button
            type="button"
            onClick={close}
          >
            <X size={18} />
          </button>

        </div>

        {fields.map((field) => {

          const label =
            field === "notes" && type === "timetable"
              ? "Task details"
              : field
              .replaceAll("_", " ")
              .replace(
                /\b\w/g,
                (letter) =>
                  letter.toUpperCase()
              );

          // TEXTAREA FIELDS

          if (
            field === "notes" ||
            field === "mistake" ||
            field === "concept"
          ) {
            return (
              <label
                className="field"
                key={field}
              >

                <span>
                  {label}
                </span>

                <textarea
                  name={field}
                  defaultValue={editItem?.[field] || ""}
                />

              </label>
            );
          }

          // DAY SELECT

          if (field === "day") {
            return (
              <label
                className="field"
                key={field}
              >

                <span>
                  Day
                </span>

                <select
                  name="day"
                  required
                  defaultValue={editItem?.day || ""}
                >
                  <option value="">
                    Select a day
                  </option>

                  <option>
                    Monday
                  </option>

                  <option>
                    Tuesday
                  </option>

                  <option>
                    Wednesday
                  </option>

                  <option>
                    Thursday
                  </option>

                  <option>
                    Friday
                  </option>

                  <option>
                    Saturday
                  </option>

                  <option>
                    Sunday
                  </option>

                </select>

              </label>
            );
          }

          // TIME FIELDS

          if (
            field === "start" ||
            field === "end"
          ) {
            return (
              <TimeField
                key={field}
                name={field}
                label={label}
                value={editItem?.[field] || ""}
              />
            );
          }

          // NORMAL INPUT

          return (
            <Field
              key={field}
              name={field}
              label={label}
              type={
                field === "date"
                  ? "date"
                  : field === "duration"
                    ? "number"
                  : "text"
              }
              min={field === "duration" ? "1" : undefined}
              defaultValue={editItem?.[field] || (field === "duration" ? "25" : "")}
              required={
                field === "title" ||
                field === "date" ||
                field === "duration"
              }
            />
          );
        })}

        <button
          className="primary full"
          type="submit"
        >
          {type === "focus" ? "Start focus session" : editItem ? "Save changes" : "Save to tracker"}

          <Check size={16} />
        </button>

      </form>

    </div>
  );
}

export default App;
