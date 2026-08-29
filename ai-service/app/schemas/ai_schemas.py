"""
Pydantic schema definitions for AI Assistant queries, parameters, and structured outputs.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=1000, description="Natural language query string")


class TimeWindow(BaseModel):
    name: str
    startHour: int
    endHour: int


class ExtractedParams(BaseModel):
    minCapacity: Optional[int] = None
    resourceType: Optional[str] = None
    preferredDate: Optional[str] = None
    timeWindow: Optional[TimeWindow] = None
    keywords: List[str] = Field(default_factory=list)


class SuggestedSlot(BaseModel):
    resourceId: Any
    resourceName: str
    startTime: str
    endTime: str


class SuggestedAction(BaseModel):
    label: str
    action: str
    payload: Optional[Dict[str, Any]] = None


class AiResponseData(BaseModel):
    intent: str
    extractedParams: ExtractedParams
    suggestedResources: List[Dict[str, Any]] = Field(default_factory=list)
    suggestedSlots: List[SuggestedSlot] = Field(default_factory=list)
    naturalLanguageResponse: str
    suggestedActions: List[SuggestedAction] = Field(default_factory=list)


class ApiResponse(BaseModel):
    success: bool = True
    data: AiResponseData
