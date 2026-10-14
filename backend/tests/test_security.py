import unittest
import os
from pathlib import Path

# Mock STATIC_DIR before importing app if needed, or just let it use default/env.
os.environ["STATIC_DIR"] = "/tmp/fake_static"
Path("/tmp/fake_static").mkdir(parents=True, exist_ok=True)
with open("/tmp/fake_static/index.html", "w") as f:
    f.write("test")

# Mock the fallback main.py
with open("/tmp/fake_static/main.py", "w") as f:
    f.write("mocked main.py")

# Import the app after setting environment variables
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from main import app

class TestSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_path_traversal_returns_404(self):
        # httpx normalizes URL paths (e.g. /../main.py becomes /main.py).
        # To test traversal against the FastAPI routing layer, we must pass the literal traversal string.
        # Alternatively we can URL encode or bypass httpx's client normalization, but httpx allows percent encoded dots.
        response = self.client.get("/%2e%2e/main.py")
        self.assertEqual(response.status_code, 404, f"Response text: {response.text}")

        # Test an absolute path traversal attempt using a URL-encoded string to bypass TestClient normalization
        # /%2fetc%2fpasswd -> //etc/passwd -> resolves to /etc/passwd if path normalization fails.
        # But actually testing `../` is what matters most for path traversal on static files.
        response = self.client.get("/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/passwd")
        self.assertEqual(response.status_code, 404)

        # Test valid path
        response = self.client.get("/index.html")
        self.assertEqual(response.status_code, 200)

if __name__ == "__main__":
    unittest.main()
