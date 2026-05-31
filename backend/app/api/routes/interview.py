from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from bson import ObjectId
from datetime import datetime
import json

from app.db.mongodb import get_db
from app.models.interview import InterviewCreate, InterviewStatus
from app.agents.question_planner import build_interview_graph, InterviewState
from app.agents.evaluator import evaluate_answer_multi_agent
from app.agents.authenticity import compute_authenticity_score

router = APIRouter()


@router.post("/start")
async def start_interview(data: InterviewCreate):
    """Start a new interview session for a candidate."""
    db = get_db()

    # Verify candidate exists
    try:
        candidate = await db.candidates.find_one({"_id": ObjectId(data.candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Create interview document
    interview_doc = {
        "candidate_id": data.candidate_id,
        "interview_type": data.interview_type.value,
        "status": InterviewStatus.CREATED.value,
        "questions_answers": [],
        "scores": {"technical": 0, "communication": 0, "confidence": 0, "depth": 0, "overall": 0},
        "malpractice": {"tab_switches": 0, "paste_events": 0, "window_blurs": 0, "suspicion_score": 0},
        "authenticity": {},
        "created_at": datetime.utcnow(),
        "completed_at": None,
    }

    result = await db.interviews.insert_one(interview_doc)
    interview_id = str(result.inserted_id)

    # Generate first question using LangGraph
    knowledge_graph = candidate.get("knowledge_graph", {})

    initial_state: InterviewState = {
        "candidate_id": data.candidate_id,
        "knowledge_graph": knowledge_graph,
        "interview_type": data.interview_type.value,
        "questions_asked": [],
        "current_question": "",
        "current_difficulty": "resume_based",
        "last_answer": "",
        "last_evaluation": {},
        "scores": {},
        "authenticity_signals": [],
        "should_end": False,
        "max_questions": 10,
    }

    # Run the graph to get first question
    graph = build_interview_graph()
    result_state = await graph.ainvoke(initial_state)

    first_question = result_state.get("current_question", "Tell me about yourself and your projects.")

    # Update interview status
    await db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {"$set": {
            "status": InterviewStatus.IN_PROGRESS.value,
            "current_state": {
                "current_question": first_question,
                "current_difficulty": "resume_based",
                "questions_asked": [],
            }
        }}
    )

    return {
        "interview_id": interview_id,
        "candidate_id": data.candidate_id,
        "status": "in_progress",
        "question": first_question,
        "difficulty": "resume_based",
        "question_number": 1,
    }


@router.post("/{interview_id}/answer")
async def submit_answer(interview_id: str, body: dict):
    """Submit an answer and get the next question."""
    db = get_db()
    answer = body.get("answer", "")
    response_time = body.get("response_time_seconds", 0)

    if not answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    # Get interview
    try:
        interview = await db.interviews.find_one({"_id": ObjectId(interview_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID")

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview["status"] != InterviewStatus.IN_PROGRESS.value:
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    # Get candidate for context
    candidate = await db.candidates.find_one({"_id": ObjectId(interview["candidate_id"])})
    knowledge_graph = candidate.get("knowledge_graph", {})
    current_state = interview.get("current_state", {})
    current_question = current_state.get("current_question", "")

    # Multi-agent evaluation
    context = json.dumps(knowledge_graph, default=str)[:2000]
    evaluation = await evaluate_answer_multi_agent(current_question, answer, context)

    # Record Q&A
    qa_entry = {
        "question": current_question,
        "answer": answer,
        "difficulty": current_state.get("current_difficulty", "resume_based"),
        "evaluation": evaluation,
        "response_time_seconds": response_time,
        "timestamp": datetime.utcnow(),
    }

    questions_asked = interview.get("questions_answers", []) + [qa_entry]

    # Check if we should end (max 10 questions)
    if len(questions_asked) >= 10:
        # Compute final scores and authenticity
        authenticity = await compute_authenticity_score(
            questions_asked, knowledge_graph, interview.get("malpractice", {})
        )

        # Calculate final scores
        total_tech = sum(qa.get("evaluation", {}).get("technical_score", 50) for qa in questions_asked)
        total_comm = sum(qa.get("evaluation", {}).get("communication_score", 50) for qa in questions_asked)
        n = len(questions_asked)

        final_scores = {
            "technical": round(total_tech / n, 1),
            "communication": round(total_comm / n, 1),
            "authenticity": authenticity.get("authenticity_score", 50),
            "overall": round((total_tech / n * 0.5 + total_comm / n * 0.3 + authenticity.get("authenticity_score", 50) * 0.2), 1),
        }

        await db.interviews.update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": {
                "status": InterviewStatus.COMPLETED.value,
                "questions_answers": questions_asked,
                "scores": final_scores,
                "authenticity": authenticity,
                "completed_at": datetime.utcnow(),
            }}
        )

        return {
            "interview_id": interview_id,
            "status": "completed",
            "evaluation": evaluation,
            "final_scores": final_scores,
            "authenticity": authenticity,
            "question_number": len(questions_asked),
            "message": "Interview completed. View the full report.",
        }

    # Generate next question using LangGraph
    state: InterviewState = {
        "candidate_id": interview["candidate_id"],
        "knowledge_graph": knowledge_graph,
        "interview_type": interview["interview_type"],
        "questions_asked": [{"question": qa["question"], "answer": qa["answer"],
                             "evaluation": qa.get("evaluation", {}), "difficulty": qa.get("difficulty", ""),
                             "topic": qa.get("evaluation", {}).get("topic", "")} for qa in questions_asked],
        "current_question": current_question,
        "current_difficulty": current_state.get("current_difficulty", "resume_based"),
        "last_answer": answer,
        "last_evaluation": evaluation,
        "scores": interview.get("scores", {}),
        "authenticity_signals": [],
        "should_end": False,
        "max_questions": 10,
    }

    graph = build_interview_graph()
    new_state = await graph.ainvoke(state)

    next_question = new_state.get("current_question", "Can you elaborate further?")
    next_difficulty = new_state.get("current_difficulty", "resume_based")

    # Update interview state
    await db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {"$set": {
            "questions_answers": questions_asked,
            "current_state": {
                "current_question": next_question,
                "current_difficulty": next_difficulty,
            }
        }}
    )

    return {
        "interview_id": interview_id,
        "status": "in_progress",
        "evaluation": evaluation,
        "next_question": next_question,
        "difficulty": next_difficulty,
        "question_number": len(questions_asked) + 1,
        "questions_remaining": 10 - len(questions_asked),
    }


@router.post("/{interview_id}/malpractice")
async def report_malpractice_event(interview_id: str, body: dict):
    """Report a malpractice event (tab switch, paste, blur, etc.)."""
    db = get_db()
    event_type = body.get("event_type", "")
    timestamp = body.get("timestamp", datetime.utcnow().isoformat())

    valid_events = {"tab_switch", "paste", "window_blur", "keystroke_anomaly"}
    if event_type not in valid_events:
        raise HTTPException(status_code=400, detail=f"Invalid event type. Must be one of: {valid_events}")

    # Increment the counter
    field_map = {
        "tab_switch": "malpractice.tab_switches",
        "paste": "malpractice.paste_events",
        "window_blur": "malpractice.window_blurs",
        "keystroke_anomaly": "malpractice.keystroke_anomalies",
    }

    await db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {
            "$inc": {field_map[event_type]: 1},
            "$push": {"malpractice_log": {"event": event_type, "timestamp": timestamp}},
        }
    )

    # Recalculate suspicion score
    interview = await db.interviews.find_one({"_id": ObjectId(interview_id)})
    malpractice = interview.get("malpractice", {})
    suspicion = (
        malpractice.get("tab_switches", 0) * 10 +
        malpractice.get("paste_events", 0) * 15 +
        malpractice.get("window_blurs", 0) * 5 +
        malpractice.get("keystroke_anomalies", 0) * 8
    )
    suspicion = min(suspicion, 100)

    await db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {"$set": {"malpractice.suspicion_score": suspicion}}
    )

    return {"recorded": True, "suspicion_score": suspicion}


