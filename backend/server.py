from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field, ConfigDict

from motor.motor_asyncio import AsyncIOMotorClient

from datetime import datetime, timezone

from dotenv import load_dotenv

import os
import uuid


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

if not MONGO_URL:
    raise RuntimeError(
        "MONGO_URL is not set. Please add MONGO_URL to your .env file."
    )


# ============================================================
# MONGODB CONNECTION
# ============================================================

client = AsyncIOMotorClient(MONGO_URL)

# Database name
db = client["jee_apex_tracker"]


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="JEE Apex Tracker API",
    description="Backend API for JEE Apex Tracker",
    version="1.0.0"
)

api_router = APIRouter()


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROOT
# ============================================================

@api_router.get("/")
async def root():
    return {
        "message": "JEE Apex Tracker API",
        "status": "running"
    }


# ============================================================
# DATABASE HEALTH CHECK
# ============================================================

@api_router.get("/health")
async def health_check():
    try:
        await client.admin.command("ping")

        return {
            "status": "ok",
            "database": "jee_apex_tracker",
            "mongodb": "connected"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"MongoDB connection failed: {str(e)}"
        )


# ============================================================
# ITEM MODEL
# ============================================================

class Item(BaseModel):

    model_config = ConfigDict(extra="ignore")

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4())
    )

    title: str = ""
    subject: str = ""
    notes: str = ""

    date: str = ""
    time: str = ""
    day: str = ""

    start: str = ""
    end: str = ""

    kind: str = ""

    completed: bool = False
    archived: bool = False
    reminder: bool = False

    mistake: str = ""
    concept: str = ""

    created_at: str = Field(
        default_factory=lambda: datetime.now(
            timezone.utc
        ).isoformat()
    )


# ============================================================
# ALLOWED COLLECTIONS
# ============================================================

COLLECTIONS = {
    "exams",
    "timetable",
    "tasks",
    "syllabus",
    "errors",
    "extras"
}


# ============================================================
# CLEAN OLD/EXPIRED EXAMS
# ============================================================

async def clean_archives():

    today = datetime.now(
        timezone.utc
    ).date().isoformat()

    exams = await db["exams"].find(
        {"archived": False},
        {"_id": 0}
    ).to_list(100)

    for exam in exams:

        exam_date = exam.get("date")

        if exam_date and exam_date <= today:

            exam_id = exam.get("id")

            if not exam_id:
                continue

            # Archive the exam
            await db["exams"].update_one(
                {"id": exam_id},
                {
                    "$set": {
                        "archived": True
                    }
                }
            )

            # Archive related items
            for name in [
                "timetable",
                "tasks",
                "syllabus",
                "errors",
                "extras"
            ]:

                await db[name].update_many(
                    {"exam_id": exam_id},
                    {
                        "$set": {
                            "archived": True
                        }
                    }
                )


# ============================================================
# GET ALL ACTIVE ITEMS FROM A COLLECTION
# ============================================================

async def all_items(name: str):

    return await db[name].find(
        {"archived": False},
        {"_id": 0}
    ).sort(
        "created_at",
        -1
    ).to_list(500)


# ============================================================
# DASHBOARD
# ============================================================

@api_router.get("/dashboard")
async def dashboard():

    await clean_archives()

    data = {}

    for name in COLLECTIONS:
        data[name] = await all_items(name)

    # Archived exams
    data["archives"] = await db["exams"].find(
        {"archived": True},
        {"_id": 0}
    ).sort(
        "date",
        -1
    ).to_list(100)

    return data


# ============================================================
# GET ITEMS FROM ONE COLLECTION
# ============================================================

@api_router.get("/{collection}")
async def get_collection(collection: str):

    if collection not in COLLECTIONS:
        raise HTTPException(
            status_code=404,
            detail="Unknown collection"
        )

    return await all_items(collection)


# ============================================================
# CREATE ITEM
# ============================================================

@api_router.post("/{collection}")
async def create_item(
    collection: str,
    item: Item
):

    if collection not in COLLECTIONS:
        raise HTTPException(
            status_code=404,
            detail="Unknown collection"
        )

    doc = item.model_dump()

    await db[collection].insert_one(doc)

    doc.pop("_id", None)

    return doc


# ============================================================
# UPDATE ITEM
# ============================================================

@api_router.patch("/{collection}/{item_id}")
async def update_item(
    collection: str,
    item_id: str,
    changes: dict
):

    if collection not in COLLECTIONS:
        raise HTTPException(
            status_code=404,
            detail="Unknown collection"
        )

    changes.pop("_id", None)

    result = await db[collection].update_one(
        {"id": item_id},
        {
            "$set": changes
        }
    )

    if result.matched_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )

    doc = await db[collection].find_one(
        {"id": item_id},
        {"_id": 0}
    )

    return doc


# ============================================================
# DELETE ITEM
# ============================================================

@api_router.delete("/{collection}/{item_id}")
async def delete_item(
    collection: str,
    item_id: str
):

    if collection not in COLLECTIONS:
        raise HTTPException(
            status_code=404,
            detail="Unknown collection"
        )

    result = await db[collection].delete_one(
        {"id": item_id}
    )

    if result.deleted_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )

    return {
        "ok": True,
        "message": "Item deleted successfully"
    }


# ============================================================
# REGISTER ROUTER
# ============================================================

app.include_router(api_router, prefix="/api")


# ============================================================
# STARTUP / SHUTDOWN
# ============================================================

@app.on_event("startup")
async def startup_event():

    try:
        await client.admin.command("ping")

        print("======================================")
        print(" JEE Apex Tracker Backend")
        print("======================================")
        print("MongoDB: Connected")
        print("Database: jee_apex_tracker")
        print("======================================")

    except Exception as e:

        print("======================================")
        print("MongoDB connection failed!")
        print(str(e))
        print("======================================")


@app.on_event("shutdown")
async def shutdown_event():

    client.close()

    print("MongoDB connection closed.")