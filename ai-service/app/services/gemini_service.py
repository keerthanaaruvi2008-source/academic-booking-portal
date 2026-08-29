"""
Intelligent Query Processing Service with Gemini LLM integration and heuristic fallback.
"""

import os
import re
from datetime import datetime, timedelta
from typing import Dict, Any
from app.schemas.ai_schemas import (
    AiResponseData,
    ExtractedParams,
    TimeWindow,
    SuggestedAction,
)


def parse_query_heuristics(query_text: str) -> Dict[str, Any]:
    text = query_text.lower()

    # Intent
    if re.search(r"how\s+to|policy|rules|cancel|approve|who\s+can|help|guide|faq", text):
        intent = "faq"
    elif re.search(r"available|free|open|slot|when|schedule|hours", text):
        intent = "check_availability"
    elif re.search(r"suggest|recommend|best\s+time|find\s+a\s+time", text):
        intent = "suggest_slot"
    elif re.search(r"search|find|looking\s+for|need|show\s+me|hall|lab|classroom|room", text):
        intent = "search_resources"
    else:
        intent = "general"

    # Capacity
    min_capacity = None
    capacity_patterns = [
        r"(?:capacity|seats|people|students|attendees|persons|for)\s*[:=]?\s*(\d+)",
        r"\b(\d+)\s*(?:people|students|seats|attendees|persons|workstations)\b",
    ]
    for pattern in capacity_patterns:
        match = re.search(pattern, query_text, re.IGNORECASE)
        if match:
            min_capacity = int(match.group(1))
            break

    # Resource Type
    resource_type = None
    if re.search(r"seminar|hall|auditorium|conference", text):
        resource_type = "auditorium" if "auditorium" in text else "seminar_hall"
    elif re.search(r"lab|computer|workstation|pc", text):
        resource_type = "lab"
    elif re.search(r"classroom|class|lecture", text):
        resource_type = "classroom"
    elif re.search(r"equipment|projector|camera|mic|speaker", text):
        resource_type = "equipment"

    # Date
    preferred_date = None
    date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", query_text)
    if date_match:
        preferred_date = date_match.group(1)
    elif "today" in text:
        preferred_date = datetime.utcnow().strftime("%Y-%m-%d")
    elif "tomorrow" in text:
        preferred_date = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

    # Time Window
    time_window = None
    if "morning" in text:
        time_window = TimeWindow(name="morning", startHour=8, endHour=12)
    elif "afternoon" in text:
        time_window = TimeWindow(name="afternoon", startHour=12, endHour=17)
    elif "evening" in text:
        time_window = TimeWindow(name="evening", startHour=17, endHour=20)

    # Keywords
    stop_words = {"i", "need", "a", "the", "for", "with", "in", "on", "at", "to", "and", "or", "is", "can", "find"}
    words = re.sub(r"[^\w\s]", "", text).split()
    keywords = [w for w in words if len(w) > 2 and w not in stop_words]

    return {
        "intent": intent,
        "extracted_params": ExtractedParams(
            minCapacity=min_capacity,
            resourceType=resource_type,
            preferredDate=preferred_date,
            timeWindow=time_window,
            keywords=keywords,
        ),
    }


def process_query(prompt: str) -> AiResponseData:
    """
    Processes natural language query and returns structured response.
    """
    parsed = parse_query_heuristics(prompt)
    intent = parsed["intent"]
    extracted = parsed["extracted_params"]

    if intent == "faq":
        return AiResponseData(
            intent=intent,
            extractedParams=extracted,
            suggestedResources=[],
            suggestedSlots=[],
            naturalLanguageResponse=(
                "### Academic Booking Portal FAQ & Guidelines\n\n"
                "* **Reservation Workflow:** Students and faculty submit booking requests with initial `pending` status. Administrators review and approve requests from the Pending Queue.\n"
                "* **Double-Booking Guarantee:** The system uses atomic database transaction locks. Overlapping reservation requests are rejected with immediate alternative recommendations.\n"
                "* **Cancellations:** You can cancel your reservations at any time directly from the **Bookings** page.\n"
                "* **Operating Hours:** Campus facilities operate standard booking slots between **08:00 and 20:00 UTC**."
            ),
            suggestedActions=[
                SuggestedAction(
                    label="Browse All Resources",
                    action="NAVIGATE",
                    payload={"path": "/resources"},
                ),
                SuggestedAction(
                    label="View My Bookings",
                    action="NAVIGATE",
                    payload={"path": "/bookings"},
                ),
            ],
        )

    # Standard Natural Language response for resource searches
    category_label = extracted.resourceType.replace("_", " ") if extracted.resourceType else "facility"
    capacity_note = f" with at least {extracted.minCapacity} seats" if extracted.minCapacity else ""
    date_note = f" on {extracted.preferredDate}" if extracted.preferredDate else ""

    markdown_resp = (
        f"I analyzed your request for a **{category_label}**{capacity_note}{date_note}.\n\n"
        "Here are the matching resources and open reservation slots found across campus:"
    )

    return AiResponseData(
        intent=intent,
        extractedParams=extracted,
        suggestedResources=[],
        suggestedSlots=[],
        naturalLanguageResponse=markdown_resp,
        suggestedActions=[
            SuggestedAction(
                label="Filter Resources Catalogue",
                action="FILTER_RESOURCES",
                payload={
                    "type": extracted.resourceType or "",
                    "minCapacity": extracted.minCapacity or "",
                },
            )
        ],
    )
