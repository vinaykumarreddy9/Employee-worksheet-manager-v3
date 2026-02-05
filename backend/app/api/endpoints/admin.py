from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.admin_service import AdminService
from app.schemas.timesheet_schemas import AdminActionRequest
from datetime import date
from typing import List
import io
import pandas as pd

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

@router.get("/stats")
async def get_stats(from_date: date = None, to_date: date = None, db: AsyncSession = Depends(get_db)):
    return await AdminService.get_stats(db, from_date, to_date)
    
@router.get("/reports/stats")
async def get_reports_stats(from_date: date = None, to_date: date = None, db: AsyncSession = Depends(get_db)):
    try:
        return await AdminService.get_report_stats(db, from_date, to_date)
    except HTTPException as e:
        raise e
    except Exception as e:
        import logging
        logging.error(f"REPORTS STATS ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/filtered")
async def get_filtered_reports(status: str = "Approved", from_date: date = None, to_date: date = None, db: AsyncSession = Depends(get_db)):
    try:
        rows = await AdminService.get_report_list(db, from_date, to_date, status)
        return [
            {
                "email": r[0],
                "week_start_date": r[1].isoformat() if hasattr(r[1], 'isoformat') else str(r[1]),
                "hours": f"{round(float(r[2] or 0.0), 1)}h",
                "name": r[3],
                "employee_id": r[4],
                "status": status
            }
            for r in rows
        ]
    except HTTPException as e:
        raise e
    except Exception as e:
        import logging
        logging.error(f"REPORTS LIST ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/download")
async def download_report(status: str = "Approved", from_date: date = None, to_date: date = None, db: AsyncSession = Depends(get_db)):
    try:
        results = await AdminService.get_detailed_report_data(db, from_date, to_date, status)
        
        if not results:
            raise HTTPException(status_code=404, detail="No data available for the selected period")

        # Dynamically build data list from DB rows
        data_list = []
        from datetime import datetime, time
        
        for row in results:
            entry = row[0]  # PendingTimesheet object
            emp_name = row[1]
            emp_id = row[2]
            
            # Use __dict__ but filter out SQLAlchemy internals
            # Also strip timezones from datetime/time objects as Excel doesn't support them
            entry_data = {}
            for k, v in entry.__dict__.items():
                if not k.startswith('_'):
                    if isinstance(v, (datetime, time)) and v.tzinfo:
                        entry_data[k] = v.replace(tzinfo=None)
                    else:
                        entry_data[k] = v
            
            # Add employee specific info
            entry_data["employee_name"] = emp_name
            entry_data["employee_id"] = emp_id
            
            data_list.append(entry_data)

        df = pd.DataFrame(data_list)

        # Create Excel in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Database_Export')
        
        output.seek(0)
        
        filename = f"DB_Export_{status}_{from_date}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        import logging
        logging.error(f"DOWNLOAD ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
