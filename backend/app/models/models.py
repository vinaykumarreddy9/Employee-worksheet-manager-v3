from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class WorkType(str, enum.Enum):
    BILLABLE = "Billable"
    HOLIDAY = "Holiday"

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False) # Store 'Employee' or 'Admin'

class PendingTimesheet(Base):
    __tablename__ = "pending_timesheets"

    entry_id = Column(String, primary_key=True, index=True, server_default=func.gen_random_uuid())
    email = Column(String, index=True, nullable=False)
    week_start_date = Column(Date, nullable=False)
    date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)
    task_description = Column(String, nullable=False)
    status = Column(String, default="Pending")
    rejection_reason = Column(String, nullable=True) # Feedback from admin
    work_type = Column(Enum(WorkType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ApprovedTimesheet(Base):
    __tablename__ = "approved_timesheets"

    timesheet_id = Column(String, primary_key=True, index=True, server_default=func.gen_random_uuid())
    email = Column(String, index=True, nullable=False)
    week_start_date = Column(Date, nullable=False)
    total_hours = Column(Float, nullable=False)
    approval_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    approved_by = Column(String, nullable=False)

class DeniedTimesheet(Base):
    __tablename__ = "denied_timesheets"

    timesheet_id = Column(String, primary_key=True, index=True, server_default=func.gen_random_uuid())
    email = Column(String, index=True, nullable=False)
    week_start_date = Column(Date, nullable=False)
    rejection_reason = Column(String, nullable=False)
    denied_at = Column(DateTime(timezone=True), server_default=func.now())
    denied_by = Column(String, nullable=False)
