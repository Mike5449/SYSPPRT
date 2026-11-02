import json
import os
import sys
from unittest.mock import MagicMock

# Mock sentry_sdk before importing app.main
sys.modules["sentry_sdk"] = MagicMock()

# Add current directory to sys.path
sys.path.append(os.getcwd())

from app.main import app

def export_openapi():
    openapi_data = app.openapi()
    
    # Path to frontend directory
    frontend_path = os.path.join(os.path.dirname(os.getcwd()), "frontend")
    output_path = os.path.join(frontend_path, "openapi.json")
    
    print(f"Exporting OpenAPI to {output_path}...")
    with open(output_path, "w") as f:
        json.dump(openapi_data, f, indent=2)
    print("Done!")

if __name__ == "__main__":
    export_openapi()
