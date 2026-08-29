"""
FastAPI AI Advisor Sidecar Microservice Main Application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import query

app = FastAPI(
    title="Academic Booking Portal - AI Advisor Sidecar",
    description="Intelligent NL Query parser and recommendation engine.",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for sidecar liveness probes.
    """
    return {
        "status": "healthy",
        "service": "academic-booking-ai-sidecar",
        "version": "1.0.0",
    }


# Include Routers
app.include_router(query.router, prefix="/api/v1/ai")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
