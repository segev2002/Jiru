"""Settings, read once from Backend/.env."""

import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Any OpenAI-compatible chat API. Defaults to Groq.
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
# How hard a reasoning model thinks: low / medium / high. Empty for models that don't reason.
LLM_REASONING_EFFORT = os.getenv("LLM_REASONING_EFFORT", "medium")
# Groq's built-in web search (gpt-oss models only). Set to "false" to turn it off.
LLM_WEB_SEARCH = os.getenv("LLM_WEB_SEARCH", "true").lower() == "true"

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "chatgpt_clone")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
