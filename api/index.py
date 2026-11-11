"""Vercel entry point for the Python API. All /api/* requests come here.

The real code lives in app.py at the top of the project.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app import app  # noqa: E402,F401
