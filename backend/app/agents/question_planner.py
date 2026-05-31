"""
Adaptive Question Planner using LangGraph.

This is the core intelligence of InterviewOS. Instead of asking generic questions,
it uses the candidate's knowledge graph to generate deeply personalized questions
that probe actual experience vs resume claims.

Flow:
  Analyze Knowledge Graph → Identify Key Claims → Generate Level-appropriate Question
  → Evaluate Answer → Detect Knowledge Gaps → Adjust Difficulty → Next Question
"""
import json
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import get_settings

settings = get_settings()


class InterviewState(TypedDict):
    candidate_id: str
    knowledge_graph: dict
    interview_type: str
    questions_asked: list[dict]
    current_question: str
    current_difficulty: str  # level_1 to level_4
    last_answer: str
    last_evaluation: dict
    scores: dict
    authenticity_signals: list[dict]
    should_end: bool
    max_questions: int


def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.gemini_api_key,
    )


def analyze_knowledge_graph(state: InterviewState) -> InterviewState:
    """Analyze the knowledge graph to identify key areas to probe."""
    # This node determines what to focus on based on the graph
    kg = state["knowledge_graph"]
    questions_asked = state["questions_asked"]

    # Identify untested areas
    tested_topics = set()
    for qa in questions_asked:
        if "topic" in qa:
            tested_topics.add(qa["topic"])

    state["_untested_areas"] = []

    # Extract project nodes for focused questioning
    nodes = kg.get("nodes", [])
    for node in nodes:
        if node.get("type") in ("project", "skill", "experience"):
            if node.get("label") not in tested_topics:
                state["_untested_areas"] = state.get("_untested_areas", []) + [node]

    return state


async def generate_question(state: InterviewState) -> InterviewState:
    """Generate the next question based on knowledge graph analysis and difficulty level."""
    llm = get_llm()
    kg = state["knowledge_graph"]
    difficulty = state["current_difficulty"]
    questions_asked = state["questions_asked"]
    last_eval = state.get("last_evaluation", {})

    # Build context about what's been asked
    asked_summary = ""
    if questions_asked:
        asked_summary = "Questions already asked:\n"
        for qa in questions_asked[-5:]:  # Last 5 questions for context
            asked_summary += f"- Q: {qa.get('question', '')}\n  A quality: {qa.get('evaluation', {}).get('technical', 'N/A')}/100\n"

    difficulty_instructions = {
        "resume_based": "Ask about something directly mentioned on their resume. Keep it conversational. Example: 'Tell me about your FlipMyBed project.'",
        "deep_dive": "Probe deeper into a specific technical decision. Example: 'Why did you choose MongoDB over PostgreSQL for FlipMyBed?'",
        "cross_question": "Ask about scaling, edge cases, or alternatives. Example: 'How would you scale FlipMyBed to 100k users?'",
        "contradiction_test": "Test a specific claim. If they say they know Spring Boot, ask about @Component vs @Service. If they struggle, their authenticity score should decrease.",
    }

    prompt = f"""You are a senior technical interviewer. Generate ONE interview question for this candidate.

CANDIDATE KNOWLEDGE GRAPH:
{json.dumps(kg, indent=2, default=str)[:3000]}

DIFFICULTY LEVEL: {difficulty}
INSTRUCTION: {difficulty_instructions.get(difficulty, difficulty_instructions["resume_based"])}

{asked_summary}

RULES:
1. Question MUST reference specific details from the candidate's resume/projects/skills
2. Do NOT ask generic questions like "What is REST API?"
3. Instead ask "In your FlipMyBed project, how did you design your REST endpoints for mattress listings?"
4. If last answer was weak (score < 50), slightly reduce difficulty
5. Never repeat a question already asked
6. Return ONLY the question text, nothing else.

Generate the question:"""

    response = await llm.ainvoke(prompt)
    state["current_question"] = response.content.strip()
    return state


