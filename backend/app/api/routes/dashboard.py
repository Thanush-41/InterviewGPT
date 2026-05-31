from fastapi import APIRouter
from bson import ObjectId
from datetime import datetime, timedelta

from app.db.mongodb import get_db

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats():
    """Get overall platform statistics."""
    db = get_db()

    total_candidates = await db.candidates.count_documents({})
    total_interviews = await db.interviews.count_documents({})
    completed_interviews = await db.interviews.count_documents({"status": "completed"})
    in_progress = await db.interviews.count_documents({"status": "in_progress"})

    # Average scores from completed interviews
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {
            "_id": None,
            "avg_technical": {"$avg": "$scores.technical"},
            "avg_communication": {"$avg": "$scores.communication"},
            "avg_overall": {"$avg": "$scores.overall"},
            "avg_authenticity": {"$avg": "$scores.authenticity"},
        }}
    ]
    stats = await db.interviews.aggregate(pipeline).to_list(1)
    avg_scores = stats[0] if stats else {}

    # Pass rate (overall >= 70)
    passed = await db.interviews.count_documents({"status": "completed", "scores.overall": {"$gte": 70}})
    pass_rate = (passed / completed_interviews * 100) if completed_interviews > 0 else 0

    return {
        "total_candidates": total_candidates,
        "total_interviews": total_interviews,
        "completed_interviews": completed_interviews,
        "in_progress_interviews": in_progress,
        "pass_rate": round(pass_rate, 1),
        "average_scores": {
            "technical": round(avg_scores.get("avg_technical", 0), 1),
            "communication": round(avg_scores.get("avg_communication", 0), 1),
            "overall": round(avg_scores.get("avg_overall", 0), 1),
            "authenticity": round(avg_scores.get("avg_authenticity", 0), 1),
        }
    }


@router.get("/recent-interviews")
async def get_recent_interviews():
    """Get recent interviews with candidate info."""
    db = get_db()

    interviews = await db.interviews.find(
        {},
        {"candidate_id": 1, "interview_type": 1, "status": 1, "scores": 1, "created_at": 1, "completed_at": 1}
    ).sort("created_at", -1).limit(20).to_list(20)

    # Enrich with candidate names
    for interview in interviews:
        interview["id"] = str(interview.pop("_id"))
        try:
            candidate = await db.candidates.find_one(
                {"_id": ObjectId(interview["candidate_id"])},
                {"name": 1}
            )
            interview["candidate_name"] = candidate.get("name", "Unknown") if candidate else "Unknown"
        except Exception:
            interview["candidate_name"] = "Unknown"

    return {"interviews": interviews}


@router.get("/live")
async def get_live_interviews():
    """Get currently active interviews for live monitoring."""
    db = get_db()

    interviews = await db.interviews.find(
        {"status": "in_progress"},
        {"candidate_id": 1, "interview_type": 1, "current_state": 1, "malpractice": 1, "questions_answers": 1}
    ).to_list(50)

    live_data = []
    for interview in interviews:
        candidate = await db.candidates.find_one(
            {"_id": ObjectId(interview["candidate_id"])},
            {"name": 1}
        )
        qa_count = len(interview.get("questions_answers", []))
        live_data.append({
            "id": str(interview["_id"]),
            "candidate_name": candidate.get("name", "Unknown") if candidate else "Unknown",
            "interview_type": interview["interview_type"],
            "current_question": interview.get("current_state", {}).get("current_question", ""),
            "questions_answered": qa_count,
            "suspicion_score": interview.get("malpractice", {}).get("suspicion_score", 0),
        })

    return {"live_interviews": live_data}
