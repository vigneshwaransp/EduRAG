from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.summary import SummaryRequest, SummaryResponse
from app.api.deps import get_current_user
from app.services.summary_service import summary_service

router = APIRouter(prefix="/summaries", tags=["Summaries"])

@router.post("", response_model=SummaryResponse)
async def generate_document_summary(
    request: SummaryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await summary_service.generate_summary(
        user_id=user.id,
        document_ids=request.document_ids,
        mode=request.mode,
        topic_focus=request.topic_focus,
        db=db
    )
    return SummaryResponse.model_validate(result)
