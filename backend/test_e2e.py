"""
End-to-End Integration Test for InterviewOS
Tests the complete flow: Upload Resume → Start Interview → Answer Questions → Get Report
"""
import httpx
import json
import time

BASE_URL = "http://localhost:8000"
client = httpx.Client(base_url=BASE_URL, timeout=90)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"
    print("✓ Health check passed")


def test_resume_upload():
    # Create a simple PDF in memory using the test_resume.pdf already created
    with open("test_resume.pdf", "rb") as f:
        r = client.post("/api/resume/upload", files={"file": ("resume.pdf", f, "application/pdf")})

    assert r.status_code == 200
    data = r.json()
    assert "candidate_id" in data
    assert data["name"] == "JOHN DOE"
    assert len(data["profile"]["skills"]) > 5
    assert len(data["knowledge_graph"]["nodes"]) > 5
    print(f"✓ Resume uploaded: {data['name']} ({len(data['profile']['skills'])} skills, {len(data['knowledge_graph']['nodes'])} graph nodes)")
    return data["candidate_id"]


def test_candidate_detail(candidate_id):
    r = client.get(f"/api/resume/candidates/{candidate_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "JOHN DOE"
    assert "knowledge_graph" in data
    print(f"✓ Candidate detail retrieved with {len(data['knowledge_graph']['nodes'])} nodes")


def test_interview_flow(candidate_id):
    # Start interview
    r = client.post("/api/interview/start", json={
        "candidate_id": candidate_id,
        "interview_type": "technical"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "in_progress"
    assert "question" in data
    interview_id = data["interview_id"]
    print(f"✓ Interview started: {interview_id}")
    print(f"  Q1 [{data['difficulty']}]: {data['question'][:100]}...")

    # Answer 3 questions to test adaptive flow
    answers = [
        "In FlipMyBed, I used MongoDB with proper indexing on the mattress listing collection. I created compound indexes on price, location, and category fields for the search functionality. I also used text indexes for full-text search on mattress descriptions. For the session management, Redis was used as a caching layer.",
        "I chose MongoDB over PostgreSQL for FlipMyBed because the mattress listings had varying attributes - different mattress types have different specifications. MongoDB's flexible schema was ideal for this. However, for the user authentication and order management, a relational structure would have been better, and in hindsight I might have used PostgreSQL for those modules.",
        "To scale FlipMyBed to 100k users, I would implement horizontal scaling with multiple Node.js instances behind a load balancer, add Redis for session stickiness, implement database sharding on the listings collection based on geographic region, add a CDN for static assets, and implement a message queue for order processing to handle burst traffic."
    ]

    for i, answer in enumerate(answers):
        time.sleep(1)  # Small delay to not hit rate limits
        r = client.post(f"/api/interview/{interview_id}/answer", json={
            "answer": answer,
            "response_time_seconds": 15 + i * 5
        })
        assert r.status_code == 200
        data = r.json()
        eval_data = data.get("evaluation", {})
        tech_score = eval_data.get("technical_score", "N/A")
        comm_score = eval_data.get("communication_score", "N/A")
        print(f"  A{i+1} scored: Tech={tech_score}, Comm={comm_score}")

        if data["status"] == "completed":
            print(f"✓ Interview completed!")
            return interview_id

        next_q = data.get("next_question", "")
        difficulty = data.get("difficulty", "")
        print(f"  Q{i+2} [{difficulty}]: {next_q[:100]}...")

    return interview_id


def test_malpractice(interview_id):
    r = client.post(f"/api/interview/{interview_id}/malpractice", json={
        "event_type": "tab_switch",
        "timestamp": "2026-05-31T12:00:00Z"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["recorded"] is True
    print(f"✓ Malpractice tracked: suspicion_score={data['suspicion_score']}")


def test_dashboard():
    r = client.get("/api/dashboard/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["total_candidates"] >= 1
    assert data["total_interviews"] >= 1
    print(f"✓ Dashboard: {data['total_candidates']} candidates, {data['total_interviews']} interviews")

    r = client.get("/api/dashboard/live")
    assert r.status_code == 200
    live = r.json()
    print(f"✓ Live monitoring: {len(live['live_interviews'])} active interviews")


def main():
    print("=" * 60)
    print("InterviewOS End-to-End Integration Test")
    print("=" * 60)
    print()

    test_health()
    candidate_id = test_resume_upload()
    test_candidate_detail(candidate_id)
    interview_id = test_interview_flow(candidate_id)
    test_malpractice(interview_id)
    test_dashboard()

    print()
    print("=" * 60)
    print("ALL TESTS PASSED ✓")
    print("=" * 60)
    print()
    print("Services running:")
    print(f"  Backend:  {BASE_URL}")
    print(f"  Frontend: http://localhost:3000")
    print(f"  API Docs: {BASE_URL}/docs")
    print()
    print("Try it:")
    print(f"  1. Open http://localhost:3000 in browser")
    print(f"  2. Upload a PDF resume")
    print(f"  3. Click 'Start Interview'")
    print(f"  4. Answer questions (voice or text)")
    print(f"  5. View dashboard at http://localhost:3000/dashboard")


if __name__ == "__main__":
    main()
