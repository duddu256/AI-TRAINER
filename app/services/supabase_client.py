import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Automatically find the .env file in the parent directories
base_dir = Path(__file__).resolve().parent.parent.parent  # Points to /ai-trainer
env_path = base_dir / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Quick print helper so you can see exactly what is missing in your terminal
print(f"--- DATABASE CONNECTION STARTUP ---")
print(f"Looking for .env at: {env_path}")
print(f"File exists: {env_path.exists()}")
print(f"SUPABASE_URL loaded: {bool(SUPABASE_URL)}")
print(f"SUPABASE_ANON_KEY loaded: {bool(SUPABASE_ANON_KEY)}")
print(f"SUPABASE_SERVICE_KEY loaded: {bool(SUPABASE_SERVICE_KEY)}")
print(f"-----------------------------------")

if not all([SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY]):
    raise ValueError("Missing Supabase configuration keys in your .env file!")

# Client for auth
supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Client for database (RLS Bypass)
supabase_db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
