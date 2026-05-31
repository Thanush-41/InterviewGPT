import json
import fitz  # PyMuPDF
from google import genai
from app.config import get_settings
from app.models.candidate import CandidateProfile

settings = get_settings()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text.strip()


async def parse_resume_with_llm(resume_text: str) -> CandidateProfile:
    """Use Gemini to extract structured data from resume text."""
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = f"""You are a resume parser. Extract structured information from the following resume text.
Return a JSON object with EXACTLY this structure (no markdown, no code blocks, just raw JSON):

{{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "summary": "brief professional summary",
  "skills": [
    {{"name": "skill name", "category": "language|framework|database|tool|cloud|other", "level": "beginner|intermediate|advanced|expert"}}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "description": "what it does",
      "technologies": [{{"name": "tech name", "role": "frontend|backend|database|deployment|other"}}],
      "highlights": ["key achievement 1", "key achievement 2"]
    }}
  ],
  "experience": [
    {{
      "company": "Company Name",
      "role": "Job Title",
      "duration": "start - end",
      "description": "what they did",
      "technologies": ["tech1", "tech2"]
    }}
  ],
  "education": [
    {{
      "institution": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "year": "graduation year",
      "gpa": "GPA if mentioned"
    }}
  ]
}}

IMPORTANT:
- Infer skill levels from context (projects built, years of experience)
- Categorize skills accurately (React = framework, Python = language, AWS = cloud)
- For projects, identify ALL technologies used even if not explicitly listed
- Extract specific achievements and metrics from project descriptions

Resume Text:
{resume_text}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    # Parse the JSON response
    response_text = response.text.strip()
    # Remove markdown code blocks if present
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        response_text = response_text.rsplit("```", 1)[0]

    parsed = json.loads(response_text)
    profile = CandidateProfile(**parsed, raw_text=resume_text)
    return profile
