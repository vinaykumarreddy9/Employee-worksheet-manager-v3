from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models.models import Employee
from app.schemas.schemas import EmployeeCreate, EmployeeLogin

import logging

class AuthService:
    @staticmethod
    async def create_user(db: AsyncSession, employee_data: EmployeeCreate):
        try:
            # Check if email exists
            result = await db.execute(select(Employee).filter(Employee.email == employee_data.email))
            if result.scalars().first():
                raise HTTPException(status_code=400, detail="Email already registered")
            
            # Check if employee_id exists
            result = await db.execute(select(Employee).filter(Employee.employee_id == employee_data.employee_id))
            if result.scalars().first():
                raise HTTPException(status_code=400, detail="Employee ID already exists")

            new_employee = Employee(
                name=employee_data.name,
                employee_id=employee_data.employee_id,
                email=employee_data.email,
                password=employee_data.password, # Storing raw as requested
                role=employee_data.role
            )
            db.add(new_employee)
            await db.commit()
            await db.refresh(new_employee)
            return new_employee
        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"Error creating user {employee_data.email}: {str(e)}")
            await db.rollback()
            raise HTTPException(status_code=500, detail="An error occurred while creating your account")

    @staticmethod
    async def authenticate_user(db: AsyncSession, credentials: EmployeeLogin):
        try:
            result = await db.execute(select(Employee).filter(Employee.email == credentials.email))
            employee = result.scalars().first()
            
            if not employee or employee.password != credentials.password:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            return {
                "id": employee.id,
                "name": employee.name,
                "email": employee.email,
                "role": employee.role,
                "employee_id": employee.employee_id
            }
        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"Authentication error for {credentials.email}: {str(e)}")
            raise HTTPException(status_code=500, detail="Authentication failed due to a server error")
