import httpx

c = httpx.Client(timeout=30, follow_redirects=True)

print("=== BACKEND TESTS ===")
r = c.get("https://backend-one-sigma-73.vercel.app/health")
print(f"  /health: {r.status_code} -> {r.json()}")

r = c.get("https://backend-one-sigma-73.vercel.app/docs")
has_swagger = "swagger" in r.text.lower()
print(f"  /docs: {r.status_code} (Swagger: {has_swagger})")

r = c.post("https://backend-one-sigma-73.vercel.app/api/auth/signup", json={"email":"deploy-verify2@test.com","password":"test123","name":"Deploy Test","role":"candidate"})
print(f"  POST /api/auth/signup: {r.status_code}")

r = c.post("https://backend-one-sigma-73.vercel.app/api/auth/login", json={"email":"recruiter@test.com","password":"test123"})
print(f"  POST /api/auth/login: {r.status_code}")
token = r.json()["access_token"] if r.status_code == 200 else ""

if token:
    r = c.get("https://backend-one-sigma-73.vercel.app/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    print(f"  GET /api/auth/me: {r.status_code} -> {r.json()['name']}")

r = c.get("https://backend-one-sigma-73.vercel.app/api/resume/candidates")
print(f"  GET /api/resume/candidates: {r.status_code} ({len(r.json())} candidates)")

r = c.get("https://backend-one-sigma-73.vercel.app/api/dashboard/stats")
print(f"  GET /api/dashboard/stats: {r.status_code} -> {r.json()}")

r = c.get("https://backend-one-sigma-73.vercel.app/api/dashboard/live")
print(f"  GET /api/dashboard/live: {r.status_code}")

print()
print("=== FRONTEND TESTS ===")
pages = ["/", "/login", "/signup", "/recruiter/dashboard", "/recruiter/candidates", "/recruiter/upload", "/candidate/interviews", "/candidate/profile"]
for p in pages:
    r = c.get(f"https://frontend-beryl-six-58.vercel.app{p}")
    print(f"  {p}: {r.status_code}")

print()
print("=== ALL TESTS COMPLETE ===")
