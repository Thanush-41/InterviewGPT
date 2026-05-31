"""
Multi-Agent Answer Evaluation System.

Instead of one LLM evaluating everything, we use specialized evaluators:
- Technical Reviewer: Evaluates correctness
- Communication Reviewer: Evaluates clarity and structure
- Aggregator: Combines scores with weighting
"""
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import get_settings

settings = get_settings()


def _get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.gemini_api_key,
    )


async def technical_review(question: str, answer: str, context: str) -> dict:
    """Technical Reviewer Agent - evaluates correctness and depth."""
    llm = _get_llm()
    prompt = f"""You are a Senior Software Engineer reviewing a technical interview answer.

QUESTION: {question}
ANSWER: {answer}
CONTEXT (candidate background): {context[:1000]}

Evaluate ONLY technical aspects:
1. correctness (0-100): Is the answer factually correct?
2. depth (0-100): Does it show deep understanding or just surface knowledge?
3. completeness (0-100): Did they cover all important aspects?
4. examples (0-100): Did they provide concrete examples?

Return ONLY JSON: {{"correctness": 0, "depth": 0, "completeness": 0, "examples": 0, "technical_notes": "brief note"}}"""

    response = await llm.ainvoke(prompt)
    text = response.content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"correctness": 50, "depth": 50, "completeness": 50, "examples": 50, "technical_notes": "parse error"}


async def communication_review(question: str, answer: str) -> dict:
    """Communication Reviewer Agent - evaluates clarity and structure."""
    llm = _get_llm()
    prompt = f"""You are an interview communication coach evaluating answer delivery.

QUESTION: {question}
ANSWER: {answer}

Evaluate ONLY communication aspects:
1. clarity (0-100): How clearly was the answer communicated?
2. structure (0-100): Was the answer well-organized (intro, body, conclusion)?
3. conciseness (0-100): Was it appropriately concise without being too brief?
4. confidence (0-100): Does the tone suggest confidence and ownership?

Return ONLY JSON: {{"clarity": 0, "structure": 0, "conciseness": 0, "confidence": 0, "communication_notes": "brief note"}}"""

    response = await llm.ainvoke(prompt)
    text = response.content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"clarity": 50, "structure": 50, "conciseness": 50, "confidence": 50, "communication_notes": "parse error"}


async def aggregate_evaluation(technical: dict, communication: dict) -> dict:
    """Aggregator Agent - combines all evaluator scores with weighting."""
    # Weighted aggregation
    tech_score = (
        technical.get("correctness", 50) * 0.4 +
        technical.get("depth", 50) * 0.3 +
        technical.get("completeness", 50) * 0.2 +
        technical.get("examples", 50) * 0.1
    )

    comm_score = (
        communication.get("clarity", 50) * 0.35 +
        communication.get("structure", 50) * 0.25 +
        communication.get("conciseness", 50) * 0.2 +
        communication.get("confidence", 50) * 0.2
    )

    overall = tech_score * 0.6 + comm_score * 0.4

    return {
        "technical_score": round(tech_score, 1),
        "communication_score": round(comm_score, 1),
        "overall_score": round(overall, 1),
        "technical_details": technical,
        "communication_details": communication,
    }


async def evaluate_answer_multi_agent(question: str, answer: str, context: str = "") -> dict:
    """Run the full multi-agent evaluation pipeline."""
    # Run technical and communication reviews in parallel conceptually
    # (FastAPI will handle async concurrency)
    technical = await technical_review(question, answer, context)
    communication = await communication_review(question, answer)
    aggregated = await aggregate_evaluation(technical, communication)
    return aggregated
