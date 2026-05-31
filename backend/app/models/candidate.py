from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class Skill(BaseModel):
    name: str
    category: str = ""  # e.g., "language", "framework", "database", "tool"
    level: Optional[SkillLevel] = None


class ProjectTech(BaseModel):
    name: str
    role: str = ""  # e.g., "frontend", "backend", "database", "deployment"


class Project(BaseModel):
    name: str
    description: str = ""
    technologies: list[ProjectTech] = []
    highlights: list[str] = []


class Experience(BaseModel):
    company: str
    role: str
    duration: str = ""
    description: str = ""
    technologies: list[str] = []


class Education(BaseModel):
    institution: str
    degree: str
    field: str = ""
    year: str = ""
    gpa: Optional[str] = None


class CandidateProfile(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    summary: str = ""
    skills: list[Skill] = []
    projects: list[Project] = []
    experience: list[Experience] = []
    education: list[Education] = []
    raw_text: str = ""


class CandidateCreate(BaseModel):
    resume_text: Optional[str] = None


class CandidateResponse(BaseModel):
    id: str
    name: str
    email: str
    profile: CandidateProfile
    knowledge_graph: dict = {}
    created_at: datetime
    updated_at: datetime


class KnowledgeGraphNode(BaseModel):
    id: str
    label: str
    type: str  # "candidate", "skill", "project", "experience", "technology"
    properties: dict = {}


class KnowledgeGraphEdge(BaseModel):
    source: str
    target: str
    relationship: str  # "has_skill", "built_project", "used_tech", "worked_at"


class KnowledgeGraph(BaseModel):
    nodes: list[KnowledgeGraphNode] = []
    edges: list[KnowledgeGraphEdge] = []
