"""
AI Query API Router.
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.ai_schemas import QueryRequest, ApiResponse
from app.services.gemini_service import process_query

router = APIRouter(prefix="/query", tags=["AI Advisor"])


@router.post("", response_model=ApiResponse, status_code=status.HTTP_200_OK)
async def query_ai(request: QueryRequest) -> ApiResponse:
    """
    Receives natural language query, parses intent and parameters,
    and returns structured recommendations.
    """
    try:
        response_data = process_query(request.prompt)
        return ApiResponse(success=True, data=response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing AI query: {str(e)}",
        )
