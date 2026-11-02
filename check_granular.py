import sys
import os
import time

sys.path.append(os.path.abspath("backend"))

def test_import(module_name):
    print(f"Testing import of {module_name}...")
    start = time.time()
    try:
        __import__(module_name)
        print(f"SUCCESS: {module_name} imported in {time.time() - start:.2f}s")
    except Exception as e:
        print(f"FAILURE: {module_name} failed: {e}")

test_import("app.core.config")
test_import("app.core.db")
test_import("app.models.common")
test_import("app.models.user")
test_import("app.models.student")
test_import("app.models.grade")
test_import("app.api.main")
test_import("app.main")
