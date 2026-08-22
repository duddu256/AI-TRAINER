import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Automatically find the .env file in the workspace root or app directory
base_dir = Path(__file__).resolve().parent.parent.parent  # Points to workspace root (ai-trainer)
env_path = base_dir / ".env"

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    # Fallback to app/.env if root .env not found
    app_env_path = base_dir / "app" / ".env"
    if app_env_path.exists():
        env_path = app_env_path
        load_dotenv(dotenv_path=app_env_path)
    else:
        load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Quick print helper so you can see exactly what is loaded in your terminal
print(f"--- DATABASE CONNECTION STARTUP ---")
print(f"Looking for .env at: {env_path}")
print(f"File exists: {env_path.exists()}")
print(f"SUPABASE_URL loaded: {bool(SUPABASE_URL)}")
print(f"SUPABASE_ANON_KEY loaded: {bool(SUPABASE_ANON_KEY)}")
print(f"SUPABASE_SERVICE_KEY loaded: {bool(SUPABASE_SERVICE_KEY)}")
print(f"-----------------------------------")

if not all([SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY]):
    raise ValueError("Missing Supabase configuration keys in your .env file!")

# Client for user authentication (public anon key)
supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Client for database queries with RLS bypass (secret service role key)
supabase_db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
