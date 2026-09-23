"""
FastAPI Backend Server for AI Agent Interviewer.
Serves REST API and hosts the dynamic Single Page Web Application.
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from aiagent.agent import (
    agent_engine,
    AVAILABLE_ROLES,
    AVAILABLE_PERSONAS,
    InterviewSession
)

app = FastAPI(
    title="AI Agent Interviewer API",
    description="Intelligent Conversational AI Interviewer with Real-Time Evaluation",
    version="1.0.0"
)

# Enable CORS for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"


# Request & Response Models
class StartInterviewRequest(BaseModel):
    candidate_name: str = Field(default="Candidate", description="Candidate's name")
    role: str = Field(default="Full-Stack Engineer", description="Target job role")
    level: str = Field(default="Senior", description="Seniority level")
    persona: str = Field(default="FAANG Bar Raiser", description="Interviewer style/persona")
    total_questions: int = Field(default=5, ge=3, le=10, description="Total questions (3-10)")


class RespondInterviewRequest(BaseModel):
    session_id: str
    answer: str


class HintRequest(BaseModel):
    session_id: str


class FinishInterviewRequest(BaseModel):
    session_id: str


# REST API Endpoints
@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "active_provider": agent_engine.active_provider,
        "total_active_sessions": len(agent_engine.sessions)
    }


@app.get("/api/roles")
async def get_roles():
    return {"roles": AVAILABLE_ROLES}


@app.get("/api/personas")
async def get_personas():
    return {"personas": AVAILABLE_PERSONAS}


@app.post("/api/interview/start")
async def start_interview(req: StartInterviewRequest):
    try:
        session = agent_engine.create_session(
            candidate_name=req.candidate_name,
            role=req.role,
            level=req.level,
            persona=req.persona,
            total_questions=req.total_questions
        )
        result = agent_engine.start_interview(session.id)
        return {
            "success": True,
            "session": {
                "id": session.id,
                "candidate_name": session.candidate_name,
                "role": session.role,
                "level": session.level,
                "persona": session.persona,
                "total_questions": session.total_questions,
                "current_question": session.current_question_index,
                "status": session.status
            },
            "interviewer_message": result["message"],
            "provider": result["provider"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/respond")
async def respond_interview(req: RespondInterviewRequest):
    session = agent_engine.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    try:
        result = agent_engine.process_response(req.session_id, req.answer)
        return {
            "success": True,
            "session_id": session.id,
            "current_question": result["current_question"],
            "total_questions": result["total_questions"],
            "interviewer_message": result["message"],
            "is_completed": result["is_completed"],
            "status": result["status"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/hint")
async def get_hint(req: HintRequest):
    session = agent_engine.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    try:
        hint_res = agent_engine.generate_hint(req.session_id)
        return {"success": True, "hint": hint_res["hint"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/finish")
async def finish_interview(req: FinishInterviewRequest):
    session = agent_engine.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    try:
        evaluation = agent_engine.evaluate_interview(req.session_id)
        return {
            "success": True,
            "session_id": session.id,
            "candidate_name": session.candidate_name,
            "role": f"{session.level} {session.role}",
            "persona": session.persona,
            "evaluation": evaluation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/interview/session/{session_id}")
async def get_session_details(session_id: str):
    session = agent_engine.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": session.id,
        "candidate_name": session.candidate_name,
        "role": session.role,
        "level": session.level,
        "persona": session.persona,
        "total_questions": session.total_questions,
        "current_question": session.current_question_index,
        "status": session.status,
        "history": [
            {
                "role": m.role,
                "content": m.content,
                "question_index": m.question_index,
                "timestamp": m.timestamp,
                "metadata": m.metadata
            }
            for m in session.history
        ],
        "evaluation": session.evaluation
    }


# Static File Serving & Frontend SPA routing
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse(
        content={"message": "AI Agent Interviewer API is running. UI building in progress."},
        status_code=200
    )
