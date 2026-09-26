# ⚡ JARVIS — Enterprise Technical Assessment & Architecture Evaluation Platform

**JARVIS** is an executive-tier, full-stack **AI Technical Assessor and Architecture Evaluation Platform** built with **LangChain**, **FastAPI**, and modern **Web Speech & Web Audio APIs**. Designed with a sophisticated dark-mode aesthetic inspired by Linear and Apple Intelligence, JARVIS conducts rigorous, adaptive technical interviews with real-time speech interaction, dynamic architectural probing, and strictly calibrated Bar-Raiser evaluation scorecards.

---

## 🌟 Key Capabilities

- **🎯 Calibrated Accuracy & Anti-Hallucination Grading Engine**:
  - **Evidence-Based Scoring**: Evaluates strictly against demonstrable engineering depth, trade-off clarity, and scalability mechanics.
  - **Zero Tolerance for Fluff**: Evasive answers, random text, or gibberish ("idk", "pass", buzzword stuffing) are penalized with 0–15/100 and an immediate "No Hire" verdict.
  - **Deterministic Heuristic Fallback**: Ensures fair and rigorous scoring even if offline or during network timeouts, completely preventing arbitrary high scores.
- **🎙️ Real-Time Voice Interaction & Acoustic Luminescence Orb**:
  - **Harmonic Voice Visualizer**: Fluid, breathing luminescence sphere that dynamically reacts to audio frequencies.
  - **Speech-to-Text (STT)**: Real-time voice transcription streaming directly into the candidate response dock.
  - **Text-to-Speech (TTS)**: Articulate JARVIS voice synthesis delivering questions aloud with executive composure.
