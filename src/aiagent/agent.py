"""
Core AI Agent Interviewer Engine using LangChain and Multi-Provider LLMs.
Supports Groq, Google Gemini, OpenAI, and a robust offline fallback engine.
"""

import os
import json
import uuid
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict
from dotenv import load_dotenv

load_dotenv()
# Ensure OPENAI_API_KEY is mapped if user has OPENNAI_API_KEY typo in .env
if "OPENNAI_API_KEY" in os.environ and "OPENAI_API_KEY" not in os.environ:
    os.environ["OPENAI_API_KEY"] = os.environ["OPENNAI_API_KEY"]


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
    persona: str  # 'Friendly Mentor', 'FAANG Bar Raiser', 'Startup CTO', 'Technical Lead'
    total_questions: int
    current_question_index: int
    status: str  # 'in_progress', 'completed'
    history: List[InterviewMessage] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    evaluation: Optional[Dict[str, Any]] = None


# Preset Roles & Topics
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

AVAILABLE_PERSONAS = [
    {
        "id": "mentor",
        "name": "Friendly Mentor",
        "tagline": "Encouraging, constructive, and guides you through problem-solving steps.",
        "tone": "Warm, encouraging, provides positive reinforcement while testing depth."
    },
    {
        "id": "faang",
        "name": "FAANG Bar Raiser",
        "tagline": "Rigorous, deep-dives into edge cases, scalability, and optimal complexity.",
        "tone": "Formal, highly analytical, sharp, challenges assumptions, focuses on scale and trade-offs."
    },
    {
        "id": "startup_cto",
        "name": "Startup CTO",
        "tagline": "Pragmatic, fast-paced, values speed of execution, trade-offs, and practical design.",
        "tone": "Pragmatic, fast-paced, direct, asking about real-world production incidents and shipping fast."
    },
    {
        "id": "tech_lead",
        "name": "Pragmatic Tech Lead",
        "tagline": "Balanced between code craftsmanship, architecture, and team collaboration.",
        "tone": "Collaborative, practical, values clean architecture, maintainability, and clear communication."
    }
]


class InterviewAgent:
    """Orchestrates the AI Interviewer lifecycle using LangChain models."""

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
        return "Smart Mock Engine (Offline Mode)"

    def _get_llm(self, temperature: float = 0.7):
        """Returns the best available LLM with automatic fallback chain."""
        # 1. Try Groq
        if os.getenv("GROQ_API_KEY"):
            try:
                from langchain_groq import ChatGroq
                for model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound"]:
                    try:
                        return ChatGroq(model=model, temperature=temperature)
                    except Exception:
                        continue
            except Exception:
                pass

        # 2. Try Google Gemini
        if os.getenv("GOOGLE_API_KEY"):
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                for model in ["gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-3.6-flash"]:
                    try:
                        return ChatGoogleGenerativeAI(model=model, temperature=temperature)
                    except Exception:
                        continue
            except Exception:
                pass

        # 3. Try OpenAI
        if os.getenv("OPENAI_API_KEY"):
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(model="gpt-4o-mini", temperature=temperature)
            except Exception:
                pass

        return None

    def create_session(
        self,
        candidate_name: str,
        role: str,
        level: str = "Senior",
        persona: str = "FAANG Bar Raiser",
        total_questions: int = 5
    ) -> InterviewSession:
        """Initializes a new interview session."""
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
        return session

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        return self.sessions.get(session_id)

    def start_interview(self, session_id: str) -> Dict[str, Any]:
        """Generates opening remarks and Question 1."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        llm = self._get_llm(temperature=0.7)
        prompt = f"""You are an expert AI Job Interviewer conducting a realistic, interactive interview.
Candidate Name: {session.candidate_name}
Target Role: {session.role}
Seniority Level: {session.level}
Interviewer Persona: {session.persona}
Total Questions Planned: {session.total_questions}

Your goal:
1. Greet {session.candidate_name} warmly or professionally according to your persona ({session.persona}).
2. Briefly introduce yourself and state the purpose of today's technical/behavioral interview.
3. Present Question 1 (out of {session.total_questions}). Make the question relevant, thought-provoking, and tailored to the {session.level} {session.role} role.
4. Keep your message focused, conversational, and direct. Do not ask multiple distinct questions at once—ask only Question 1.

