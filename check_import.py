import sys
import os
import time

# Add backend to path
sys.path.append(os.path.abspath("backend"))

print("Attempting to import app.main...")
start = time.time()
try:
    from app.main import app
    print(f"Import successful in {time.time() - start:.2f} seconds")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()

print("Attempting to access app routes...")
try:
    for route in app.routes:
        print(f"Route: {route.path}")
except Exception as e:
    print(f"Failed to access routes: {e}")
