from pydantic import BaseModel, EmailStr, Field
from typing import Literal

class EmployeeBase(BaseModel):
    name: str
    employee_id: str
    email: EmailStr
    role: Literal["Employee", "Admin"]

class EmployeeCreate(EmployeeBase):
    password: str

class EmployeeLogin(BaseModel):
    email: EmailStr
    password: str

class EmployeeResponse(EmployeeBase):
    id: int

    class Config:
        from_attributes = True
