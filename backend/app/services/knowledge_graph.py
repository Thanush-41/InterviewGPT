from app.models.candidate import (
    CandidateProfile,
    KnowledgeGraph,
    KnowledgeGraphNode,
    KnowledgeGraphEdge,
)
import hashlib


def _make_id(prefix: str, name: str) -> str:
    """Create a deterministic node ID."""
    return f"{prefix}_{hashlib.md5(name.lower().encode()).hexdigest()[:8]}"


def build_knowledge_graph(candidate_id: str, profile: CandidateProfile) -> KnowledgeGraph:
    """
    Build a knowledge graph from candidate profile.
    
    Structure:
    Candidate → Skills (categorized)
    Candidate → Projects → Technologies
    Candidate → Experience → Technologies
    Candidate → Education
    
    This enables:
    - Resume-aware questioning ("How did JWT work in FlipMyBed?")
    - Skill verification through project cross-referencing
    - Contradiction detection (claims skill but no project uses it)
    """
    nodes: list[KnowledgeGraphNode] = []
    edges: list[KnowledgeGraphEdge] = []

    # Root node: Candidate
    candidate_node_id = f"candidate_{candidate_id[:8]}"
    nodes.append(KnowledgeGraphNode(
        id=candidate_node_id,
        label=profile.name or "Candidate",
        type="candidate",
        properties={"email": profile.email, "summary": profile.summary}
    ))

    # Skill nodes
    skill_ids = set()
    for skill in profile.skills:
        skill_id = _make_id("skill", skill.name)
        if skill_id not in skill_ids:
            skill_ids.add(skill_id)
            nodes.append(KnowledgeGraphNode(
                id=skill_id,
                label=skill.name,
                type="skill",
                properties={"category": skill.category, "level": skill.level or "unknown"}
            ))
            edges.append(KnowledgeGraphEdge(
                source=candidate_node_id,
                target=skill_id,
                relationship="has_skill"
            ))

    # Project nodes + their technologies
    for project in profile.projects:
        project_id = _make_id("project", project.name)
        nodes.append(KnowledgeGraphNode(
            id=project_id,
            label=project.name,
            type="project",
            properties={
                "description": project.description,
                "highlights": project.highlights,
            }
        ))
        edges.append(KnowledgeGraphEdge(
            source=candidate_node_id,
            target=project_id,
            relationship="built_project"
        ))

        # Technologies used in project
        for tech in project.technologies:
            tech_id = _make_id("tech", tech.name)
            # Add tech node if not already a skill node
            if tech_id not in skill_ids:
                nodes.append(KnowledgeGraphNode(
                    id=tech_id,
                    label=tech.name,
                    type="technology",
                    properties={"role": tech.role}
                ))
                skill_ids.add(tech_id)
            edges.append(KnowledgeGraphEdge(
                source=project_id,
                target=tech_id,
                relationship="used_tech"
            ))

    # Experience nodes
    for exp in profile.experience:
        exp_id = _make_id("exp", f"{exp.company}_{exp.role}")
        nodes.append(KnowledgeGraphNode(
            id=exp_id,
            label=f"{exp.role} @ {exp.company}",
            type="experience",
            properties={
                "company": exp.company,
                "role": exp.role,
                "duration": exp.duration,
                "description": exp.description,
            }
        ))
        edges.append(KnowledgeGraphEdge(
            source=candidate_node_id,
            target=exp_id,
            relationship="worked_at"
        ))

        # Technologies used at job
        for tech_name in exp.technologies:
            tech_id = _make_id("tech", tech_name)
            if tech_id not in skill_ids:
                nodes.append(KnowledgeGraphNode(
                    id=tech_id,
                    label=tech_name,
                    type="technology",
                    properties={}
                ))
                skill_ids.add(tech_id)
            edges.append(KnowledgeGraphEdge(
                source=exp_id,
                target=tech_id,
                relationship="used_tech"
            ))

    # Education nodes
    for edu in profile.education:
        edu_id = _make_id("edu", f"{edu.institution}_{edu.degree}")
        nodes.append(KnowledgeGraphNode(
            id=edu_id,
            label=f"{edu.degree} - {edu.institution}",
            type="education",
            properties={
                "field": edu.field,
                "year": edu.year,
                "gpa": edu.gpa,
            }
        ))
        edges.append(KnowledgeGraphEdge(
            source=candidate_node_id,
            target=edu_id,
            relationship="studied_at"
        ))

    return KnowledgeGraph(nodes=nodes, edges=edges)
