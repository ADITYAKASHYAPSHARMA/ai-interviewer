"""
J.A.R.V.I.S. (Just A Rather Very Intelligent System)
Autonomous Technical Interviewer & Career Intelligence Engine.
Supports Groq, Google Gemini, OpenAI, and a Calibrated Deterministic Heuristic Fallback Scorer.
"""

import os
import re
import json
import uuid
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict
from dotenv import load_dotenv

load_dotenv()
# Map OpenAI typo if present in .env
if "OPENNAI_API_KEY" in os.environ and "OPENAI_API_KEY" not in os.environ:
    os.environ["OPENAI_API_KEY"] = os.environ["OPENNAI_API_KEY"]

SESSIONS_CACHE_DIR = Path("/tmp/jarvis_sessions")
SESSIONS_CACHE_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class InterviewMessage:
    role: str  # 'interviewer' | 'candidate' | 'system'
    content: str
    question_index: int
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class InterviewSession:
    id: str
    candidate_name: str
    role: str
    level: str  # 'Junior', 'Mid-Level', 'Senior', 'Lead / Staff'
    persona: str  # 'J.A.R.V.I.S. Protocol', 'FAANG Bar Raiser', 'Startup CTO', 'Staff Architect'
    total_questions: int
    current_question_index: int
    status: str  # 'in_progress', 'completed'
    history: List[InterviewMessage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    evaluation: Optional[Dict[str, Any]] = None


# Preset Roles & Career Tracks
AVAILABLE_ROLES = [
    {
        "id": "fullstack",
        "title": "Full-Stack Engineer",
        "category": "Engineering",
        "description": "React, Node.js, REST/GraphQL APIs, Databases, and Architecture.",
        "icon": "⚡"
    },
    {
        "id": "backend",
        "title": "Backend Systems Engineer",
        "category": "Engineering",
        "description": "Distributed systems, concurrency, databases, microservices, and system design.",
        "icon": "🛠️"
    },
    {
        "id": "frontend",
        "title": "Frontend Architect / UI Engineer",
        "category": "Engineering",
        "description": "Modern JS/TS, React/Next.js, performance optimization, CSS/DOM, and accessibility.",
        "icon": "🎨"
    },
    {
        "id": "aiml",
        "title": "AI / ML & LLM Engineer",
        "category": "AI & Data",
        "description": "RAG systems, embeddings, LangChain/LlamaIndex, model fine-tuning, and LLM evaluation.",
        "icon": "🧠"
    },
    {
        "id": "datascience",
        "title": "Data Scientist & Analytics",
        "category": "AI & Data",
        "description": "Statistical modeling, Python/Pandas, SQL pipelines, and experimental design.",
        "icon": "📊"
    },
    {
        "id": "devops",
        "title": "DevOps & Cloud Architect",
        "category": "Infrastructure",
        "description": "Kubernetes, CI/CD, AWS/GCP, Docker, Terraform, and Observability.",
        "icon": "☁️"
    },
    {
        "id": "pm",
        "title": "Technical Product Manager",
        "category": "Product",
        "description": "Product strategy, roadmap prioritization, user metrics, and agile execution.",
        "icon": "🚀"
    },
    {
        "id": "behavioral",
        "title": "Behavioral & Leadership (STAR)",
        "category": "General",
        "description": "Conflict resolution, leadership, failure recovery, and cross-functional impact.",
        "icon": "🤝"
    }
]

# High-Tech J.A.R.V.I.S. Persona Protocols
AVAILABLE_PERSONAS = [
    {
        "id": "jarvis",
        "name": "J.A.R.V.I.S. Protocol",
        "tagline": "Autonomous AI Assessor — Uncompromising technical rigor, sharp analysis, precise calibration.",
        "tone": "Ultra-intelligent, polite yet exacting, deeply analytical, verifies technical accuracy and system trade-offs."
    },
    {
        "id": "faang",
        "name": "FAANG Bar Raiser",
        "tagline": "Rigorous, deep-dives into edge cases, scalability, and optimal complexity.",
        "tone": "Formal, highly analytical, sharp, challenges assumptions, focuses on scale, latency, and failure modes."
    },
    {
        "id": "tech_lead",
        "name": "Staff Architect Protocol",
        "tagline": "Balanced between code craftsmanship, architecture, and team collaboration.",
        "tone": "Collaborative, practical, values clean architecture, boundary isolation, maintainability, and clear communication."
    },
    {
        "id": "startup_cto",
        "name": "Startup CTO Protocol",
        "tagline": "Pragmatic, fast-paced, values speed of execution, trade-offs, and practical design.",
        "tone": "Pragmatic, fast-paced, direct, probing real-world production incidents, shipping velocity, and fault recovery."
    }
]


def detect_response_quality(text: str) -> Dict[str, Any]:
    """Deterministically detects gibberish, non-answers, keyboard smashing, or shallow responses."""
    cleaned = text.strip()
    words = cleaned.split()
    word_count = len(words)

    # 1. Empty or virtually empty
    if word_count == 0 or len(cleaned) < 3:
        return {"category": "empty", "is_substantive": False, "reason": "Empty or single character response"}

    # 2. Known non-answers / evasive expressions
    evasive_patterns = [
        r"^(idk|i don'?t know|no idea|skip|pass|dunno|nothing|next|potato|banana|apple|asdf|qwerty)\b",
        r"^i (have )?no clue\b",
        r"^just (restart|reboot)( computer)?\b",
        r"^(lol|haha|whatever|nah|nope)$"
    ]
    for pattern in evasive_patterns:
        if re.search(pattern, cleaned, re.IGNORECASE):
            return {"category": "evasive", "is_substantive": False, "reason": "Candidate provided an evasive non-answer"}

    # 3. Repeated character smashing (e.g. asdfghjk, aaaaa, loolooloo)
    if re.search(r"(.)\1{4,}", cleaned):
        return {"category": "gibberish", "is_substantive": False, "reason": "Repeated character smashing detected"}

    # 4. Low vowel ratio / keyboard mash test on long words
    long_words = [w for w in words if len(w) > 5]
    if long_words:
        unusual_words = 0
        for w in long_words:
            vowels = len(re.findall(r"[aeiouyAEIOUY]", w))
            if vowels == 0 or (len(w) > 7 and vowels / len(w) < 0.15):
                unusual_words += 1
        if unusual_words >= len(long_words) / 2 and len(long_words) >= 1:
            return {"category": "gibberish", "is_substantive": False, "reason": "Phonetically incoherent character sequence"}

    # 5. Very short responses (< 6 words) without technical substance
    if word_count < 6:
        return {"category": "shallow", "is_substantive": False, "reason": "Answer is less than 6 words; lacks technical explanation"}

    return {"category": "substantive", "is_substantive": True, "reason": "Candidate provided a structured text response"}


class InterviewAgent:
    """Orchestrates the J.A.R.V.I.S. AI Interviewer lifecycle with rigorous accuracy calibration."""

    def __init__(self):
        self.sessions: Dict[str, InterviewSession] = {}
        self.active_provider = self._determine_provider()

    def _determine_provider(self) -> str:
        if os.getenv("GROQ_API_KEY"):
            return "Groq (qwen3.8-27b / gpt-oss-120b)"
        elif os.getenv("GOOGLE_API_KEY"):
            return "Google Gemini (gemini-2.5-flash)"
        elif os.getenv("OPENAI_API_KEY"):
            return "OpenAI (gpt-4o-mini)"
        return "J.A.R.V.I.S. Heuristic Engine (Calibrated Local)"

    def _get_llm(self, temperature: float = 0.5):
        """Returns the best available LLM with automatic fallback chain."""
        # 1. Try Groq (Ultra-fast inference)
        if os.getenv("GROQ_API_KEY"):
            try:
                from langchain_groq import ChatGroq
                for model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
                    try:
                        return ChatGroq(model=model, temperature=temperature, max_retries=2)
                    except Exception:
                        continue
            except Exception:
                pass

        # 2. Try Google Gemini
        if os.getenv("GOOGLE_API_KEY"):
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                for model in ["gemini-2.5-flash", "gemini-1.5-flash-latest"]:
                    try:
                        return ChatGoogleGenerativeAI(model=model, temperature=temperature, max_retries=2)
                    except Exception:
                        continue
            except Exception:
                pass

        # 3. Try OpenAI
        if os.getenv("OPENAI_API_KEY"):
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(model="gpt-4o-mini", temperature=temperature, max_retries=2)
            except Exception:
                pass

        return None

    def _save_session_to_disk(self, session: InterviewSession):
        """Persists session to /tmp for resilient serverless execution across lambdas."""
        try:
            filepath = SESSIONS_CACHE_DIR / f"{session.id}.json"
            data = {
                "id": session.id,
                "candidate_name": session.candidate_name,
                "role": session.role,
                "level": session.level,
                "persona": session.persona,
                "total_questions": session.total_questions,
                "current_question_index": session.current_question_index,
                "status": session.status,
                "created_at": session.created_at,
                "evaluation": session.evaluation,
                "history": [
                    {
                        "role": m.role,
                        "content": m.content,
                        "question_index": m.question_index,
                        "timestamp": m.timestamp,
                        "metadata": m.metadata
                    }
                    for m in session.history
                ]
            }
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"Warning: Failed to persist session {session.id} to disk: {e}")

    def _load_session_from_disk(self, session_id: str) -> Optional[InterviewSession]:
        """Loads session from /tmp if not in memory."""
        try:
            filepath = SESSIONS_CACHE_DIR / f"{session_id}.json"
            if filepath.exists():
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                session = InterviewSession(
                    id=data["id"],
                    candidate_name=data["candidate_name"],
                    role=data["role"],
                    level=data["level"],
                    persona=data["persona"],
                    total_questions=data["total_questions"],
                    current_question_index=data["current_question_index"],
                    status=data["status"],
                    created_at=data.get("created_at", time.time()),
                    evaluation=data.get("evaluation")
                )
                session.history = [
                    InterviewMessage(
                        role=m["role"],
                        content=m["content"],
                        question_index=m["question_index"],
                        timestamp=m.get("timestamp", time.time()),
                        metadata=m.get("metadata", {})
                    )
                    for m in data.get("history", [])
                ]
                self.sessions[session_id] = session
                return session
        except Exception as e:
            print(f"Warning: Failed to load session {session_id} from disk: {e}")
        return None

    def create_session(
        self,
        candidate_name: str,
        role: str,
        level: str = "Senior",
        persona: str = "J.A.R.V.I.S. Protocol",
        total_questions: int = 5
    ) -> InterviewSession:
        """Initializes a new J.A.R.V.I.S. interview session."""
        session_id = str(uuid.uuid4())[:8]
        session = InterviewSession(
            id=session_id,
            candidate_name=candidate_name.strip() or "Candidate",
            role=role,
            level=level,
            persona=persona,
            total_questions=max(3, min(total_questions, 10)),
            current_question_index=1,
            status="in_progress",
            history=[]
        )
        self.sessions[session_id] = session
        self._save_session_to_disk(session)
        return session

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        if session_id in self.sessions:
            return self.sessions[session_id]
        return self._load_session_from_disk(session_id)

    def start_interview(self, session_id: str) -> Dict[str, Any]:
        """Generates high-tech J.A.R.V.I.S. opening remarks and Question 1."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        llm = self._get_llm(temperature=0.6)
        prompt = f"""You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the premier autonomous AI Technical Assessor.
