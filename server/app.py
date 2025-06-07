from fastapi import FastAPI, HTTPException, Request, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import logging
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the base directory
BASE_DIR = Path(__file__).resolve().parent.parent
CLIENT_DIR = os.path.join(BASE_DIR, "client")

app = FastAPI(title="Harry Potter Q&A API", version="1.0.0")

# Mount client directory to serve all client files
app.mount("", StaticFiles(directory=CLIENT_DIR, html=True), name="client")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo purposes
# In a production app, use a proper database
app.state.is_initialized = False
app.state.initialization_progress = 0

# Initialize OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")

# Middleware to check API key
async def verify_api_key(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    api_key = authorization.replace("Bearer ", "")
    
    # In a real app, you would validate the API key here
    # For this example, we'll just check if it's not empty
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return api_key

# Models
class QuestionRequest(BaseModel):
    question: str

class Source(BaseModel):
    title: str
    url: Optional[str] = None
    content: Optional[str] = None

class AnswerResponse(BaseModel):
    answer: str
    sources: List[Source] = []

# Helper functions
async def initialize_harry_potter_knowledge():
    """Initialize the Harry Potter knowledge base."""
    try:
        # Simulate initialization progress
        total_steps = 10
        for i in range(1, total_steps + 1):
            # Simulate work being done
            app.state.initialization_progress = int((i / total_steps) * 100)
            logger.info(f"Initialization progress: {app.state.initialization_progress}%")
            
            # Simulate delay for each step
            import time
            time.sleep(0.5)
            
        app.state.is_initialized = True
        return {"status": "initialization_complete", "progress": 100}
    except Exception as e:
        logger.error(f"Initialization failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Initialization failed: {str(e)}"
        )

# API Endpoints
@app.get("/api/status", dependencies=[Depends(verify_api_key)])
async def get_status():
    """Check the status of the service and initialization progress."""
    return {
        "status": "initialization_complete" if app.state.is_initialized else "initializing",
        "progress": app.state.initialization_progress,
        "service": "Harry Potter Q&A Service"
    }

@app.post("/api/initialize", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(verify_api_key)])
async def initialize():
    """Start the initialization process."""
    if app.state.is_initialized:
        return {"status": "already_initialized", "progress": 100}
    
    # Start initialization in the background
    import asyncio
    asyncio.create_task(initialize_harry_potter_knowledge())
    
    return {"status": "initialization_started", "progress": 0}

@app.post("/api/ask", response_model=AnswerResponse, dependencies=[Depends(verify_api_key)])
async def ask_question(request: QuestionRequest):
    """Answer a question about Harry Potter."""
    if not app.state.is_initialized:
        raise HTTPException(
            status_code=status.HTTP_425_TOO_EARLY,
            detail="Service is still initializing. Please try again later."
        )
    
    question = request.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty"
        )
    
    try:
        # In a real implementation, you would use the Cognee library here
        # to process the question and get an answer
        
        # For demo purposes, returning a mock response
        answer = f"I'm sorry, but I'm a demo version and can't answer questions yet. " \
                f"In a real implementation, I would use the Cognee library to answer: '{question}'"
        
        # Mock sources
        sources = [
            {"title": "Harry Potter and the Philosopher's Stone", "url": "https://harrypotter.fandom.com/wiki/Philosopher's_Stone"},
            {"title": "Harry Potter Wiki", "url": "https://harrypotter.fandom.com"}
        ]
        
        return {
            "answer": answer,
            "sources": sources
        }
        
    except Exception as e:
        logger.error(f"Error processing question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing question: {str(e)}"
        )

# The root path will be automatically served by the static files middleware

# API Root endpoint for JSON response
@app.get("/api")
async def api_root(request: Request):
    """API root endpoint with information."""
    base_url = str(request.base_url).rstrip('/')
    return {
        "service": "Harry Potter Q&A API",
        "version": "1.0.0",
        "endpoints": {
            "GET /api": "This information page",
            "GET /api/health": "Health check endpoint",
            "GET /api/status": "Check service status and initialization progress",
            "POST /api/initialize": "Start the initialization process",
            "POST /api/ask": "Ask a question about Harry Potter"
        },
        "documentation": f"{base_url}/docs"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
