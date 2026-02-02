import pytest
import httpx
import uuid
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

@pytest.fixture
def random_email():
    return f"user_{uuid.uuid4().hex[:8]}@example.com"

@pytest.fixture
def admin_email():
    return f"admin_{uuid.uuid4().hex[:8]}@example.com"

def test_full_application_lifecycle(random_email, admin_email):
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # 1. Signup Employee
        signup_res = client.post("/auth/signup", json={
            "name": "Integration Test User",
            "employee_id": f"EMP_{uuid.uuid4().hex[:4].upper()}",
            "email": random_email,
            "password": "password123",
            "role": "Employee"
        })
        assert signup_res.status_code == 200
        
        # 2. Login Employee
        login_res = client.post("/auth/login", json={
            "email": random_email,
            "password": "password123"
        })
        assert login_res.status_code == 200
        user_data = login_res.json()
        assert user_data["email"] == random_email

        # 3. Save Draft (Valid data, but not submitted)
        today = datetime.now()
        sun = today - timedelta(days=today.weekday() + 1)
        week_start = sun.strftime("%Y-%m-%d")
        
        monday = (sun + timedelta(days=1)).strftime("%Y-%m-%d")
        
        draft_payload = {
            "week_start_date": week_start,
            "entries": [
                {
                    "date": monday,
                    "hours": 4.0,
                    "task_description": "Working on draft",
                    "work_type": "Billable"
                }
            ]
        }
        
        save_res = client.post(f"/timesheets/save?email={random_email}&status=Pending", json=draft_payload)
        assert save_res.status_code == 200
        
        # 4. Verify draft exists
        get_res = client.get(f"/timesheets/week?email={random_email}&week_start_date={week_start}")
        assert get_res.status_code == 200
        assert len(get_res.json()) == 1
        assert get_res.json()[0]["status"] == "Pending"

        # 5. Submit 40-hour week
        # Create 5 days of 8 hours
        full_entries = []
        for i in range(1, 6):
            d = (sun + timedelta(days=i)).strftime("%Y-%m-%d")
            full_entries.append({
                "date": d,
                "hours": 8.0,
                "task_description": f"Day {i} tasks",
                "work_type": "Billable"
            })
            
        submit_payload = {
            "week_start_date": week_start,
            "entries": full_entries
        }
        
        submit_res = client.post(f"/timesheets/save?email={random_email}&status=Submitted", json=submit_payload)
        assert submit_res.status_code == 200
        
        # 6. Verify submitted status
        verify_res = client.get(f"/timesheets/week?email={random_email}&week_start_date={week_start}")
        assert verify_res.json()[0]["status"] == "Submitted"

        # 7. Signup Admin
        admin_signup = client.post("/auth/signup", json={
            "name": "Integration Admin",
            "employee_id": f"ADM_{uuid.uuid4().hex[:4].upper()}",
            "email": admin_email,
            "password": "adminpassword",
            "role": "Admin"
        })
        assert admin_signup.status_code == 200

        # 8. Admin View Submissions
        admin_view = client.get("/admin/submitted-weeks")
        assert admin_view.status_code == 200
        submissions = admin_view.json()
        assert any(s["email"] == random_email for s in submissions)

        # 9. Admin Approve
        approve_res = client.post(f"/admin/approve?admin_email={admin_email}", json={
            "email": random_email,
            "week_start_date": week_start
        })
        assert approve_res.status_code == 200

        # 10. Final Status Check
        final_res = client.get(f"/timesheets/week?email={random_email}&week_start_date={week_start}")
        assert final_res.json()[0]["status"] == "Approved"

def test_validation_daily_max(random_email):
    with httpx.Client(base_url=BASE_URL) as client:
        client.post("/auth/signup", json={
            "name": "Validation User", "employee_id": "V001", "email": random_email, "password": "p", "role": "Employee"
        })
        
        today = datetime.now()
        week_start = (today - timedelta(days=today.weekday() + 1)).strftime("%Y-%m-%d")
        monday = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
        
        # Attempt to save 9 hours in one day
        bad_payload = {
            "week_start_date": week_start,
            "entries": [{"date": monday, "hours": 9.0, "task_description": "Overwork", "work_type": "Billable"}]
        }
        res = client.post(f"/timesheets/save?email={random_email}", json=bad_payload)
        # Should fail due to Pydantic validation (le=8)
        assert res.status_code == 422 

def test_auth_failure(random_email):
    with httpx.Client(base_url=BASE_URL) as client:
        # 1. Signup
        client.post("/auth/signup", json={
            "name": "Auth Failure Tester", "employee_id": "F001", "email": random_email, "password": "right_password", "role": "Employee"
        })
        
        # 2. Login with wrong password
        login_res = client.post("/auth/login", json={
            "email": random_email,
            "password": "wrong_password"
        })
        assert login_res.status_code == 401
        assert "Invalid" in login_res.json()["detail"]