Target Candidate: {session.candidate_name}
Target Role: {session.level} {session.role}
Active Persona Protocol: {session.persona}
Assessment Rounds: {session.total_questions} questions total

Instructions:
1. Greet {session.candidate_name} with the voice and composure of J.A.R.V.I.S. (polite, intelligent, sharp, and confident).
2. Announce the initiation of today's technical evaluation for the {session.level} {session.role} position.
3. State that technical precision, architectural depth, trade-off clarity, and scalability will be evaluated with strict accuracy.
4. Present Question 1 (out of {session.total_questions}). The question must be deeply relevant, thought-provoking, and calibrated for a {session.level} practitioner.
5. Ask strictly ONE clear question. No bulleted multi-part questionnaires.

Speak directly to the candidate."""

        if llm:
            try:
                response = llm.invoke(prompt)
                interviewer_message = response.content.strip()
            except Exception:
                interviewer_message = self._fallback_start_message(session)
        else:
            interviewer_message = self._fallback_start_message(session)

        msg = InterviewMessage(
            role="interviewer",
            content=interviewer_message,
            question_index=1,
            metadata={"type": "question", "question_num": 1}
        )
        session.history.append(msg)
        self._save_session_to_disk(session)

        return {
            "session_id": session.id,
            "current_question": 1,
            "total_questions": session.total_questions,
            "message": interviewer_message,
            "status": session.status,
            "provider": self.active_provider
        }

    def process_response(self, session_id: str, candidate_answer: str) -> Dict[str, Any]:
        """Processes candidate answer, analyzes accuracy & quality, offers feedback, and advances."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        quality_diag = detect_response_quality(candidate_answer)

        # Record candidate answer with quality telemetry
        user_msg = InterviewMessage(
            role="candidate",
            content=candidate_answer.strip(),
            question_index=session.current_question_index,
            metadata={"quality": quality_diag}
        )
        session.history.append(user_msg)

        is_last_question = session.current_question_index >= session.total_questions

        if is_last_question:
            session.status = "completed"
            next_q_num = session.total_questions
        else:
            session.current_question_index += 1
            next_q_num = session.current_question_index

        llm = self._get_llm(temperature=0.6)

        # Build recent conversation context
        conversation_context = "\n".join(
            [f"{m.role.upper()}: {m.content}" for m in session.history[-6:]]
        )

        quality_instruction = ""
        if quality_diag["category"] in ["empty", "evasive", "gibberish"]:
            quality_instruction = (
                f"CRITICAL: The candidate's response was classified as '{quality_diag['category'].upper()}' ({quality_diag['reason']}). "
                "You MUST NOT validate, praise, or pretend they gave a technical answer. "
                "As J.A.R.V.I.S., state politely but firmly that the submission contained no technical substance or relevance to the question asked. "
                "Do NOT give free passes or compliments."
            )
        elif quality_diag["category"] == "shallow":
            quality_instruction = (
                "The candidate gave an extremely brief response lacking depth or architecture. "
                "Point out in 1 crisp sentence what crucial engineering consideration or trade-off was omitted before advancing."
            )
        else:
            quality_instruction = (
                "The candidate provided a substantive response. Concisely highlight a specific valid engineering insight or trade-off "
                "they raised, or challenge an edge case, in 1-2 sentences."
            )

        if is_last_question:
            prompt = f"""You are J.A.R.V.I.S. ({session.persona}) concluding an assessment for {session.candidate_name} ({session.level} {session.role}).
Candidate answered the final Question {session.total_questions}.

Recent conversation:
{conversation_context}

Quality Diagnostic:
{quality_instruction}

Your task:
1. Provide a realistic J.A.R.V.I.S. reaction to their final response adhering strictly to the Quality Diagnostic above.
2. Thank {session.candidate_name} and inform them that the interview protocol is now complete.
3. State that the comprehensive diagnostic telemetry and Hiring Committee Scorecard are now being generated.
4. Keep it concise, professional, and within 3 sentences."""
        else:
            prompt = f"""You are J.A.R.V.I.S. ({session.persona}) evaluating {session.candidate_name} for a {session.level} {session.role} position.
Candidate just responded to Question {session.current_question_index - 1}.

Recent conversation:
{conversation_context}

Quality Diagnostic:
{quality_instruction}

Your task:
1. Deliver a sharp, calibrated 1-2 sentence reaction to their previous answer adhering strictly to the Quality Diagnostic above.
2. Smoothly transition to Question {next_q_num} (out of {session.total_questions}).
3. Present Question {next_q_num} clearly and crisply. It should test a distinct core competency for a {session.level} {session.role} (e.g. system design, high availability, edge cases, latency, security, or fault isolation).
4. Ask strictly ONE clear question.

Output directly as J.A.R.V.I.S. speaking."""

        if llm:
            try:
                response = llm.invoke(prompt)
                interviewer_message = response.content.strip()
            except Exception:
                interviewer_message = self._fallback_response_message(session, is_last_question, next_q_num, quality_diag)
        else:
            interviewer_message = self._fallback_response_message(session, is_last_question, next_q_num, quality_diag)

        msg = InterviewMessage(
            role="interviewer",
            content=interviewer_message,
            question_index=next_q_num,
            metadata={"type": "conclusion" if is_last_question else "question", "question_num": next_q_num}
        )
        session.history.append(msg)
        self._save_session_to_disk(session)

        return {
            "session_id": session.id,
            "current_question": session.current_question_index,
            "total_questions": session.total_questions,
            "message": interviewer_message,
            "status": session.status,
            "is_completed": is_last_question,
            "quality_diagnostic": quality_diag
        }

    def generate_hint(self, session_id: str) -> Dict[str, str]:
        """Provides a guiding hint without revealing the entire solution."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        last_interviewer_msg = next((m.content for m in reversed(session.history) if m.role == "interviewer"), "")

        llm = self._get_llm(temperature=0.4)
        prompt = f"""You are J.A.R.V.I.S. assisting a candidate in an interview for {session.level} {session.role}.
