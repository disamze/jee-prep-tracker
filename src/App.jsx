import { useEffect, useState } from "react";
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

// For Vite projects use VITE_BACKEND_URL
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

const API = `${BACKEND_URL}/api`;

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

// ===============================
// MAIN APP
// ===============================

function App() {
  const [data, setData] = useState(empty);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // ===============================
  // LOAD DASHBOARD
  // ===============================

  const load = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);

      setData({
        ...empty,
        ...response.data,
      });

      setNotice("");
    } catch (error) {
      console.error("Dashboard error:", error);

      setNotice(
        "Could not reach your backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

  const syllabusDone =
    data.syllabus?.filter((item) => item.completed).length || 0;

  const syllabusTotal = data.syllabus?.length || 0;

  const syllabusPct =
    syllabusTotal > 0
      ? Math.round((syllabusDone / syllabusTotal) * 100)
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

  // ===============================
  // UPDATE ITEM
  // ===============================

  const mutate = async (collection, id, changes) => {
    try {
      await axios.patch(
        `${API}/${collection}/${id}`,
        changes
      );

      await load();
    } catch (error) {
      console.error(error);

      setNotice("Could not update the item.");
    }
  };

  // ===============================
  // DELETE ITEM
  // ===============================

  const remove = async (collection, id) => {
    try {
      await axios.delete(
        `${API}/${collection}/${id}`
      );

      await load();
    } catch (error) {
      console.error(error);

      setNotice("Could not delete the item.");
    }
  };

  // ===============================
  // ADD ITEM
  // ===============================

  const add = async (collection, payload) => {
    try {
      const body =
        collection === "exams"
          ? payload
          : {
              ...payload,
              exam_id: activeExam?.id || "",
            };

      await axios.post(
        `${API}/${collection}`,
        body
      );

      await load();

      setModal(null);

      setNotice("Saved successfully.");
    } catch (error) {
      console.error(error);

      setNotice("Could not save the item.");
    }
  };

  // ===============================
  // ENABLE NOTIFICATIONS
  // ===============================

  const notify = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(
        (permission) => {
          if (permission === "granted") {
            setNotice("Browser reminders are enabled.");
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
            setTab={setTab}
            setModal={setModal}
            mutate={mutate}
          />
        )}

        {tab === "timetable" && (
          <Timetable
            items={data.timetable || []}
            setModal={setModal}
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
            close={() => setModal(null)}
          />
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
            {data.syllabus.filter(
              (item) => item.completed
            ).length}{" "}
            of {data.syllabus.length} topics locked in
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
            overdue.length
              ? "alert-panel"
              : ""
          }
        >

          <div className="metric-row">

            <strong>
              {overdue.length}
            </strong>

            <span>
              tasks need a second look
            </span>

          </div>

          {overdue.length > 0 ? (
            overdue
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
                      {item.subject ||
                        "General"}{" "}
                      · {item.date}
                    </small>

                  </div>

                  <button
                    onClick={() =>
                      mutate(
                        "tasks",
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

        <Card
          title="Today's plan"
          icon={Clock3}
        >

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
                  {item.start ||
                    "Flexible"}

                  {item.end &&
                    ` — ${item.end}`}
                </span>

                <div>

                  <b>
                    {item.title}
                  </b>

                  <small>
                    {item.subject ||
                      "Study block"}
                  </small>

                </div>

              </div>

            ))}

          {!data.timetable.length && (
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
                    className="block"
                    key={item.id}
                  >

                    <small>

                      {item.start ||
                        "Flexible"}

                      {item.end &&
                        ` – ${item.end}`}

                    </small>

                    <b>
                      {item.title}
                    </b>

                    <span>
                      {item.subject ||
                        "Open study"}
                    </span>

                    <button
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
  remove,
}) {
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
      ["title", "subject", "date"],
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
  };

  const [heading, collection, fields] =
    configs[type];

  const submit = (event) => {
    event.preventDefault();

    const form = new FormData(
      event.currentTarget
    );

    const payload =
      Object.fromEntries(form);

    add(collection, payload);
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
            field
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
              <Field
                key={field}
                name={field}
                label={label}
                type="time"
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
                  : "text"
              }
              required={
                field === "title" ||
                field === "date"
              }
            />
          );
        })}

        <button
          className="primary full"
          type="submit"
        >
          Save to tracker

          <Check size={16} />
        </button>

      </form>

    </div>
  );
}

export default App;