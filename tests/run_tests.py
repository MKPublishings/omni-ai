from __future__ import annotations

import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def run_with_pytest() -> int:
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        "-q",
        "tests/test_head_basic.py",
        "tests/test_head_unittest.py",
        "tests/test_head_neck_trace_unittest.py",
    ]
    return subprocess.call(cmd)


def run_with_unittest() -> int:
    tests_dir = Path(__file__).parent
    suite = unittest.defaultTestLoader.discover(str(tests_dir), pattern="test_head*_unittest.py")
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


def main() -> int:
    if importlib.util.find_spec("pytest") is not None:
        return run_with_pytest()

    print("pytest not found; running unittest fallback.")
    return run_with_unittest()


if __name__ == "__main__":
    raise SystemExit(main())
