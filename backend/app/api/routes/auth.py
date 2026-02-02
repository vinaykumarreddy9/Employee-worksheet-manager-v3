from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.schemas.schemas import EmployeeCreate, EmployeeLogin, EmployeeResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=EmployeeResponse)
async def signup(employee: EmployeeCreate, db: AsyncSession = Depends(get_db)):
    return await AuthService.create_user(db, employee)

@router.post("/login")
async def login(credentials: EmployeeLogin, db: AsyncSession = Depends(get_db)):
    return await AuthService.authenticate_user(db, credentials)