async def evaluate_answer(state: InterviewState) -> InterviewState:
    """Evaluate the candidate's answer using multi-dimensional scoring."""
    llm = get_llm()
    question = state["current_question"]
    answer = state["last_answer"]
    kg = state["knowledge_graph"]

    if not answer:
        state["last_evaluation"] = {
            "technical": 0, "clarity": 0, "confidence": 0, "depth": 0
        }
        return state

    prompt = f"""You are a Senior Software Engineer evaluating an interview answer.

QUESTION: {question}
CANDIDATE'S ANSWER: {answer}
CANDIDATE'S RESUME CONTEXT: {json.dumps(kg, default=str)[:2000]}

Evaluate the answer on these dimensions (0-100):
1. technical: Correctness of technical content
2. clarity: How clearly they communicated
3. confidence: Does it sound like they actually did this work?
4. depth: Level of detail and understanding shown

Also provide:
- follow_up_needed: true/false (should we dig deeper?)
- authenticity_signal: "genuine" | "uncertain" | "suspicious" (does the answer match someone who actually built what they claim?)
- topic: What topic/skill was being tested

Return ONLY valid JSON:
{{"technical": 0, "clarity": 0, "confidence": 0, "depth": 0, "follow_up_needed": false, "authenticity_signal": "genuine", "topic": "topic_name"}}"""

    response = await llm.ainvoke(prompt)
    response_text = response.content.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        evaluation = json.loads(response_text)
    except json.JSONDecodeError:
        evaluation = {"technical": 50, "clarity": 50, "confidence": 50, "depth": 50,
                      "follow_up_needed": False, "authenticity_signal": "uncertain", "topic": "unknown"}

    state["last_evaluation"] = evaluation

    # Update running scores
    scores = state.get("scores", {"technical": 0, "communication": 0, "confidence": 0, "depth": 0, "count": 0})
    n = scores.get("count", 0) + 1
    scores["technical"] = ((scores.get("technical", 0) * (n-1)) + evaluation.get("technical", 50)) / n
    scores["communication"] = ((scores.get("communication", 0) * (n-1)) + evaluation.get("clarity", 50)) / n
    scores["confidence"] = ((scores.get("confidence", 0) * (n-1)) + evaluation.get("confidence", 50)) / n
    scores["depth"] = ((scores.get("depth", 0) * (n-1)) + evaluation.get("depth", 50)) / n
    scores["count"] = n
    state["scores"] = scores

    # Track authenticity signals
    if evaluation.get("authenticity_signal") in ("uncertain", "suspicious"):
        state["authenticity_signals"] = state.get("authenticity_signals", []) + [{
            "question": question,
            "signal": evaluation["authenticity_signal"],
            "topic": evaluation.get("topic", "unknown"),
        }]

    # Record Q&A
    state["questions_asked"] = state.get("questions_asked", []) + [{
        "question": question,
        "answer": answer,
        "evaluation": evaluation,
        "difficulty": state["current_difficulty"],
        "topic": evaluation.get("topic", "unknown"),
    }]

    return state


def adjust_difficulty(state: InterviewState) -> InterviewState:
    """Dynamically adjust difficulty based on performance."""
    last_eval = state.get("last_evaluation", {})
    avg_score = (
        last_eval.get("technical", 50) +
        last_eval.get("depth", 50)
    ) / 2

    difficulty_ladder = ["resume_based", "deep_dive", "cross_question", "contradiction_test"]
    current_idx = difficulty_ladder.index(state["current_difficulty"]) if state["current_difficulty"] in difficulty_ladder else 0

    if avg_score >= 75 and current_idx < 3:
        # Candidate is doing well → increase difficulty
        state["current_difficulty"] = difficulty_ladder[current_idx + 1]
    elif avg_score < 40 and current_idx > 0:
        # Candidate is struggling → decrease difficulty
        state["current_difficulty"] = difficulty_ladder[current_idx - 1]

    # Check if interview should end
    if len(state.get("questions_asked", [])) >= state.get("max_questions", 10):
        state["should_end"] = True

    return state


def should_continue(state: InterviewState) -> Literal["generate_question", "end"]:
    """Decide whether to continue the interview or end it."""
    if state.get("should_end", False):
        return "end"
    return "generate_question"


def build_interview_graph() -> StateGraph:
    """Build the LangGraph interview state machine."""
    workflow = StateGraph(InterviewState)

    # Add nodes
    workflow.add_node("analyze_graph", analyze_knowledge_graph)
    workflow.add_node("generate_question", generate_question)
    workflow.add_node("evaluate_answer", evaluate_answer)
    workflow.add_node("adjust_difficulty", adjust_difficulty)

    # Set entry point
    workflow.set_entry_point("analyze_graph")

    # Add edges
    workflow.add_edge("analyze_graph", "generate_question")
    workflow.add_edge("evaluate_answer", "adjust_difficulty")
    workflow.add_conditional_edges(
        "adjust_difficulty",
        should_continue,
        {
            "generate_question": "analyze_graph",
            "end": END,
        }
    )

    return workflow.compile()
