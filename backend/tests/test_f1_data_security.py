import unittest
import os
import sys
import importlib
from unittest.mock import patch, MagicMock

# Make sure backend is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

class TestF1DataSecurity(unittest.TestCase):
    def test_insecure_temp_dir_fallback(self):
        # We need to simulate the OSError when creating CACHE_DIR
        # Since f1_data executes this logic on import, we need to mock
        # os.makedirs before importing it, or reload it.

        with patch("os.makedirs") as mock_makedirs, \
             patch("tempfile.mkdtemp") as mock_mkdtemp, \
             patch("atexit.register") as mock_atexit_register, \
             patch("fastf1.Cache.enable_cache") as mock_enable_cache:

            # Simulate OSError on the first try block (creating primary cache dir)
            mock_makedirs.side_effect = OSError("Permission denied")
            mock_mkdtemp.return_value = "/tmp/mock-fastf1-cache-123"

            # Import f1_data (or reload it if already imported)
            import backend.services.f1_data as f1_data
            importlib.reload(f1_data)

            # Assertions
            # Since fastf1 might call makedirs internally or there are multiple imports,
            # we just ensure our fallback behavior triggers correctly.
            mock_mkdtemp.assert_called_with(prefix="fastf1-cache-")
            self.assertGreaterEqual(mock_mkdtemp.call_count, 1)
            mock_atexit_register.assert_called()
            self.assertGreaterEqual(mock_atexit_register.call_count, 1)
            mock_enable_cache.assert_called_with("/tmp/mock-fastf1-cache-123")

            self.assertEqual(f1_data.CACHE_DIR, "/tmp/mock-fastf1-cache-123")

            # We can also verify the lambda registered with atexit cleans up the directory
            cleanup_func = mock_atexit_register.call_args[0][0]
            with patch("shutil.rmtree") as mock_rmtree:
                cleanup_func()
                mock_rmtree.assert_called_once_with("/tmp/mock-fastf1-cache-123", ignore_errors=True)

if __name__ == "__main__":
    unittest.main()
