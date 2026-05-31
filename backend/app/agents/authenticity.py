"""
Authenticity Engine.

Computes an authenticity score by cross-referencing:
1. Resume claims vs. answer depth
2. Consistency across related questions
3. Response patterns (timing, confidence drops)

This is NOT about catching cheaters — it's about verifying
that someone actually built what they claim on their resume.
"""
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import get_settings

settings = get_settings()


async def compute_authenticity_score(
    questions_answers: list[dict],
    knowledge_graph: dict,
    malpractice_signals: dict = None,
) -> dict:
    """
    Compute an authenticity score based on interview performance vs resume claims.
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.gemini_api_key,
    )

    # Build Q&A summary
    qa_summary = ""
    for qa in questions_answers:
        qa_summary += f"Q: {qa.get('question', '')}\n"
        qa_summary += f"A: {qa.get('answer', '')[:200]}\n"
        qa_summary += f"Technical Score: {qa.get('evaluation', {}).get('technical', 'N/A')}\n\n"

    prompt = f"""You are an interview authenticity assessor. Your job is to determine
if the candidate actually has the experience they claim on their resume.

RESUME KNOWLEDGE GRAPH (what they claim):
{json.dumps(knowledge_graph, default=str)[:2000]}

INTERVIEW Q&A (how they performed):
{qa_summary[:3000]}

MALPRACTICE SIGNALS: {json.dumps(malpractice_signals or {}, default=str)}

Analyze:
1. Do their answers demonstrate genuine hands-on experience with claimed technologies?
2. Are there inconsistencies between claims and demonstrated knowledge?
3. Did they struggle with topics that should be basic given their claimed experience?

Return JSON:
{{
  "authenticity_score": 0-100,
  "confidence_in_assessment": 0-100,
  "genuine_areas": ["skill1", "skill2"],
  "suspicious_areas": ["skill3"],
  "reasoning": "brief explanation",
  "recommendation": "genuine" | "needs_verification" | "likely_exaggerated"
}}"""

    response = await llm.ainvoke(prompt)
    text = response.content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "authenticity_score": 50,
            "confidence_in_assessment": 30,
            "genuine_areas": [],
            "suspicious_areas": [],
            "reasoning": "Unable to assess",
            "recommendation": "needs_verification"
        }
