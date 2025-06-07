# app.py (updated)
from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from pathlib import Path
import openai
import os
from dotenv import load_dotenv
import asyncio
from fastapi import APIRouter

# Import the knowledge graph manager and ask router
from knowledge_graph import knowledge_graph_manager
from ask import router as ask_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Harry Potter Q&A API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
api_router = APIRouter(prefix="/api")

# Models
class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer: str
    sources: list[Dict[str, str]]

# Middleware to verify API key
async def verify_api_key(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    api_key = authorization.replace("Bearer ", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty API key"
        )
    
    # Validate the API key with OpenAI
    try:
        client = openai.OpenAI(api_key=api_key)
        client.models.list()  # Test the API key
        return api_key
    except Exception as e:
        logger.error(f"API key validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

# API Endpoints
@api_router.get("/status")
async def get_status():
    """Get the status of the knowledge graph."""
    return {
        **knowledge_graph_manager.get_status(),
        "service": "Harry Potter Q&A Service"
    }

@api_router.post("/initialize", dependencies=[Depends(verify_api_key)])
async def initialize():
    """Initialize the knowledge graph with Harry Potter data."""
    if knowledge_graph_manager.is_initialized:
        return {
            "status": "already_initialized",
            "progress": 100
        }
    
    if knowledge_graph_manager.is_initializing:
        return {
            "status": "initialization_in_progress",
            "progress": knowledge_graph_manager.initialization_progress
        }
    
    # Start initialization in background
    data_dir = Path(__file__).parent.parent / "data" / "original"
    asyncio.create_task(knowledge_graph_manager.load_and_cognify(data_dir))
    
    return {
        "status": "initialization_started",
        "progress": 0
    }

@api_router.post("/legacy-ask")
async def legacy_ask_question(request: QuestionRequest):
    """Legacy ask endpoint (kept for backward compatibility)."""
    if not knowledge_graph_manager.is_initialized:
        if knowledge_graph_manager.is_initializing:
            raise HTTPException(
                status_code=status.HTTP_425_TOO_EARLY,
                detail="Knowledge graph is still initializing"
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge graph not initialized"
        )
    
    return {
        "answer": "This endpoint is deprecated. Please use /api/ask instead.",
        "sources": []
    }

# The /ask endpoint is now handled by ask_router in ask.py

# Create a main API router that includes all API routes
api_router.include_router(ask_router)

# Include the main API router with /api prefix
app.include_router(api_router, prefix="/api")

# Serve static files (frontend)
import os
from pathlib import Path

# Get the absolute path to the client directory
BASE_DIR = Path(__file__).resolve().parent.parent
CLIENT_DIR = os.path.join(BASE_DIR, "client")

# Create client directory if it doesn't exist
os.makedirs(CLIENT_DIR, exist_ok=True)

# Mount static files
app.mount("/", StaticFiles(directory=CLIENT_DIR, html=True), name="static")

@app.on_event("startup")
async def startup_event():
    """Initialize the application."""
    logger.info("Starting Harry Potter Q&A Service")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)