@router.get("/{interview_id}")
async def get_interview(interview_id: str):
    """Get interview details and current state."""
    db = get_db()
    try:
        interview = await db.interviews.find_one({"_id": ObjectId(interview_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID")

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview["id"] = str(interview.pop("_id"))
    return interview


@router.get("/{interview_id}/report")
async def get_interview_report(interview_id: str):
    """Get the final interview report."""
    db = get_db()
    try:
        interview = await db.interviews.find_one({"_id": ObjectId(interview_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID")

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview["status"] != InterviewStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Interview not yet completed")

    # Build report
    scores = interview.get("scores", {})
    authenticity = interview.get("authenticity", {})
    malpractice = interview.get("malpractice", {})
    questions_answers = interview.get("questions_answers", [])

    report = {
        "interview_id": interview_id,
        "candidate_id": interview["candidate_id"],
        "interview_type": interview["interview_type"],
        "overall_score": scores.get("overall", 0),
        "scores": scores,
        "authenticity": authenticity,
        "malpractice": malpractice,
        "strong_areas": authenticity.get("genuine_areas", []),
        "weak_areas": authenticity.get("suspicious_areas", []),
        "total_questions": len(questions_answers),
        "hiring_recommendation": _get_recommendation(scores.get("overall", 0)),
        "completed_at": interview.get("completed_at"),
    }

    return report


def _get_recommendation(overall_score: float) -> str:
    if overall_score >= 85:
        return "Strong Hire"
    elif overall_score >= 70:
        return "Hire"
    elif overall_score >= 55:
        return "Lean Hire"
    elif overall_score >= 40:
        return "Lean No Hire"
    else:
        return "No Hire"
