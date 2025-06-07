# knowledge-graph.py
from pathlib import Path
import cognee
import asyncio
from cognee.api.v1.search import SearchType
from typing import List, Dict, Any
import logging
import os

logger = logging.getLogger(__name__)

class KnowledgeGraphManager:
    def __init__(self):
        self.is_initialized = False
        self.is_initializing = False
        self.initialization_progress = 0

    async def load_and_cognify(self, data_dir: Path) -> Dict[str, Any]:
        """
        Load and process the combined Harry Potter text file to generate knowledge graph.
        Stops execution if any error occurs during the process.
        """
        try:
            # Initialize state
            self.is_initializing = True
            self.is_initialized = False
            self.initialization_progress = 0
            
            # Define the combined file path
            output_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'combined_harry_potter.txt')
            
            
            if not Path(output_file).exists():
                error_msg = f"Combined file not found: {output_file}"
                logger.error(error_msg)
                return {
                    "status": "error",
                    "message": error_msg,
                    "error": True
                }
                
            logger.info(f"Processing combined file: {output_file}")
            
            try:
                logger.info("Cleaning up old data and resetting system metadata...")
                await cognee.prune.prune_data()
                await cognee.prune.prune_system(metadata=True)
                
                # Enable LiteLLM debug mode
                import litellm
                litellm._turn_on_debug()
                
                logger.info(f"Processing combined file: {output_file}")
                await cognee.add(output_file)
                
                # Update progress
                self.initialization_progress = 80
                logger.info(f"Processed combined file ({self.initialization_progress}%)")
                
                # Generate knowledge graph
                logger.info("Generating knowledge graph...")
                self.initialization_progress = 90
                await cognee.cognify()
                
                # Update state on success
                self.is_initializing = False
                self.is_initialized = True
                self.initialization_progress = 100
                
                return {
                    "status": "success",
                    "message": "Successfully processed the combined Harry Potter text and generated knowledge graph",
                    "processed_file": str(output_file)
                }
                
            except Exception as e:
                error_msg = f"Error in knowledge graph generation: {str(e)}"
                logger.error(error_msg, exc_info=True)  # Include stack trace
                self.is_initializing = False
                self.is_initialized = False
                return {
                    "status": "error",
                    "message": error_msg,
                    "error": True
                }
                
        except Exception as e:
            error_msg = f"Unexpected error in load_and_cognify: {str(e)}"
            logger.error(error_msg, exc_info=True)  # Include stack trace
            self.is_initializing = False
            self.is_initialized = False
            return {
                "status": "error",
                "message": error_msg,
                "error": True
            }

    def get_status(self) -> Dict[str, Any]:
        """Get current status of the knowledge graph."""
        return {
            "initialized": self.is_initialized,
            "initializing": self.is_initializing,
            "progress": self.initialization_progress
        }

# Create a singleton instance
knowledge_graph_manager = KnowledgeGraphManager()