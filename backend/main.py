import sys
import os

# Make sure the project root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.server:app", host="127.0.0.1", port=8765)