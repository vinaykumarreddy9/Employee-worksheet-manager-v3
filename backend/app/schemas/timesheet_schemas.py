from pydantic import BaseModel, Field, field_validator
from datetime import date as date_type
from typing import List, Optional
from app.models.models import WorkType

class TimesheetEntryBase(BaseModel):
    date: date_type
    hours: float = Field(..., ge=0, le=8)
    task_description: str
    work_type: WorkType

class TimesheetCreateRequest(BaseModel):
    week_start_date: date_type
    entries: List[TimesheetEntryBase]

    @field_validator('entries')
    @classmethod
    def validate_daily_totals(cls, v):
        totals = {}
        for entry in v:
            totals[entry.date] = totals.get(entry.date, 0) + entry.hours
            if totals[entry.date] > 8:
                raise ValueError(f"Total hours for {entry.date} cannot exceed 8 hours")
        return v

class TimesheetResponse(BaseModel):
    entry_id: str
    email: str
    date: date_type
    hours: float
    task_description: str
    work_type: WorkType
    status: str
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True

class AdminActionRequest(BaseModel):
    email: str
    week_start_date: date_type
    reason: Optional[str] = None
