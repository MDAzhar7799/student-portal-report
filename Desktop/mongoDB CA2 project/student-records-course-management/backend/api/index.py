"""
Vercel Serverless Entry Point for Flask Backend.
Vercel requires the app to be exposed as 'app' in api/index.py
"""
import sys
import os

# Add the parent (backend) directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app

app = create_app()
