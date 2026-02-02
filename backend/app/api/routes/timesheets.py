from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.timesheet_service import TimesheetService
from app.schemas.timesheet_schemas import TimesheetCreateRequest, TimesheetResponse
from typing import List

router = APIRouter(prefix="/timesheets", tags=["timesheets"])

@router.post("/save", response_model=List[TimesheetResponse])
async def save_timesheet(
    data: TimesheetCreateRequest, 
    email: str,
    status: str = "Pending",
    db: AsyncSession = Depends(get_db)
):
    return await TimesheetService.create_pending_entries(db, email, data, status)

@router.get("/week", response_model=List[TimesheetResponse])
async def get_timesheet_by_week(
    email: str,
    week_start_date: str,
    db: AsyncSession = Depends(get_db)
):
    return await TimesheetService.get_entries_by_week(db, email, week_start_date)