- **🧠 Multi-Provider LLM Engine with Instant Failover**:
  - Primary: **Groq** (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`) for ultra-low latency conversational streaming.
  - Fallback 1: **Google Gemini** (`gemini-2.5-flash`).
  - Fallback 2: **OpenAI** (`gpt-4o-mini`).
  - Fallback 3: **JARVIS Deterministic Engine** for calibrated local scoring.
- **🎭 Executive Evaluator Personas**:
  - **JARVIS Executive Assessor**: Objective, balanced, deeply analytical, strictly verifies architectural rigor and trade-offs.
  - **Bar Raiser Interviewer**: Formal, probing edge cases, scalability limits, and optimal complexity.
  - **Principal Systems Architect**: Focuses on engineering craftsmanship, boundary isolation, maintainability, and clean communication.
  - **Engineering Director / CTO**: Pragmatic, assessing real-world production incident response and delivery velocity.
- **🎯 Tailored Career Tracks & Difficulty**:
  - Full-Stack Engineer, Backend Systems, Frontend Architect, AI/ML & LLM Engineer, Data Science, DevOps/Cloud, Technical Product Manager, and Behavioral/Leadership (STAR).
  - Seniority levels: *Junior (0-2 YOE)*, *Mid-Level (2-5 YOE)*, *Senior (5-8 YOE)*, *Lead / Principal Architect (8+ YOE)*.
- **💡 Real-Time Assistance & Architectural Depth Telemetry**:
  - Smart **"Request Guidance"** button to guide candidates without revealing full solutions.
  - Live **Depth Telemetry Counter** indicating response word count and advising candidates on necessary architectural depth.
- **📊 Executive Assessment Scorecard**:
  - **Overall Score (0-100)** and Calibrated Verdict Pill (*Strong Hire*, *Hire*, *Leaning Hire*, *No Hire*).
  - **4-Axis Pillar Skills**: Technical Competence, Problem Solving & Logic, Communication & Precision, Systematic Architecture.
  - **Validated Strengths & Development Areas**: Concrete, actionable feedback.
  - **Round-by-Round Breakdown**: Candidate response summaries, individual scores, critique, and ideal architectural benchmark outlines.
  - **Export Options**: Download Report as JSON or Print/Save to PDF.

---

## 🏗️ Architecture

```mermaid
graph TD
    Client["Frontend SPA (Acoustic Orb / Web Speech / Minimalist Luxury Dark UI)"]
    FastAPI["FastAPI Web Server (aiagent.server)"]
    Agent["InterviewAgent Lifecycle Engine (aiagent.agent)"]
    Detector["Response Quality & Gibberish Detector"]
    LLMChain["Multi-Provider LLM Fallback (Groq / Gemini / OpenAI)"]
    Heuristic["Calibrated Heuristic Scorer"]
    Scorecard["Executive Scorecard Evaluator"]

    Client <-->|REST API + Web Speech| FastAPI
    FastAPI <--> Agent
    Agent --> Detector
    Agent <--> LLMChain
    LLMChain -.->|Fallback if offline| Heuristic
    Agent --> Scorecard
```

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- Python `>= 3.10`
- Virtual environment or `pip`

### 2. Environment Variables
Verify your `.env` file in the project root:
```env
# At least one key is required for live AI responses (Groq is recommended for ultra-fast speed)
GROQ_API_KEY=gsk_your_groq_api_key_here
GOOGLE_API_KEY=your_google_gemini_api_key_here
OPENAI_API_KEY=sk-your_openai_key_here
```

### 3. Run the Application

Using the existing virtual environment:
```bash
./.venv/bin/uvicorn aiagent.server:app --host 0.0.0.0 --port 8000 --reload
```

Or using standard Python:
```bash
pip install -r requirements.txt
python -m aiagent
```

### 4. Open in Browser
Visit **[http://localhost:8000](http://localhost:8000)** to launch JARVIS.

---

## ☁️ Deployment Guide (Vercel & Cloud)

The repository comes pre-configured with `vercel.json` and `api/index.py` for immediate deployment.

### Option A: Deploy to Vercel via GitHub (Recommended)

1. **Commit and push your code to GitHub**:
   ```bash
   git add .
   git commit -m "feat: executive JARVIS UI & calibrated accuracy engine"
   git push origin main
   ```
2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and select your GitHub repository.
   - Framework Preset: Select **Other** (Vercel automatically detects `vercel.json` and `@vercel/python`).
3. **Configure Environment Variables**:
   In the Vercel project settings under **Environment Variables**, add:
   - `GROQ_API_KEY`: Your Groq API key
   - `GOOGLE_API_KEY`: Your Google Gemini API key
   - `OPENAI_API_KEY`: Your OpenAI API key
4. **Deploy**:
   Vercel will build the serverless functions and provide your live production URL (e.g., `https://aiagent-liart.vercel.app`).

---

## 📂 Project Structure

```
aiagent/
├── .env                           # API keys (local only, gitignored)
├── .gitignore                     # Ignores .venv, .env, .vercel, caches
├── pyproject.toml                 # Project dependencies & scripts
├── requirements.txt               # Production requirements for Vercel/Pip
├── vercel.json                    # Vercel serverless routing configuration
├── api/
│   └── index.py                   # Vercel serverless entrypoint
├── README.md                      # Project documentation
├── src/
│   └── aiagent/
│       ├── __init__.py            # CLI entrypoint
│       ├── agent.py               # JARVIS Core Engine, Accuracy Rubric & Calibrated Scorer
│       ├── server.py              # FastAPI REST endpoints & Resilient Session Hydration
│       └── static/
│           ├── index.html         # Executive Assessment Interface
│           ├── styles.css         # Modern Luxury Dark UI Design System
│           └── app.js             # Web Speech, Acoustic Orb & Calibrated Controller
└── updatedaiagent/
    └── 1-aiagent.ipynb            # Interactive step-by-step Jupyter Notebook tutorial
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check & active LLM provider telemetry |
| `/api/roles` | `GET` | Available career tracks |
| `/api/personas` | `GET` | Available evaluator personas |
| `/api/interview/start` | `POST` | Initialize an assessment session & receive Round 1 |
| `/api/interview/respond` | `POST` | Submit candidate answer, receive feedback & next question |
| `/api/interview/hint` | `POST` | Request architectural guidance |
| `/api/interview/finish` | `POST` | Complete interview & generate comprehensive evaluation scorecard |
| `/api/interview/session/{id}` | `GET` | Retrieve full interview transcript & telemetry |

---

## 🧪 Interactive Jupyter Notebook Tutorial

To explore the LangChain agent logic step-by-step:
1. Open [`updatedaiagent/1-aiagent.ipynb`](file:///Users/adityasharma/aiagent/updatedaiagent/1-aiagent.ipynb)
2. Select the **`Python (aiagent)`** kernel
3. Run the cells to interact with the LLM chains directly from Python.