The active question asked was:
"{last_interviewer_msg}"

The candidate requested a hint.
Provide a concise, architectural hint (1-2 sentences maximum). Guide their perspective toward trade-offs, bottlenecks, or design patterns without handing over the exact answer."""

        if llm:
            try:
                response = llm.invoke(prompt)
                hint = response.content.strip()
            except Exception:
                hint = "Consider isolating the critical bottleneck: evaluate read/write asymmetry, caching invalidation strategies, and how to degrade gracefully under failure."
        else:
            hint = "Think about the data structures and scalability trade-offs involved, or relate it to a real-world production incident you have diagnosed."

        return {"hint": hint}

    def evaluate_interview(self, session_id: str) -> Dict[str, Any]:
        """Generates a strictly calibrated, high-accuracy Hiring Committee Scorecard."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if session.evaluation:
            return session.evaluation

        transcript_text = "\n\n".join(
            [f"[{m.role.upper()} - Q{m.question_index}]: {m.content}" for m in session.history]
        )

        llm = self._get_llm(temperature=0.2)
        prompt = f"""You are J.A.R.V.I.S., an elite Hiring Committee Bar Raiser conducting an uncompromising, strictly accurate evaluation of a candidate's technical interview.

Candidate Name: {session.candidate_name}
Target Role: {session.level} {session.role}
Interviewer Persona: {session.persona}

Full Interview Transcript:
{transcript_text}

=== RIGOROUS GRADING RUBRIC & INTEGRITY RULES ===
1. ACCURACY & EVIDENCE-BASED SCORING:
   - You MUST grade strictly based on evidence present in the candidate's answers.
   - If the candidate provided nonsensical, evasive ('idk', 'pass', 'potato', 'banana'), random characters, or completely irrelevant answers for a question:
     THAT QUESTION MUST RECEIVE A SCORE OF 0 TO 10.
   - Under NO CIRCUMSTANCES may an evasive or nonsensical response be given a passing score.
   - Do NOT reward buzzwords unless backed by actual architectural or algorithmic explanation.

2. SENIORITY CALIBRATION ({session.level}):
   - Junior: Expected to understand fundamentals, clean syntax, and basic logic.
   - Senior / Lead: Expected to address concurrency, distributed failure modes, scalability, latency, database partitioning, telemetry, and trade-offs.

3. SCORE BAND DEFINITIONS:
   - 0 - 20: 'No Hire' (Non-responsive, gibberish, evasive, refusal, or fundamentally incoherent).
   - 21 - 45: 'No Hire' (Extremely shallow, buzzword dropping with zero depth, severe technical errors).
   - 46 - 65: 'Leaning No Hire' (Junior-level partial understanding, significant architectural or logical gaps).
   - 66 - 79: 'Leaning Hire' (Solid fundamentals, minor omissions in edge cases or scalability).
   - 80 - 92: 'Hire' (Strong technical mastery, sound trade-offs, structured reasoning).
   - 93 - 100: 'Strong Hire' (Staff/Principal-level mastery, comprehensive failure modes, metrics, and exact trade-offs).

4. MATHEMATICAL INTEGRITY:
   - "overall_score" MUST be the rounded average of the scores in "question_breakdown".
   - If candidate answered nonsense for all questions, overall_score MUST be <= 10 and verdict MUST be 'No Hire'.

You MUST return strictly valid, parseable JSON with NO markdown ticks or preamble:
{{
  "overall_score": <integer from 0 to 100>,
  "verdict": "<one of: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Leaning No Hire' | 'No Hire'>",
  "summary": "<2-3 sentence executive evaluation summary>",
  "metrics": {{
    "technical_competence": <integer from 0 to 100>,
    "problem_solving": <integer from 0 to 100>,
    "communication_clarity": <integer from 0 to 100>,
    "systematic_thinking": <integer from 0 to 100>
  }},
  "strengths": [
    "<evidence-based strength 1>",
    "<evidence-based strength 2>",
    "<evidence-based strength 3>"
  ],
  "areas_for_improvement": [
    "<actionable improvement area 1>",
    "<actionable improvement area 2>",
    "<actionable improvement area 3>"
  ],
  "question_breakdown": [
    {{
      "question_number": <int>,
      "question_topic": "<brief topic>",
      "candidate_answer_summary": "<factual summary of what candidate actually submitted>",
      "score": <integer from 0 to 100>,
      "feedback": "<accurate critique explaining why marks were earned or deducted>",
      "ideal_answer_outline": "<how a top-tier candidate should address this problem>"
    }}
  ]
}}"""

        evaluation_data = None
        if llm:
            try:
                raw_res = llm.invoke(prompt).content.strip()
                if raw_res.startswith("```json"):
                    raw_res = raw_res[7:]
                if raw_res.startswith("```"):
                    raw_res = raw_res[3:]
                if raw_res.endswith("```"):
                    raw_res = raw_res[:-3]
                raw_res = raw_res.strip()
                evaluation_data = json.loads(raw_res)

                # Sanity enforcement: if overall_score is wildly disconnected from question average, recalibrate
                if "question_breakdown" in evaluation_data and evaluation_data["question_breakdown"]:
                    q_scores = [q.get("score", 0) for q in evaluation_data["question_breakdown"]]
                    avg_q = int(round(sum(q_scores) / max(1, len(q_scores))))
                    # If model hallucinated a high overall score despite low question scores:
                    if avg_q <= 20 and evaluation_data.get("overall_score", 0) > 25:
                        evaluation_data["overall_score"] = avg_q
                        evaluation_data["verdict"] = "No Hire"
            except Exception as e:
                print(f"LLM Evaluation failed or JSON invalid, triggering Calibrated Heuristic Engine: {e}")
                evaluation_data = self._calibrated_heuristic_evaluation(session)
        else:
            evaluation_data = self._calibrated_heuristic_evaluation(session)

        session.evaluation = evaluation_data
        session.status = "completed"
        self._save_session_to_disk(session)
        return evaluation_data

    # Fallback response generators
    def _fallback_start_message(self, session: InterviewSession) -> str:
        return (
            f"Greetings {session.candidate_name}. I am J.A.R.V.I.S., your autonomous technical assessor for today's "
            f"{session.level} {session.role} evaluation. We will conduct {session.total_questions} rigorous rounds covering "
            f"systems architecture, algorithmic problem solving, and production trade-offs.\n\n"
            f"**Question 1:** To begin our diagnostics, walk me through an end-to-end architecture or complex system you recently engineered. "
            f"What were the core bottlenecks, and what trade-offs governed your technology choices?"
        )

    def _fallback_response_message(self, session: InterviewSession, is_last: bool, next_q: int, quality_diag: Dict[str, Any]) -> str:
        if is_last:
            if not quality_diag.get("is_substantive", True):
                return (
                    f"Understood, {session.candidate_name}. I noted that your final submission lacked technical substance. "
                    f"That concludes our interview questions for today. I am now compiling your complete evaluation dossier."
                )
            return (
                f"Thank you, {session.candidate_name}. Your response has been logged. "
                f"That concludes our technical rounds. J.A.R.V.I.S. is now synthesizing your comprehensive evaluation dossier."
            )

        # Contextual prefix based on quality
        if not quality_diag.get("is_substantive", True):
            prefix = "I noted that response lacked engineering depth or relevance to the question. Let us proceed to the next diagnostic."
        else:
            prefix = "Acknowledged. Let us advance to the next technical dimension."

        questions_pool = [
            f"{prefix} For **Question {next_q}**: How do you architect a distributed system to handle a 10x traffic surge while preserving sub-100ms P99 latency and preventing cascading failures?",
            f"{prefix} Moving to **Question {next_q}**: Describe a critical production outage you investigated. How did you identify root cause, isolate the blast radius, and automate prevention?",
            f"{prefix} Now, **Question {next_q}**: When designing a caching tier under heavy write load, how do you handle cache stampedes, stale reads, and consistency trade-offs?",
            f"{prefix} For **Question {next_q}**: How do you enforce architectural boundaries, zero-downtime deployments, and maintainability across a multi-service engineering organization?"
        ]
        q_idx = (next_q - 2) % len(questions_pool)
        return questions_pool[q_idx]

    def _calibrated_heuristic_evaluation(self, session: InterviewSession) -> Dict[str, Any]:
        """
        Calibrated, deterministic heuristic evaluator.
        Analyzes candidate answers for length, vocabulary richness, technical relevance, and substance.
        Guarantees that nonsense, empty answers, or evasive submissions receive 0-15 and 'No Hire'.
        """
        candidate_messages = [m for m in session.history if m.role == "candidate"]
        num_answers = len(candidate_messages)

        if num_answers == 0:
            return {
                "overall_score": 0,
                "verdict": "No Hire",
                "summary": "Candidate provided zero answers during the evaluation session.",
                "metrics": {"technical_competence": 0, "problem_solving": 0, "communication_clarity": 0, "systematic_thinking": 0},
                "strengths": ["None identified"],
                "areas_for_improvement": ["Participate in the interview by providing answers."],
                "question_breakdown": []
            }

        total_words = sum(len(m.content.split()) for m in candidate_messages)
        avg_words = total_words / max(1, num_answers)

        # Count how many answers are gibberish / non-substantive
        gibberish_count = 0
        for m in candidate_messages:
            q = detect_response_quality(m.content)
            if not q["is_substantive"]:
                gibberish_count += 1

        all_gibberish = (gibberish_count == num_answers) or (avg_words < 7)

        if all_gibberish:
            # Candidate wrote nonsense, random letters, or 'idk'
            question_breakdown = []
            for i, m in enumerate(candidate_messages):
                question_breakdown.append({
                    "question_number": i + 1,
                    "question_topic": f"Technical Assessment Round {i + 1}",
                    "candidate_answer_summary": f"Non-responsive / Incoherent: '{m.content[:60]}...'",
                    "score": 0 if len(m.content.strip()) < 10 else 5,
                    "feedback": "Response contained zero technical substance, architecture, or relevance to the question.",
                    "ideal_answer_outline": "Candidate must present concrete architectures, trade-offs, and technologies solving the specific problem."
                })

            return {
                "overall_score": 3,
                "verdict": "No Hire",
                "summary": f"{session.candidate_name} submitted non-responsive, incoherent, or empty responses throughout the assessment. No technical competence or engineering problem-solving was demonstrated.",
                "metrics": {
                    "technical_competence": 0,
                    "problem_solving": 0,
                    "communication_clarity": 5,
                    "systematic_thinking": 0
                },
                "strengths": [
                    "Completed the session duration."
                ],
                "areas_for_improvement": [
                    "Provide actual technical architectures rather than evasive or random responses.",
                    "Review foundational computer science principles and system design patterns.",
                    "Demonstrate structured communication using the STAR or architecture breakdown framework."
                ],
                "question_breakdown": question_breakdown
            }

        # Candidate gave real answers; compute calibrated score based on substance & depth
        role_keywords = ["scale", "cache", "database", "latency", "architecture", "tradeoff", "api", "distributed", "security", "pipeline", "async", "queue"]
        keyword_hits = sum(1 for kw in role_keywords if any(kw in m.content.lower() for m in candidate_messages))

        # Base score from word count and keyword coverage
        score_base = min(60, int(avg_words * 0.7)) + min(25, keyword_hits * 3)
        # Deduct heavily for partial gibberish
        score_base -= (gibberish_count * 20)
        overall = max(10, min(88, score_base))

        if overall < 45:
            verdict = "No Hire"
        elif overall < 65:
            verdict = "Leaning No Hire"
        elif overall < 80:
            verdict = "Leaning Hire"
        else:
            verdict = "Hire"

        question_breakdown = []
        for i, m in enumerate(candidate_messages):
            q_diag = detect_response_quality(m.content)
            q_words = len(m.content.split())
            if not q_diag["is_substantive"]:
                q_score = 10
                q_feed = "Response was evasive or too brief to evaluate technical depth."
            else:
                q_score = min(92, max(25, int(q_words * 0.8) + (keyword_hits * 3)))
                q_feed = "Articulated technical reasoning with relevant terminology. Incorporating specific quantitative metrics would further strengthen the response."

            question_breakdown.append({
                "question_number": i + 1,
                "question_topic": f"Technical Assessment Round {i + 1}",
                "candidate_answer_summary": m.content[:100] + ("..." if len(m.content) > 100 else ""),
                "score": q_score,
                "feedback": q_feed,
                "ideal_answer_outline": "Define requirements -> Propose architecture -> Address bottlenecks and edge cases -> Detail observability and recovery."
            })

        return {
            "overall_score": overall,
            "verdict": verdict,
            "summary": f"{session.candidate_name} demonstrated varying technical engagement across rounds, with an average answer length of {int(avg_words)} words and {keyword_hits} core architectural domain references.",
            "metrics": {
                "technical_competence": min(100, overall + 2),
                "problem_solving": max(0, overall - 4),
                "communication_clarity": min(100, max(20, int(avg_words * 1.2))),
                "systematic_thinking": max(0, overall - 2)
            },
            "strengths": [
                "Engaged with technical interview scenarios.",
                "Demonstrated relevant domain terminology where applicable."
            ],
            "areas_for_improvement": [
                "Deepen trade-off analysis between competing architectural choices.",
                "Provide concrete production metrics and failure-recovery mechanisms.",
                "Ensure every response directly addresses scalability and edge-case boundaries."
            ],
            "question_breakdown": question_breakdown
        }


# Global Singleton Instance
agent_engine = InterviewAgent()
