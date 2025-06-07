import os
import asyncio
from pathlib import Path

# Set the API key
os.environ.get("LLM_API_KEY")

import cognee


async def main():
    # Read the Harry Potter book file using absolute path
    current_dir = Path(__file__).parent
    book_path = current_dir.parent / "data" / "01 Harry Potter and the Sorcerers Stone.txt"
    
    if not book_path.exists():
        print(f"Error: File not found at {book_path.absolute()}")
        return
    
    # Read the book content
    with open(book_path, 'r', encoding='utf-8') as file:
        book_content = file.read()
    
    print(f"Adding book content to cognee (size: {len(book_content)} characters)...")
    
    # Add the book content to cognee
    await cognee.add(book_content)

    print("Generating knowledge graph...")
    # Generate the knowledge graph
    await cognee.cognify()

    # Query the knowledge graph
    print("Querying knowledge graph...")
    results = await cognee.search("How were dursley's to Harry Potter?")

    # Display the results
    print("\nResults:")
    for i, result in enumerate(results, 1):
        print(f"\n--- Result {i} ---")
        print(result[:500] + "..." if len(result) > 500 else result)


if __name__ == '__main__':
    asyncio.run(main())
