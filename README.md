# Harry Potter QnA with Cognee

A question-answering system that uses Cognee's knowledge graph technology to answer questions about the Harry Potter universe. This application processes the text from the Harry Potter books, builds a knowledge graph, and allows for semantic search and question-answering about the content.

## Features

- Processes and indexes Harry Potter book text
- Builds a knowledge graph of characters, locations, and events
- Enables semantic search across the book content
- Provides a simple interface for asking questions about the Harry Potter universe

## Dataset

The Harry Potter book text used in this project was sourced from [Kaggle](https://www.kaggle.com/datasets/shubhammaindola/harry-potter-books?select=06+Harry+Potter+and+the+Half-Blood+Prince.txt).

## Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)
- OpenAI API key (for LLM capabilities)

### Environment Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd harry-potter-qna-with-cognee
   ```

2. Create and activate a virtual environment:
   ```bash
   # Create a virtual environment
   python -m venv .venv

   # Activate the virtual environment
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.env` file in the root directory with your API key:
   ```env
   LLM_API_KEY=your_openai_api_key_here
   ```
   
   You can get an API key from [OpenAI](https://platform.openai.com/api-keys).

## Usage

1. Ensure your virtual environment is activated
2. Run the application:
   ```bash
   python server/app.py
   ```
3. Access the web interface at `http://localhost:8000`

## Project Structure

- `data/`: Contains the Harry Potter book text files
- `server/`: Backend code for processing and querying the knowledge graph
- `client/`: Frontend web interface (if applicable)
- `playbook/`: Jupyter notebooks for experimentation and development

## Troubleshooting

- If you encounter disk I/O errors, try deleting the `.cognee_system` directory and restarting the application
- Ensure your OpenAI API key has sufficient credits and is properly set in the `.env` file
- Check the logs for specific error messages if the application fails to start