from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import PendingTimesheet
from app.schemas.timesheet_schemas import TimesheetCreateRequest
from typing import List
import uuid

import logging
from sqlalchemy import delete, select
from datetime import datetime
from fastapi import HTTPException

class TimesheetService:
    @staticmethod
    async def create_pending_entries(db: AsyncSession, email: str, data: TimesheetCreateRequest, status: str = "Pending"):
        try:
            # 1. Clean up existing entries for this week/user to avoid duplicates
            delete_stmt = delete(PendingTimesheet).where(
                PendingTimesheet.email == email,
                PendingTimesheet.week_start_date == data.week_start_date
            )
            await db.execute(delete_stmt)
            
            # 2. Insert new entries as a fresh set
            new_entries = []
            for entry in data.entries:
                db_entry = PendingTimesheet(
                    entry_id=str(uuid.uuid4()),
                    email=email,
                    week_start_date=data.week_start_date,
                    date=entry.date,
                    hours=entry.hours,
                    project_name=entry.project_name,
                    task_description=entry.task_description,
                    status=status,
                    work_type=entry.work_type
                )
                db.add(db_entry)
                new_entries.append(db_entry)
            
            await db.commit()
            for entry in new_entries:
                await db.refresh(entry)
            return new_entries
        except Exception as e:
            await db.rollback()
            logging.error(f"Failed to save timesheet for {email}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save timesheet data")

    @staticmethod
    async def get_entries_by_week(db: AsyncSession, email: str, week_start_date: str):
        try:
            try:
                ws_date = datetime.strptime(week_start_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

            result = await db.execute(
                select(PendingTimesheet).filter(
                    PendingTimesheet.email == email,
                    PendingTimesheet.week_start_date == ws_date
                ).order_by(PendingTimesheet.date)
            )
            return result.scalars().all()
        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"Error fetching timesheet for {email} on {week_start_date}: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving timesheet data")
