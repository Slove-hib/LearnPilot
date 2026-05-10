"""API endpoint tests — tests the full request/response cycle."""


def test_health_check(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "LearnPilot" in res.json()["message"]


def test_goals_empty(client, auth_headers):
    res = client.get("/api/goals", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_tasks_today_empty(client, auth_headers):
    res = client.get("/api/tasks/today", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "date" in data
    assert data["tasks"] == []


def test_tasks_list_empty(client, auth_headers):
    res = client.get("/api/tasks", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_stats_empty(client, auth_headers):
    res = client.get("/api/stats/overview", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_goals"] == 0
    assert data["total_tasks"] == 0
    assert data["completion_rate"] == 0.0


def test_chat_history_nonexistent_goal(client, auth_headers):
    res = client.get("/api/chat/history?goal_id=999", headers=auth_headers)
    assert res.status_code == 404


def test_plan_nonexistent_goal(client, auth_headers):
    res = client.get("/api/goals/999/plan", headers=auth_headers)
    assert res.status_code == 404


def test_user_isolation(client):
    """User A cannot see User B's goals."""
    # User A
    client.post("/api/auth/register", json={"username": "userA", "password": "pass1234"})
    res_a = client.post("/api/auth/login", data={"username": "userA", "password": "pass1234"})
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    # User B
    client.post("/api/auth/register", json={"username": "userB", "password": "pass1234"})
    res_b = client.post("/api/auth/login", data={"username": "userB", "password": "pass1234"})
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # Both see empty goals
    assert client.get("/api/goals", headers=headers_a).json() == []
    assert client.get("/api/goals", headers=headers_b).json() == []


def test_task_status_update_nonexistent(client, auth_headers):
    res = client.patch("/api/tasks/999", json={"status": "done"}, headers=auth_headers)
    assert res.status_code == 404


def test_task_status_invalid(client, auth_headers):
    # Need a real task first — create via DB directly
    from database import get_db
    db = get_db()
    # Get user_id from auth_headers token
    from jose import jwt
    from config import JWT_SECRET_KEY, JWT_ALGORITHM
    token = auth_headers["Authorization"].split()[1]
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    user = db.execute("SELECT id FROM users WHERE username = ?", (payload["sub"],)).fetchone()
    user_id = user["id"]

    # Insert goal, phase, task directly
    cursor = db.execute(
        "INSERT INTO goals (user_id, title, daily_hours, duration_weeks, skill_level) VALUES (?, ?, ?, ?, ?)",
        (user_id, "Test Goal", 2, 4, "beginner"),
    )
    goal_id = cursor.lastrowid
    cursor = db.execute(
        "INSERT INTO phases (goal_id, title, sort_order, week_start, week_end) VALUES (?, ?, ?, ?, ?)",
        (goal_id, "Phase 1", 0, 1, 2),
    )
    phase_id = cursor.lastrowid
    cursor = db.execute(
        "INSERT INTO tasks (phase_id, goal_id, title, task_date, task_type, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        (phase_id, goal_id, "Task 1", "2026-01-01", "learn", 0),
    )
    task_id = cursor.lastrowid
    db.commit()

    # Invalid status
    res = client.patch(f"/api/tasks/{task_id}", json={"status": "invalid"}, headers=auth_headers)
    assert res.status_code == 422

    # Valid status
    res = client.patch(f"/api/tasks/{task_id}", json={"status": "done"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "done"
