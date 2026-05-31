from google import genai
from app.config import get_settings
from app.db.mongodb import get_db

settings = get_settings()


async def generate_embedding(text: str) -> list[float]:
    """Generate embedding using Gemini Embedding model."""
    client = genai.Client(api_key=settings.gemini_api_key)

    response = client.models.embed_content(
        model="gemini-embedding-exp-03-07",
        contents=text,
    )

    return response.embeddings[0].values


async def store_candidate_embeddings(candidate_id: str, profile_data: dict):
    """
    Generate and store embeddings for different aspects of a candidate's profile.
    This enables semantic search: "find candidates with MERN experience"
    and powers the RAG pipeline for question generation.
    """
    db = get_db()
    chunks = []

    # Chunk 1: Overall summary
    summary_text = f"{profile_data.get('name', '')}. {profile_data.get('summary', '')}"
    if summary_text.strip(". "):
        chunks.append({
            "candidate_id": candidate_id,
            "chunk_type": "summary",
            "text": summary_text,
        })

    # Chunk 2: Skills
    skills = profile_data.get("skills", [])
    if skills:
        skill_names = [s["name"] if isinstance(s, dict) else s.name for s in skills]
        skills_text = f"Skills: {', '.join(skill_names)}"
        chunks.append({
            "candidate_id": candidate_id,
            "chunk_type": "skills",
            "text": skills_text,
        })

    # Chunk 3: Each project gets its own embedding (for targeted questioning)
    projects = profile_data.get("projects", [])
    for project in projects:
        if isinstance(project, dict):
            name = project.get("name", "")
            desc = project.get("description", "")
            techs = [t.get("name", "") if isinstance(t, dict) else t.name
                     for t in project.get("technologies", [])]
            highlights = project.get("highlights", [])
        else:
            name = project.name
            desc = project.description
            techs = [t.name for t in project.technologies]
            highlights = project.highlights

        project_text = f"Project: {name}. {desc}. Technologies: {', '.join(techs)}. Achievements: {'; '.join(highlights)}"
        chunks.append({
            "candidate_id": candidate_id,
            "chunk_type": "project",
            "text": project_text,
        })

    # Chunk 4: Each experience entry
    experiences = profile_data.get("experience", [])
    for exp in experiences:
        if isinstance(exp, dict):
            company = exp.get("company", "")
            role = exp.get("role", "")
            desc = exp.get("description", "")
            techs = exp.get("technologies", [])
        else:
            company = exp.company
            role = exp.role
            desc = exp.description
            techs = exp.technologies

        exp_text = f"Experience: {role} at {company}. {desc}. Technologies: {', '.join(techs)}"
        chunks.append({
            "candidate_id": candidate_id,
            "chunk_type": "experience",
            "text": exp_text,
        })

    # Generate embeddings and store
    for chunk in chunks:
        embedding = await generate_embedding(chunk["text"])
        chunk["embedding"] = embedding
        await db.candidate_embeddings.insert_one(chunk)

    return len(chunks)


async def search_similar_candidates(query: str, limit: int = 5) -> list[dict]:
    """
    Semantic search across candidates using vector similarity.
    For MongoDB Atlas, uses $vectorSearch. For local, falls back to basic text search.
    """
    db = get_db()
    query_embedding = await generate_embedding(query)

    try:
        # Try Atlas Vector Search
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "candidate_embeddings",
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": limit * 10,
                    "limit": limit,
                }
            },
            {
                "$project": {
                    "candidate_id": 1,
                    "chunk_type": 1,
                    "text": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            }
        ]
        results = await db.candidate_embeddings.aggregate(pipeline).to_list(limit)
        return results
    except Exception:
        # Fallback: basic text search for local MongoDB
        results = await db.candidate_embeddings.find(
            {"$text": {"$search": query}},
            {"score": {"$meta": "textScore"}, "candidate_id": 1, "chunk_type": 1, "text": 1}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(limit)
        return results
