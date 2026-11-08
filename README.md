# Jiru — Super fast AI

Full Stack Web Developer final project (John Bryce): a ChatGPT-style chat.

**GitHub:** https://github.com/<your-user>/<your-repo>  <!-- TODO: replace with the real link -->

A continuous conversation with Jiru, an AI assistant running on Groq for near-instant replies, saved in MySQL.

| Folder      | What                                                                 |
|-------------|----------------------------------------------------------------------|
| `Database/` | `schema.sql` (tables), `export.sh` → `chatgpt_clone.sql` (full dump) |
| `Backend/`  | Python FastAPI REST API, `requirements.txt`, Postman collection      |
| `Frontend/` | React SPA (Vite + TypeScript + Tailwind)                             |

## Run locally

Requires Docker, Python 3.9+, Node 20+.

```sh
# 1. Database (MySQL 8 on port 3307, schema loaded on first start)
docker compose up -d

# 2. Backend — http://localhost:8000 (docs at /docs)
cd Backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env          # then put your Groq key in LLM_API_KEY
./venv/bin/uvicorn app.main:app --reload --port 8000

# 3. Frontend — http://localhost:5173
cd Frontend
npm install
npm run dev
```

## Features

- Continuous chat with context: the server sends the conversation's recent history with every message.
- Every conversation and message is saved in MySQL.
- Sidebar **Chats** list: open any saved conversation (`/c/<id>`) and continue it, or delete it.
- Answers stream in word by word, with the model's reasoning shown in a collapsible "Thought for …" section (saved in `messages.reasoning`).
- **Think deeper** toggle (higher reasoning effort) and a **Stop** button.
- HTML answers get a live **Preview** tab.
- **New chat** button, **About** page, light / dark theme.

## Database

- `conversations` — `id` (UUID, unique per conversation), `title`, `created_at`
- `messages` — `id`, `conversation_id` (FK), `role` (`user` / `assistant` — who said it), `content`, `reasoning` (the assistant's thinking, nullable), `created_at`

## REST API

| Method | Path                                   | Description                                   |
|--------|----------------------------------------|-----------------------------------------------|
| GET    | `/api/health`                          | Server and database status                    |
| GET    | `/api/conversations`                   | All conversations                             |
| POST   | `/api/conversations`                   | Start a conversation                          |
| GET    | `/api/conversations/{id}`              | One conversation                              |
| DELETE | `/api/conversations/{id}`              | Delete a conversation and its messages        |
| GET    | `/api/conversations/{id}/messages`     | The conversation's messages                   |
| POST   | `/api/conversations/{id}/messages`     | Send a message; returns the assistant's reply |
| POST   | `/api/conversations/{id}/messages/stream` | Same, streamed as newline-delimited JSON (thinking + answer) |

Both send endpoints take `{"content": "...", "think_harder": false}`; `think_harder` makes the model reason longer.

The server sends the model the conversation's recent messages (about 12,000 characters, to stay inside
Groq's free-plan limit of 8,000 tokens per request) on every message, so replies keep the context.
It calls Groq through its OpenAI-compatible endpoint with the `openai` Python SDK; pointing
`LLM_BASE_URL` / `LLM_MODEL` at OpenAI or Gemini works too.
The key lives only in `Backend/.env`, which is git-ignored.

## Submission checklist

1. `./Database/export.sh` → `Database/chatgpt_clone.sql`
2. Delete `Backend/venv` and `Backend/.env`, and `Frontend/node_modules` (and `Frontend/dist`)
3. Zip the `YoniSegev` folder