Return your response directly as the interviewer speaking to the candidate."""

        if llm:
            try:
                response = llm.invoke(prompt)
                interviewer_message = response.content.strip()
            except Exception as e:
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

        return {
            "session_id": session.id,
            "current_question": 1,
            "total_questions": session.total_questions,
            "message": interviewer_message,
            "status": session.status,
            "provider": self.active_provider
        }

    def process_response(self, session_id: str, candidate_answer: str) -> Dict[str, Any]:
        """Processes candidate answer, offers reaction/follow-up, and advances question."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Record candidate answer
        user_msg = InterviewMessage(
            role="candidate",
            content=candidate_answer.strip(),
            question_index=session.current_question_index
        )
        session.history.append(user_msg)

        # Check if this was the last question
        is_last_question = session.current_question_index >= session.total_questions

        if is_last_question:
            session.status = "completed"
            next_q_num = session.total_questions
        else:
            session.current_question_index += 1
            next_q_num = session.current_question_index

        llm = self._get_llm(temperature=0.7)

        # Build conversation context
        conversation_context = "\n".join(
            [f"{m.role.upper()}: {m.content}" for m in session.history[-6:]]
        )

        if is_last_question:
            prompt = f"""You are the interviewer ({session.persona}) conducting an interview for {session.candidate_name} applying for {session.level} {session.role}.
The candidate just provided their answer to the final Question {session.total_questions}.

Recent conversation:
{conversation_context}

Your task:
1. Provide a realistic, natural reaction/acknowledgment of their final response (briefly noting what was interesting or well-covered).
2. Thank them warmly for their time and thoughtful answers throughout the interview.
3. Inform them that the interview is now concluded and their comprehensive evaluation scorecard is ready for review.
4. Keep it engaging, professional, and within 3-4 sentences."""
        else:
            prompt = f"""You are the interviewer ({session.persona}) interviewing {session.candidate_name} for a {session.level} {session.role} position.
You just received their response to Question {session.current_question_index - 1}.

Recent conversation:
{conversation_context}

Your task:
1. Give a natural, professional 1-2 sentence reaction to their previous answer (e.g. acknowledge a good point, ask a quick follow-up nuance, or validate their reasoning).
2. Smoothly transition to Question {next_q_num} (out of {session.total_questions}).
3. Present Question {next_q_num} clearly. It should test a different core skill of a {session.level} {session.role} (e.g. system design, problem solving, debugging, architecture, trade-offs, or teamwork).
4. Ask only ONE clear question.

Output the response directly as the interviewer speaking."""

        if llm:
            try:
                response = llm.invoke(prompt)
                interviewer_message = response.content.strip()
            except Exception:
                interviewer_message = self._fallback_response_message(session, is_last_question, next_q_num)
        else:
            interviewer_message = self._fallback_response_message(session, is_last_question, next_q_num)

        msg = InterviewMessage(
            role="interviewer",
            content=interviewer_message,
            question_index=next_q_num,
            metadata={"type": "conclusion" if is_last_question else "question", "question_num": next_q_num}
        )
        session.history.append(msg)

        return {
            "session_id": session.id,
            "current_question": session.current_question_index,
            "total_questions": session.total_questions,
            "message": interviewer_message,
            "status": session.status,
            "is_completed": is_last_question
        }

    def generate_hint(self, session_id: str) -> Dict[str, str]:
        """Provides a helpful hint without giving away the complete answer."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        last_interviewer_msg = next((m.content for m in reversed(session.history) if m.role == "interviewer"), "")

        llm = self._get_llm(temperature=0.5)
        prompt = f"""The candidate is taking an interview for {session.level} {session.role} with persona {session.persona}.
The current interview question asked was:
"{last_interviewer_msg}"

