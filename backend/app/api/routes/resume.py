from fastapi import APIRouter, UploadFile, File, HTTPException
from bson import ObjectId
from pymongo import ReturnDocument
from datetime import datetime

from app.db.mongodb import get_db
from app.services.resume_parser import extract_text_from_pdf, parse_resume_with_llm
from app.services.knowledge_graph import build_knowledge_graph
from app.services.embeddings import store_candidate_embeddings

router = APIRouter()


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a resume PDF → Parse → Build Knowledge Graph → Store Embeddings.
    Returns the candidate profile and knowledge graph.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    if file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Read file
    file_bytes = await file.read()

    # Extract text from PDF
    resume_text = extract_text_from_pdf(file_bytes)
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    # Parse with LLM
    profile = await parse_resume_with_llm(resume_text)

    # Store candidate in MongoDB (upsert by email to handle re-uploads)
    db = get_db()
    candidate_doc = {
        "name": profile.name,
        "email": profile.email,
        "phone": profile.phone,
        "profile": profile.model_dump(),
        "updated_at": datetime.utcnow(),
    }

    if profile.email:
        result = await db.candidates.find_one_and_update(
            {"email": profile.email},
            {"$set": candidate_doc, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        candidate_id = str(result["_id"])
    else:
        candidate_doc["created_at"] = datetime.utcnow()
        insert_result = await db.candidates.insert_one(candidate_doc)
        candidate_id = str(insert_result.inserted_id)

    # Build knowledge graph
    knowledge_graph = build_knowledge_graph(candidate_id, profile)
    kg_dict = knowledge_graph.model_dump()

    # Store knowledge graph
    await db.candidates.update_one(
        {"_id": ObjectId(candidate_id)},
        {"$set": {"knowledge_graph": kg_dict}}
    )

    # Generate and store embeddings (async, non-blocking for response)
    try:
        num_embeddings = await store_candidate_embeddings(candidate_id, profile.model_dump())
    except Exception:
        num_embeddings = 0  # Non-critical: embeddings can be generated later

    return {
        "candidate_id": candidate_id,
        "name": profile.name,
        "profile": profile.model_dump(),
        "knowledge_graph": kg_dict,
        "embeddings_stored": num_embeddings,
    }


@router.get("/candidates")
async def list_candidates():
    """List all candidates."""
    db = get_db()
    candidates = await db.candidates.find(
        {},
        {"name": 1, "email": 1, "profile.summary": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(100)

    for c in candidates:
        c["id"] = str(c.pop("_id"))

    return {"candidates": candidates}


@router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str):
    """Get a single candidate with full profile and knowledge graph."""
    db = get_db()
    try:
        candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate["id"] = str(candidate.pop("_id"))
    return candidate


@router.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str):
    """Delete a candidate and their embeddings."""
    db = get_db()
    try:
        result = await db.candidates.delete_one({"_id": ObjectId(candidate_id)})
        await db.candidate_embeddings.delete_many({"candidate_id": candidate_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid candidate ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return {"deleted": True}
