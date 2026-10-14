import unittest
from copy import deepcopy
import sys
import os

# Add backend directory to sys.path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services import retention
from services.retention import get_sweep_status, _set_status

class TestRetention(unittest.TestCase):
    def setUp(self):
        # Backup the original sweep status so we can restore it after each test
        self.original_status = deepcopy(retention._sweep_status)

    def tearDown(self):
        # Restore the original sweep status
        retention._sweep_status.clear()
        retention._sweep_status.update(self.original_status)

    def test_get_sweep_status_base(self):
        """Test that get_sweep_status returns the expected default dictionary."""
        status = get_sweep_status()
        self.assertIsInstance(status, dict)
        self.assertEqual(status, retention._sweep_status)
        self.assertEqual(status.get("state"), "idle")

    def test_get_sweep_status_updates(self):
        """Test that get_sweep_status reflects updates from _set_status."""
        _set_status(state="running", done=5, total=10)
        status = get_sweep_status()

        self.assertEqual(status.get("state"), "running")
        self.assertEqual(status.get("done"), 5)
        self.assertEqual(status.get("total"), 10)

        # Check that it updated the original dictionary
        self.assertEqual(status, retention._sweep_status)

    def test_get_sweep_status_isolation(self):
        """Test that modifying the returned dictionary does not mutate the original state."""
        status = get_sweep_status()

        # Mutate the returned dictionary
        status["state"] = "mutated_state"
        status["new_key"] = "new_value"

        # Verify the original dictionary is untouched
        original_status = retention._sweep_status
        self.assertNotEqual(original_status.get("state"), "mutated_state")
        self.assertNotIn("new_key", original_status)
        self.assertEqual(original_status.get("state"), self.original_status.get("state"))

if __name__ == '__main__':
    unittest.main()
