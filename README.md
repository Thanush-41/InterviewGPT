# InterviewGPT 🎯

**AI-Powered Interview Platform** with adaptive questioning, real-time evaluation, knowledge graph-based assessment, and malpractice detection.

Built with **Gemini 2.5 Flash** + **MongoDB Atlas** + **FastAPI** + **Next.js 15** + **LangGraph**.

---

## Features

### Core
- **Resume Parsing** — Upload PDF → AI-extracted structured profile (skills, projects, experience)
- **Knowledge Graph** — Auto-builds candidate knowledge graph from resume data
- **Adaptive Interviews** — LangGraph state machine adjusts difficulty based on responses
- **Multi-Agent Evaluation** — Technical + Communication reviewers score each answer
- **Authenticity Detection** — Cross-references resume claims vs answer depth
- **Malpractice Monitoring** — Detects tab switches, copy/paste, focus loss in real-time

### Interview Flow
- 4 difficulty levels: `resume_based` → `deep_dive` → `cross_question` → `contradiction_test`
- Voice input via Web Speech API
- Real-time scoring with per-answer feedback
- Suspicion score tracking throughout the session

### Roles
- **Recruiter** — Dashboard, candidate management, live interview monitoring, reports
- **Candidate** — Take interviews, voice/text answers, view results

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | Gemini 2.5 Flash (free tier) |
| Embeddings | Gemini Embedding (`gemini-embedding-exp-03-07`) |
| Backend | FastAPI + Python 3.14 |
| Agent Framework | LangGraph (adaptive interview state machine) |
| Database | MongoDB Atlas (M0 free tier) |
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Auth | JWT + bcrypt (role-based: recruiter/candidate) |
| PDF Parsing | PyMuPDF |
| Voice | Web Speech API (browser-native) |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────────┐
│   Next.js 15    │────▶│          FastAPI Backend             │
│   (Frontend)    │◀────│                                     │
└─────────────────┘     │  ┌─────────┐  ┌──────────────────┐ │
                        │  │  Auth   │  │  Resume Parser    │ │
                        │  │  (JWT)  │  │  (PyMuPDF+Gemini) │ │
                        │  └─────────┘  └──────────────────┘ │
                        │  ┌──────────────────────────────┐   │
                        │  │   LangGraph Interview Agent   │   │
                        │  │  ┌────────┐ ┌────────────┐   │   │
                        │  │  │Question│ │  Evaluator  │   │   │
                        │  │  │Planner │ │(Multi-Agent)│   │   │
                        │  │  └────────┘ └────────────┘   │   │
                        │  └──────────────────────────────┘   │
                        │  ┌──────────────────────────────┐   │
                        │  │  Knowledge Graph + Embeddings │   │
                        │  └──────────────────────────────┘   │
                        └──────────────────┬──────────────────┘
                                           │
                                    ┌──────▼──────┐
                                    │MongoDB Atlas│
                                    │  (M0 Free)  │
                                    └─────────────┘
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (free M0 cluster)
- Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone & Configure

```bash
git clone https://github.com/Thanush-41/InterviewGPT.git
cd InterviewGPT
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and MONGODB_URI
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open in Browser

- **App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

---

## Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=Cluster0
MONGODB_DB=interviewos

# Optional
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register (recruiter/candidate) |
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Get current user |

### Resume
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resume/upload` | Upload PDF resume |
| GET | `/api/resume/candidates` | List all candidates |
| GET | `/api/resume/candidates/{id}` | Get candidate detail |

### Interview
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/start` | Start adaptive interview |
| POST | `/api/interview/{id}/answer` | Submit answer |
| POST | `/api/interview/{id}/malpractice` | Report malpractice event |
| GET | `/api/interview/{id}` | Get interview status |
| GET | `/api/interview/{id}/report` | Get final report |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Platform statistics |
| GET | `/api/dashboard/recent-interviews` | Recent interviews |
| GET | `/api/dashboard/live` | Live interview monitoring |

---

## Docker Deployment

```bash
docker-compose up --build
```

---

## Project Structure

```
InterviewGPT/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # FastAPI route handlers
│   │   ├── agents/            # LangGraph interview agents
│   │   │   ├── question_planner.py   # Adaptive question generation
│   │   │   ├── evaluator.py          # Multi-agent answer evaluation
│   │   │   └── authenticity.py       # Authenticity scoring
│   │   ├── models/            # Pydantic data models
│   │   ├── services/          # Business logic
│   │   │   ├── resume_parser.py      # PDF + LLM parsing
│   │   │   ├── knowledge_graph.py    # Graph construction
│   │   │   └── embeddings.py         # Vector embeddings
│   │   ├── db/                # Database connections
│   │   └── config.py          # Settings management
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js pages
│   │   ├── hooks/             # Custom React hooks
│   │   └── lib/               # Utilities
│   └── package.json
├── docker-compose.yml
└── .env.example
```

---

## License

MIT

---

## Author

Built by [@Thanush-41](https://github.com/Thanush-41)
