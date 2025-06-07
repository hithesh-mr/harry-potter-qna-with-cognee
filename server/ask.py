from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from cognee.api.v1.search import SearchType
from fastapi.responses import JSONResponse
import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Cognee
class QuestionRequest(BaseModel):
    question: str

@router.post("/ask")
async def ask_question(
    request: QuestionRequest,
    authorization: str = Header(None)
):
    """
    Endpoint to handle questions and return answers using Cognee's knowledge graph.
    """
    try:
        # Get the question from the request
        question = request.question
        if not question:
            raise HTTPException(status_code=400, detail="No question provided")
        
        logger.info(f"Received question: {question}")
        
        # Search the knowledge graph
        try:
            from cognee import search
            search_results = await search(
                query_type=SearchType.GRAPH_COMPLETION,
                query_text=question,
            )
            
            logger.info(f"Search results: {search_results}")
            
            # Format the response
            if not search_results:
                return {
                    "answer": "I couldn't find any information about that in the knowledge base.",
                    "sources": []
                }
            
            # Extract the answer from search results (which is a list of strings)
            answer = search_results[0] if search_results else "I don't have enough information to answer that."
            sources = []  # No sources available in the current response format
            
            return {
                "answer": answer,
                "sources": sources
            }
            
        except Exception as e:
            logger.error(f"Error searching knowledge graph: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"answer": f"An error occurred while searching the knowledge graph: {str(e)}"}
            )
            
    except HTTPException as he:
        logger.error(f"HTTP error: {str(he.detail)}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )