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
    @staticmethod
    async def get_approved_reports(db: AsyncSession, from_date: date = None, to_date: date = None):
        """Returns a list of all approved timesheets with employee details within a date range."""
        try:
            stmt = select(
                ApprovedTimesheet.email,
                ApprovedTimesheet.week_start_date,
                ApprovedTimesheet.total_hours,
                Employee.name,
                Employee.employee_id
            ).join(Employee, Employee.email == ApprovedTimesheet.email)
            
            if from_date:
                stmt = stmt.where(ApprovedTimesheet.week_start_date >= from_date)
            if to_date:
                stmt = stmt.where(ApprovedTimesheet.week_start_date <= to_date)
                
            stmt = stmt.order_by(ApprovedTimesheet.approved_at.desc())
            
            result = await db.execute(stmt)
            return result.all()
        except Exception as e:
            logging.error(f"Error fetching approved reports: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching reports")

    @staticmethod
    async def get_stats(db: AsyncSession, from_date: date = None, to_date: date = None):
        """Calculates summary statistics for the admin dashboard within a date range."""
        try:
            # Stats for Approved
            total_hours_stmt = select(func.sum(ApprovedTimesheet.total_hours))
            approved_count_stmt = select(func.count(ApprovedTimesheet.timesheet_id))
            
            if from_date:
                total_hours_stmt = total_hours_stmt.where(ApprovedTimesheet.week_start_date >= from_date)
                approved_count_stmt = approved_count_stmt.where(ApprovedTimesheet.week_start_date >= from_date)
            if to_date:
                total_hours_stmt = total_hours_stmt.where(ApprovedTimesheet.week_start_date <= to_date)
                approved_count_stmt = approved_count_stmt.where(ApprovedTimesheet.week_start_date <= to_date)
                
            total_hours = (await db.execute(total_hours_stmt)).scalar() or 0.0
            approved_count = (await db.execute(approved_count_stmt)).scalar() or 0
            
            # Pending and Rejected are usually global or based on current state, 
            # but we can filter them by week_start_date too if needed.
            # Keeping pending/rejected relative to the same period for report consistency.
            pending_count_stmt = select(func.count(func.distinct(PendingTimesheet.email, PendingTimesheet.week_start_date)))\
                .where(PendingTimesheet.status == "Submitted")
            rejected_count_stmt = select(func.count(DeniedTimesheet.timesheet_id))
            
            if from_date:
                pending_count_stmt = pending_count_stmt.where(PendingTimesheet.week_start_date >= from_date)
                rejected_count_stmt = rejected_count_stmt.where(DeniedTimesheet.week_start_date >= from_date)
            if to_date:
                pending_count_stmt = pending_count_stmt.where(PendingTimesheet.week_start_date <= to_date)
                rejected_count_stmt = rejected_count_stmt.where(DeniedTimesheet.week_start_date <= to_date)

            pending_count = (await db.execute(pending_count_stmt)).scalar() or 0
            rejected_count = (await db.execute(rejected_count_stmt)).scalar() or 0
            
            total_count = approved_count + pending_count + rejected_count
            
            return {
                "total_hours": round(total_hours, 1),
                "approved": approved_count,
                "pending": pending_count,
                "rejected": rejected_count,
                "total": total_count
            }
        except Exception as e:
            logging.error(f"Error fetching stats: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching statistics")

    @staticmethod
    async def get_report_stats(db: AsyncSession, from_date: date = None, to_date: date = None):
        """Calculates specific hour totals (Approved, Pending, Rejected) for the reports page."""
        try:
            # Query all entries in range to get sums by status
            stmt = select(PendingTimesheet.status, func.sum(PendingTimesheet.hours))
            
            if from_date:
                stmt = stmt.where(PendingTimesheet.week_start_date >= from_date)
            if to_date:
                stmt = stmt.where(PendingTimesheet.week_start_date <= to_date)
                
            stmt = stmt.group_by(PendingTimesheet.status)
            
            result = await db.execute(stmt)
            rows = result.all()
            
            status_hours = {
                "Approved": 0.0,
                "Submitted": 0.0,
                "Denied": 0.0,
                "Pending": 0.0
            }
            
            for status, hours in rows:
                if status in status_hours:
                    status_hours[status] = float(hours or 0.0)
            
            total_registered = sum(status_hours.values())
            
            return {
                "total_hours": round(total_registered, 1),
                "approved": round(status_hours["Approved"], 1),
                "pending": round(status_hours["Submitted"], 1),
                "rejected": round(status_hours["Denied"], 1)
            }
        except Exception as e:
            logging.error(f"Error in report stats: {str(e)}")
            raise HTTPException(status_code=500, detail="Error calculating metrics")

    @staticmethod
    async def get_report_list(db: AsyncSession, from_date: date, to_date: date, status: str):
        """Returns a list of unique week submissions filtered by status and date."""
        try:
            # Map frontend statuses to DB statuses
            status_map = {
                "Approved": "Approved",
                "Pending": "Submitted",
                "Rejected": "Denied"
            }
            db_status = status_map.get(status, "Approved")
            
            stmt = select(
                PendingTimesheet.email,
                PendingTimesheet.week_start_date,
                func.sum(PendingTimesheet.hours),
                Employee.name,
                Employee.employee_id
            ).join(Employee, Employee.email == PendingTimesheet.email)\
             .where(PendingTimesheet.status == db_status)
            
            if from_date:
                stmt = stmt.where(PendingTimesheet.week_start_date >= from_date)
            if to_date:
                stmt = stmt.where(PendingTimesheet.week_start_date <= to_date)
                
            stmt = stmt.group_by(PendingTimesheet.email, PendingTimesheet.week_start_date, Employee.name, Employee.employee_id)\
                 .order_by(PendingTimesheet.week_start_date.desc())
            
            result = await db.execute(stmt)
            return result.all()
        except Exception as e:
            logging.error(f"Error in report list: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching report rows")

    @staticmethod
    async def get_detailed_report_data(db: AsyncSession, from_date: date, to_date: date, status: str):
        """Returns raw database entries for Excel export, filtered by status and date."""
        try:
            status_map = {
                "Approved": "Approved",
                "Pending": "Submitted",
                "Rejected": "Denied"
            }
            db_status = status_map.get(status, "Approved")
            
            # Select all columns from PendingTimesheet and essential Employee columns
            stmt = select(PendingTimesheet, Employee.name, Employee.employee_id)\
                .join(Employee, Employee.email == PendingTimesheet.email)\
                .where(PendingTimesheet.status == db_status)
            
            if from_date:
                stmt = stmt.where(PendingTimesheet.week_start_date >= from_date)
            if to_date:
                stmt = stmt.where(PendingTimesheet.week_start_date <= to_date)
            
            stmt = stmt.order_by(PendingTimesheet.date.asc())
            
            result = await db.execute(stmt)
            return result.all()
        except Exception as e:
            logging.error(f"Error in detailed report data: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching export data")
