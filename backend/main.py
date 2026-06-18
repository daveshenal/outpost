import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from backend.server import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)