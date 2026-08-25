from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

REVISION_GAPS = [1, 3, 7, 15, 30]  # days between spaced revisions
COLS = ["errors", "chapters", "tasks", "focus_sessions", "practice_sessions", "goals", "revisions"]


def uid():
    return str(uuid.uuid4())


def today_str():
    return datetime.now().strftime("%Y-%m-%d")


def day_str(offset=0):
    return (datetime.now() + timedelta(days=offset)).strftime("%Y-%m-%d")


async def all_docs(col, query=None):
    return await db[col].find(query or {}, {"_id": 0}).to_list(10000)


async def one_doc(col, item_id):
    doc = await db[col].find_one({"id": item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


# ---------------- Models ----------------
class ErrorItem(BaseModel):
    subject: str
    chapter: str = ""
    topic: str = ""
    source: str = ""
    question_ref: str = ""
    error_type: str = "Conceptual Error"
    difficulty: str = "Moderate"
    date: str = ""
    description: str = ""
    correct_concept: str = ""
    remember: str = ""
    status: str = "new"  # new | revising | mastered
    revision_stage: int = 0
    next_revision: str = ""


class Chapter(BaseModel):
    subject: str
    name: str
    theory: int = 0
    module: int = 0
    pyq: int = 0
    questions_solved: int = 0
    correct: int = 0
    mistakes: int = 0
    confidence: str = "weak"  # weak | improving | average | strong | mastered
    last_revised: str = ""


class Task(BaseModel):
    date: str
    title: str
    subject: str = ""
    chapter: str = ""
    start: str = ""
    end: str = ""
    duration: int = 60
    priority: str = "medium"  # critical | high | medium | low
    status: str = "pending"  # pending | completed | partial | skipped


class FocusSession(BaseModel):
    date: str
    start_time: str = ""
    duration: int = 0  # minutes
    mode: str = "pomodoro"
    subject: str = ""
    chapter: str = ""
    task: str = ""
    rating: int = 0


class PracticeSession(BaseModel):
    date: str
    subject: str
    chapter: str = ""
    source: str = ""
    attempted: int = 0
    correct: int = 0
    incorrect: int = 0
    time_taken: int = 0  # minutes


class Goal(BaseModel):
    title: str
    type: str = "daily"  # daily | weekly | longterm
    target: float = 1
    current: float = 0
    unit: str = ""
    deadline: str = ""
    done: bool = False


class RevisionItem(BaseModel):
    subject: str
    chapter: str
    topic: str = ""
    stage: int = 0  # completed revisions 0..5
    last_revised: str = ""
    next_due: str = ""


class Settings(BaseModel):
    name: str = ""
    daily_target_hours: float = 6


# ---------------- Generic CRUD ----------------
def make_crud(route, col, model):
    @api_router.get(f"/{route}", operation_id=f"list_{col}")
    async def list_items():
        return await all_docs(col)

    @api_router.post(f"/{route}", operation_id=f"create_{col}")
    async def create_item(item: model):
        doc = item.model_dump()
        doc["id"] = uid()
        if col == "errors":
            if not doc["date"]:
                doc["date"] = today_str()
            if not doc["next_revision"]:
                doc["next_revision"] = day_str(REVISION_GAPS[0])
        if col == "revisions" and not doc["next_due"]:
            doc["next_due"] = day_str(REVISION_GAPS[0])
        if col == "tasks" and not doc["date"]:
            doc["date"] = today_str()
        if col in ("focus_sessions", "practice_sessions") and not doc["date"]:
            doc["date"] = today_str()
        await db[col].insert_one(doc)
        doc.pop("_id", None)
        return doc

    @api_router.put(f"/{route}/{{item_id}}", operation_id=f"update_{col}")
    async def update_item(item_id: str, item: model):
        await one_doc(col, item_id)
        await db[col].update_one({"id": item_id}, {"$set": item.model_dump()})
        return await one_doc(col, item_id)

    @api_router.delete(f"/{route}/{{item_id}}", operation_id=f"delete_{col}")
    async def delete_item(item_id: str):
        await db[col].delete_one({"id": item_id})
        return {"ok": True}


make_crud("errors", "errors", ErrorItem)
make_crud("chapters", "chapters", Chapter)
make_crud("tasks", "tasks", Task)
make_crud("focus", "focus_sessions", FocusSession)
make_crud("practice", "practice_sessions", PracticeSession)
make_crud("goals", "goals", Goal)
make_crud("revisions", "revisions", RevisionItem)


# ---------------- Special actions ----------------
@api_router.post("/errors/{item_id}/master")
async def master_error(item_id: str):
    doc = await one_doc("errors", item_id)
    stage = min(doc.get("revision_stage", 0) + 1, 4)
    status = "mastered" if stage >= 4 else "revising"
    next_rev = "" if status == "mastered" else day_str(REVISION_GAPS[stage])
    await db.errors.update_one({"id": item_id}, {"$set": {
        "revision_stage": stage, "status": status, "next_revision": next_rev}})
    return await one_doc("errors", item_id)


@api_router.post("/revisions/{item_id}/complete")
async def complete_revision(item_id: str):
    doc = await one_doc("revisions", item_id)
    stage = min(doc.get("stage", 0) + 1, 5)
    next_due = "" if stage >= 5 else day_str(REVISION_GAPS[stage])
    await db.revisions.update_one({"id": item_id}, {"$set": {
        "stage": stage, "last_revised": today_str(), "next_due": next_due}})
    return await one_doc("revisions", item_id)


# ---------------- Settings ----------------
DEFAULT_SETTINGS = {"name": "", "daily_target_hours": 6}


@api_router.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    return doc or {"id": "settings", **DEFAULT_SETTINGS}


@api_router.put("/settings")
async def put_settings(s: Settings):
    await db.settings.update_one({"id": "settings"}, {"$set": s.model_dump()}, upsert=True)
    return await get_settings()


# ---------------- Dashboard ----------------
def compute_streaks(dates):
    cur, longest, run = 0, 0, 0
    d = datetime.now().date()
    if d.strftime("%Y-%m-%d") not in dates:
        d -= timedelta(days=1)
    while d.strftime("%Y-%m-%d") in dates:
        cur += 1
        d -= timedelta(days=1)
    for i in range(0, 400):
        dd = (datetime.now().date() - timedelta(days=i)).strftime("%Y-%m-%d")
        if dd in dates:
            run += 1
            longest = max(longest, run)
        else:
            run = 0
    return cur, longest


@api_router.get("/dashboard")
async def dashboard():
    t = today_str()
    focus = await all_docs("focus_sessions")
    practice = await all_docs("practice_sessions")
    tasks = await all_docs("tasks")
    errors = await all_docs("errors")
    chapters = await all_docs("chapters")
    revisions = await all_docs("revisions")
    settings = await get_settings()

    focus_today = [f for f in focus if f["date"] == t]
    study_min = sum(f.get("duration", 0) for f in focus_today)
    tasks_today = [x for x in tasks if x["date"] == t]
    planned = sum(x.get("duration", 0) for x in tasks_today)
    completed_min = sum(x.get("duration", 0) for x in tasks_today if x["status"] == "completed") \
        + sum(x.get("duration", 0) * 0.5 for x in tasks_today if x["status"] == "partial")
    q_today = sum(p.get("attempted", 0) for p in practice if p["date"] == t)
    mistakes_today = len([e for e in errors if e["date"] == t])

    act_dates = set(f["date"] for f in focus) | set(p["date"] for p in practice) \
        | set(x["date"] for x in tasks if x["status"] in ("completed", "partial")) \
        | set(e["date"] for e in errors)
    streak, longest = compute_streaks(act_dates)

    week = []
    for i in range(6, -1, -1):
        d = day_str(-i)
        week.append({
            "date": d,
            "label": datetime.strptime(d, "%Y-%m-%d").strftime("%a"),
            "minutes": sum(f.get("duration", 0) for f in focus if f["date"] == d),
            "questions": sum(p.get("attempted", 0) for p in practice if p["date"] == d),
        })

    target_min = settings.get("daily_target_hours", 6) * 60
    target_pct = round(min(100, (study_min / target_min) * 100)) if target_min else 0

    # ---- Today's mission (rule-based) ----
    mission = []
    overdue_rev = [r for r in revisions if r.get("next_due") and r["next_due"] < t and r.get("stage", 0) < 5]
    due_rev = [r for r in revisions if r.get("next_due") == t]
    for r in overdue_rev[:2]:
        mission.append({"kind": "revision", "tag": "Overdue", "text": f"Revise {r['chapter']} ({r['subject']}) — overdue since {r['next_due']}", "link": "/revision"})
    for r in due_rev[:2]:
        mission.append({"kind": "revision", "tag": "Due today", "text": f"Revise {r['chapter']} ({r['subject']})", "link": "/revision"})
    errors_due = [e for e in errors if e["status"] != "mastered" and e.get("next_revision") and e["next_revision"] <= t]
    for e in errors_due[:2]:
        mission.append({"kind": "error", "tag": "Error review", "text": f"Re-solve error: {e['chapter'] or e['subject']} — {e['error_type']}", "link": "/error-book"})
    prio_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    pending = sorted([x for x in tasks_today if x["status"] == "pending"], key=lambda x: prio_rank.get(x["priority"], 2))
    for x in pending[:2]:
        mission.append({"kind": "task", "tag": x["priority"].capitalize(), "text": f"{x['title']} — {x.get('duration', 0)} min", "link": "/planner"})
    conf_rank = {"weak": 0, "improving": 1, "average": 2, "strong": 3, "mastered": 4}
    weak = sorted(chapters, key=lambda c: (conf_rank.get(c["confidence"], 0), -c.get("mistakes", 0)))[:2]
    for c in weak:
        if c["confidence"] in ("weak", "improving"):
            mission.append({"kind": "chapter", "tag": "Weak area", "text": f"Strengthen {c['name']} ({c['subject']})", "link": "/subjects"})
    mission = mission[:5]

    # ---- Alerts ----
    alerts = []
    if len(errors_due) > 2:
        alerts.append({"type": "warn", "text": f"You have {len(errors_due)} errors waiting for review."})
    if overdue_rev:
        alerts.append({"type": "warn", "text": f"{len(overdue_rev)} chapter revision(s) are overdue."})
    for c in chapters:
        if c.get("last_revised"):
            try:
                days = (datetime.now().date() - datetime.strptime(c["last_revised"], "%Y-%m-%d").date()).days
                if days >= 10:
                    alerts.append({"type": "info", "text": f"You haven't revised {c['name']} in {days} days."})
            except Exception:
                pass
    if study_min == 0 and len(act_dates) > 0 and streak > 0:
        alerts.append({"type": "info", "text": f"No study logged yet today — protect your {streak}-day streak."})
    alerts = alerts[:5]

    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 17 else "Good evening")

    return {
        "date": t,
        "greeting": greeting,
        "settings": settings,
        "study_minutes": study_min,
        "planned_minutes": planned,
        "completed_minutes": round(completed_min),
        "questions_today": q_today,
        "mistakes_today": mistakes_today,
        "focus_sessions_today": len(focus_today),
        "streak": streak,
        "longest_streak": longest,
        "target_pct": target_pct,
        "week": week,
        "mission": mission,
        "alerts": alerts,
        "totals": {
            "errors": len(errors),
            "mastered": len([e for e in errors if e["status"] == "mastered"]),
            "chapters": len(chapters),
            "questions": sum(p.get("attempted", 0) for p in practice),
            "focus_minutes": sum(f.get("duration", 0) for f in focus),
        },
    }


# ---------------- Analytics ----------------
@api_router.get("/analytics/heatmap")
async def heatmap():
    focus = await all_docs("focus_sessions")
    practice = await all_docs("practice_sessions")
    tasks = await all_docs("tasks")
    days = []
    for i in range(181, -1, -1):
        d = day_str(-i)
        minutes = sum(f.get("duration", 0) for f in focus if f["date"] == d) \
            + sum(p.get("time_taken", 0) for p in practice if p["date"] == d)
        questions = sum(p.get("attempted", 0) for p in practice if p["date"] == d)
        tasks_done = len([x for x in tasks if x["date"] == d and x["status"] == "completed"])
        level = 0 if minutes == 0 and questions == 0 else (1 if minutes < 60 else (2 if minutes < 180 else (3 if minutes < 360 else 4)))
        days.append({"date": d, "minutes": minutes, "questions": questions, "tasks_done": tasks_done, "level": level})
    return days


@api_router.get("/analytics/summary")
async def analytics_summary():
    focus = await all_docs("focus_sessions")
    practice = await all_docs("practice_sessions")
    errors = await all_docs("errors")
    tasks = await all_docs("tasks")
    chapters = await all_docs("chapters")

    act_dates = set(f["date"] for f in focus) | set(p["date"] for p in practice) \
        | set(x["date"] for x in tasks if x["status"] in ("completed", "partial"))
    cur, longest = compute_streaks(act_dates)

    subject_minutes, subject_q = {}, {}
    for f in focus:
        if f.get("subject"):
            subject_minutes[f["subject"]] = subject_minutes.get(f["subject"], 0) + f.get("duration", 0)
    for p in practice:
        s = subject_q.setdefault(p["subject"], {"attempted": 0, "correct": 0, "time": 0})
        s["attempted"] += p.get("attempted", 0)
        s["correct"] += p.get("correct", 0)
        s["time"] += p.get("time_taken", 0)

    error_types = {}
    for e in errors:
        error_types[e["error_type"]] = error_types.get(e["error_type"], 0) + 1

    focus_by_day = []
    for i in range(29, -1, -1):
        d = day_str(-i)
        focus_by_day.append({"date": d[5:], "minutes": sum(f.get("duration", 0) for f in focus if f["date"] == d)})

    # records
    by_day_q, by_day_acc = {}, {}
    for p in practice:
        by_day_q[p["date"]] = by_day_q.get(p["date"], 0) + p.get("attempted", 0)
        a = by_day_acc.setdefault(p["date"], {"a": 0, "c": 0})
        a["a"] += p.get("attempted", 0)
        a["c"] += p.get("correct", 0)
    best_day_questions = max(by_day_q.values()) if by_day_q else 0
    best_accuracy = max((round(v["c"] / v["a"] * 100) for v in by_day_acc.values() if v["a"] >= 10), default=0)
    longest_session = max((f.get("duration", 0) for f in focus), default=0)
    total_q = sum(p.get("attempted", 0) for p in practice)
    total_focus = sum(f.get("duration", 0) for f in focus)

    hour_counts = {}
    for f in focus:
        if f.get("start_time"):
            h = f["start_time"].split(":")[0]
            hour_counts[h] = hour_counts.get(h, 0) + f.get("duration", 0)
    best_hour = max(hour_counts, key=hour_counts.get) if hour_counts else ""

    day_counts = {}
    for d in act_dates:
        mins = sum(f.get("duration", 0) for f in focus if f["date"] == d)
        wd = datetime.strptime(d, "%Y-%m-%d").strftime("%A")
        day_counts[wd] = day_counts.get(wd, 0) + mins
    best_wday = max(day_counts, key=day_counts.get) if day_counts else ""

    last14 = [day_str(-i) for i in range(13, -1, -1)]
    weekly_avg = round(sum(sum(f.get("duration", 0) for f in focus if f["date"] == d) for d in last14) / 2 / 7)

    return {
        "streak": {"current": cur, "longest": longest},
        "subject_minutes": subject_minutes,
        "subject_questions": subject_q,
        "error_types": error_types,
        "focus_by_day": focus_by_day,
        "records": {
            "best_day_questions": best_day_questions,
            "best_accuracy": best_accuracy,
            "longest_session": longest_session,
            "total_questions": total_q,
            "total_focus_minutes": total_focus,
            "errors_mastered": len([e for e in errors if e["status"] == "mastered"]),
            "revisions_done": sum(c.get("stage", 0) for c in await all_docs("revisions")),
        },
        "weekly_avg_minutes": weekly_avg,
        "most_productive_day": best_wday,
        "most_productive_subject": max(subject_minutes, key=subject_minutes.get) if subject_minutes else "",
        "most_productive_hour": f"{best_hour}:00" if best_hour else "",
        "chapter_count": len(chapters),
    }


# ---------------- Export / Import ----------------
@api_router.get("/export")
async def export_all():
    data = {c: await all_docs(c) for c in COLS}
    data["settings"] = [await get_settings()]
    return data


@api_router.post("/import")
async def import_all(payload: Dict[str, Any]):
    for c in COLS + ["settings"]:
        if c in payload and isinstance(payload[c], list):
            await db[c].delete_many({})
            docs = payload[c]
            for d in docs:
                d.pop("_id", None)
            if docs:
                await db[c].insert_many(docs)
    return {"ok": True}


@api_router.delete("/clear-all")
async def clear_all():
    for c in COLS + ["settings"]:
        await db[c].delete_many({})
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "JEE Tracker API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
