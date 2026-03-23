import uvicorn
import os
import sys

# Ensure the backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # Check for port 8000 and try to kill existing process if needed
    # (Simplified for the runner)
    print("Starting Federated Health AI Backend...")
    try:
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
    except Exception as e:
        print(f"Failed to start backend: {e}")
