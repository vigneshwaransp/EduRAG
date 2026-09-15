from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.analytics import DashboardMetricsResponse
from app.api.deps import get_current_user
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Study Analytics"])

@router.get("", response_model=DashboardMetricsResponse)
async def get_analytics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    data = await analytics_service.get_dashboard_metrics(user.id, db)
    return DashboardMetricsResponse.model_validate(data)
