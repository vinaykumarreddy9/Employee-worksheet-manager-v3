from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.sql import func
from app.models.models import PendingTimesheet, ApprovedTimesheet, DeniedTimesheet, Employee
from datetime import date
from typing import List
import uuid

import logging
from fastapi import HTTPException

class AdminService:
    @staticmethod
    async def get_submitted_weeks(db: AsyncSession):
        """Returns a list of unique weeks and users who have submitted timesheets."""
        try:
            stmt = select(
                PendingTimesheet.email,
                PendingTimesheet.week_start_date,
                Employee.name,
                Employee.employee_id
            ).join(Employee, Employee.email == PendingTimesheet.email)\
             .where(PendingTimesheet.status == "Submitted")\
             .distinct()
            
            result = await db.execute(stmt)
            return result.all()
        except Exception as e:
            logging.error(f"Error fetching submitted weeks: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching submitted data")

    @staticmethod
    async def approve_week(db: AsyncSession, email: str, week_start_date: date, admin_email: str):
        """Approves all entries for a given week and user."""
        try:
            # 1. Update status to Approved in Pending
            stmt = update(PendingTimesheet).where(
                PendingTimesheet.email == email,
                PendingTimesheet.week_start_date == week_start_date,
                PendingTimesheet.status == "Submitted"
            ).values(status="Approved", rejection_reason=None)
            
            await db.execute(stmt)
            
            # 2. Record approval in ApprovedTimesheet summary
            # Calculate total hours
            hours_stmt = select(func.sum(PendingTimesheet.hours)).where(
                PendingTimesheet.email == email,
                PendingTimesheet.week_start_date == week_start_date
            )
            total_hours = (await db.execute(hours_stmt)).scalar() or 0.0
            
            approval = ApprovedTimesheet(
                timesheet_id=str(uuid.uuid4()),
                email=email,
                week_start_date=week_start_date,
                total_hours=total_hours,
                approved_by=admin_email
            )
            db.add(approval)
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            logging.error(f"Error approving week for {email} on {week_start_date}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to approve timesheet")

    @staticmethod
    async def reject_week(db: AsyncSession, email: str, week_start_date: date, reason: str, admin_email: str):
        """Rejects the week, moves status to Denied, remains in Pending for editing."""
        try:
            # Update status and add reason
            stmt = update(PendingTimesheet).where(
                PendingTimesheet.email == email,
                PendingTimesheet.week_start_date == week_start_date,
                PendingTimesheet.status == "Submitted"
            ).values(status="Denied", rejection_reason=reason)
            
            await db.execute(stmt)
            
            # Log to Denied history
            denial = DeniedTimesheet(
                timesheet_id=str(uuid.uuid4()),
                email=email,
                week_start_date=week_start_date,
                rejection_reason=reason,
                denied_by=admin_email
            )
            db.add(denial)
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            logging.error(f"Error rejecting week for {email} on {week_start_date}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to reject timesheet")
