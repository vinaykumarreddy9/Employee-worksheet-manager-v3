from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.admin_service import AdminService
from app.schemas.timesheet_schemas import AdminActionRequest
from typing import List

router = APIRouter()

@router.get("/submitted-weeks")
async def get_submitted_weeks(db: AsyncSession = Depends(get_db)):
    weeks = await AdminService.get_submitted_weeks(db)
    # Convert result to a cleaner dictionary list
    return [{"email": w[0], "week_start_date": w[1], "name": w[2], "employee_id": w[3]} for w in weeks]

@router.post("/approve")
async def approve_week(data: AdminActionRequest, admin_email: str = "admin@system.com", db: AsyncSession = Depends(get_db)):
    success = await AdminService.approve_week(db, data.email, data.week_start_date, admin_email)
    if success:
        return {"message": "Timesheet approved successfully"}
    raise HTTPException(status_code=400, detail="Approval failed")

@router.post("/reject")
async def reject_week(data: AdminActionRequest, admin_email: str = "admin@system.com", db: AsyncSession = Depends(get_db)):
    if not data.reason:
        raise HTTPException(status_code=400, detail="Rejection reason required")
    
    success = await AdminService.reject_week(db, data.email, data.week_start_date, data.reason, admin_email)
    if success:
        return {"message": "Timesheet rejected successfully"}
    raise HTTPException(status_code=400, detail="Rejection failed")
