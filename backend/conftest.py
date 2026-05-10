import os

_test_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests", "test_learnpilot.db")

# Remove stale DB if it exists
if os.path.exists(_test_db_path):
    os.unlink(_test_db_path)