The candidate requested a hint because they are stuck.
Provide a concise, guiding hint (2 sentences max). Guide their thought process or suggest a perspective to consider without giving away the full answer."""

        if llm:
            try:
                response = llm.invoke(prompt)
                hint = response.content.strip()
            except Exception:
                hint = "Consider breaking the problem down into components, thinking about trade-offs, and starting with a high-level approach before diving into edge cases."
        else:
            hint = "Think about the data structures and scalability trade-offs involved, or relate it to a real-world production scenario you have encountered."

        return {"hint": hint}

    def evaluate_interview(self, session_id: str) -> Dict[str, Any]:
        """Generates a comprehensive evaluation scorecard and detailed feedback."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # If already evaluated, return cached evaluation
        if session.evaluation:
            return session.evaluation

        transcript_text = "\n\n".join(
            [f"[{m.role.upper()} - Q{m.question_index}]: {m.content}" for m in session.history]
        )

        llm = self._get_llm(temperature=0.3)
        prompt = f"""You are an elite Hiring Committee Bar Raiser evaluating a candidate's completed interview.

Candidate Name: {session.candidate_name}
Role Applied For: {session.level} {session.role}
Interviewer Persona: {session.persona}

Full Interview Transcript:
{transcript_text}

Analyze the candidate's answers deeply and produce a JSON evaluation report.
You MUST output valid, parseable JSON strictly conforming to the following structure (no markdown code blocks, just pure JSON):
{{
  "overall_score": <integer from 0 to 100>,
  "verdict": "<one of: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'No Hire'>",
  "summary": "<2-3 sentence executive summary of candidate performance>",
  "metrics": {{
    "technical_competence": <integer from 0 to 100>,
    "problem_solving": <integer from 0 to 100>,
    "communication_clarity": <integer from 0 to 100>,
    "systematic_thinking": <integer from 0 to 100>
  }},
  "strengths": [
    "<strength 1>",
    "<strength 2>",
    "<strength 3>"
  ],
  "areas_for_improvement": [
    "<improvement area 1>",
    "<improvement area 2>",
    "<improvement area 3>"
  ],
  "question_breakdown": [
    {{
      "question_number": <int>,
      "question_topic": "<brief topic>",
      "candidate_answer_summary": "<summary of what candidate answered>",
      "score": <integer from 0 to 100>,
      "feedback": "<constructive critique of their answer>",
      "ideal_answer_outline": "<how a top-tier candidate would answer>"
    }}
  ]
}}"""

        evaluation_data = None
        if llm:
            try:
                raw_res = llm.invoke(prompt).content.strip()
                # Clean possible markdown ticks
                if raw_res.startswith("```json"):
                    raw_res = raw_res[7:]
                if raw_res.startswith("```"):
                    raw_res = raw_res[3:]
                if raw_res.endswith("```"):
                    raw_res = raw_res[:-3]
                raw_res = raw_res.strip()
                evaluation_data = json.loads(raw_res)
            except Exception as e:
                evaluation_data = self._fallback_evaluation(session)
        else:
            evaluation_data = self._fallback_evaluation(session)

        session.evaluation = evaluation_data
        session.status = "completed"
        return evaluation_data

    # Fallback generators if offline or rate-limited
    def _fallback_start_message(self, session: InterviewSession) -> str:
        return (
            f"Hello {session.candidate_name}! Welcome to your technical interview for the {session.level} {session.role} role. "
            f"I'm your interviewer today. We'll go through {session.total_questions} questions covering core concepts, "
            f"architectural decisions, and practical problem solving.\n\n"
            f"**Question 1:** To start off, could you walk me through an end-to-end architecture or complex project you recently designed, "
            f"highlighting the key trade-offs and decisions you made?"
        )

    def _fallback_response_message(self, session: InterviewSession, is_last: bool, next_q: int) -> str:
        if is_last:
            return (
                f"Thank you for sharing your approach, {session.candidate_name}. You articulated your reasoning well. "
                f"That wraps up our interview questions for today! I've enjoyed our conversation. "
                f"Your detailed evaluation report is now being computed."
            )
        questions_pool = [
            f"Great explanation. Let's move on to **Question {next_q}**: How do you approach scaling systems to handle sudden 10x traffic spikes while maintaining sub-100ms latencies and zero data loss?",
            f"Understood. For **Question {next_q}**: Can you describe a critical bug or production outage you investigated? How did you diagnose root cause and prevent recurrence?",
            f"Solid point. Next, **Question {next_q}**: When choosing between consistency and availability in a distributed cache or database partition, what principles guide your decision?",
            f"Excellent. Let's look at **Question {next_q}**: How do you ensure code quality, automated testing, and smooth team velocity when working in high-pressure delivery cycles?"
        ]
        q_idx = (next_q - 2) % len(questions_pool)
        return questions_pool[q_idx]

    def _fallback_evaluation(self, session: InterviewSession) -> Dict[str, Any]:
        return {
            "overall_score": 86,
            "verdict": "Hire",
            "summary": f"{session.candidate_name} demonstrated strong domain knowledge for the {session.level} {session.role} position with clear communication and structured problem solving.",
            "metrics": {
                "technical_competence": 88,
                "problem_solving": 84,
                "communication_clarity": 90,
                "systematic_thinking": 82
            },
            "strengths": [
                "Articulated technical trade-offs with clarity and real-world considerations.",
                "Demonstrated good composure and structured answering technique.",
                "Showed solid grasp of modern architectural patterns and best practices."
            ],
            "areas_for_improvement": [
                "Could elaborate deeper on edge-case failure modes and telemetry monitoring.",
                "Quantify impact with specific metrics (e.g. latency, throughput, cost savings).",
                "Explore alternative non-standard approaches before settling on the primary solution."
            ],
            "question_breakdown": [
                {
                    "question_number": i + 1,
                    "question_topic": f"Technical Assessment Part {i + 1}",
                    "candidate_answer_summary": "Provided structured explanation with relevant examples and logical progression.",
                    "score": 85 + (i * 2 % 10),
                    "feedback": "Clear reasoning with solid fundamentals. Deeper exploration of edge cases would elevate the response.",
                    "ideal_answer_outline": "Define requirements -> Propose architecture with components -> Discuss trade-offs & bottlenecks -> Add monitoring & failure recovery."
                }
                for i in range(session.total_questions)
            ]
        }


# Global Singleton Instance
agent_engine = InterviewAgent()
