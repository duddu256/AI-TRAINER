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

import logging

logger = logging.getLogger("auratrainer.supabase")


class _MissingSupabaseClient:
    """
    Safe fallback stand-in used when Supabase credentials are absent.

    Keeps the FastAPI process alive so Railway health probes (`/` and
    `/health`) still return 200, while any attempt to actually reach the
    database or auth layer raises a clear, actionable runtime error instead
    of crashing the whole server at import time.
    """

    def __init__(self, reason: str):
        self._reason = reason

    def _fail(self, *args, **kwargs):
        raise RuntimeError(
            "Supabase client is not configured: "
            f"{self._reason}. Set SUPABASE_URL, SUPABASE_ANON_KEY and "
            "SUPABASE_SERVICE_KEY in the environment to enable database "
            "and auth features."
        )

    # Any attribute access (e.g. .auth, .table(...)) funnels into _fail so
    # the error only surfaces on real usage, never on health checks.
    def __getattr__(self, name):
        return self._fail


_missing = [
    name
    for name, value in (
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY),
        ("SUPABASE_SERVICE_KEY", SUPABASE_SERVICE_KEY),
    )
    if not value
]

if _missing:
    reason = f"missing environment variables: {', '.join(_missing)}"
    logger.warning(
        "[Supabase] %s. Starting in degraded mode; the server will stay "
        "alive for health checks but database/auth calls will fail until "
        "these are provided.",
        reason,
    )
    print(f"[Supabase] WARNING: {reason}. Running in degraded mode.")
    supabase_auth = _MissingSupabaseClient(reason)  # type: ignore[assignment]
    supabase_db = _MissingSupabaseClient(reason)  # type: ignore[assignment]
else:
    # Client for user authentication (public anon key)
    supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

    # Client for database queries with RLS bypass (secret service role key)
    supabase_db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
