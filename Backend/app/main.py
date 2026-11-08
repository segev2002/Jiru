"""REST API for Jiru, a ChatGPT-style chat.

    GET    /api/health
    GET    /api/conversations
    POST   /api/conversations
    GET    /api/conversations/{id}
    DELETE /api/conversations/{id}
    GET    /api/conversations/{id}/messages
    POST   /api/conversations/{id}/messages   -> saves the user message, asks the model, saves and returns the reply
    POST   /api/conversations/{id}/messages/stream
                                              -> the same, streamed as newline-delimited JSON events:
                                                 {"type": "user_message", "message": {...}}
                                                 {"type": "reasoning" | "content", "text": "..."}   (many)
                                                 {"type": "done", "message": {...}}  or  {"type": "error", "detail": "..."}
"""

import json
from datetime import datetime
from typing import Dict, Iterator, List, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import chat, config, db

app = FastAPI(title="Jiru API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Conversation(BaseModel):
    id: str
    title: str
    created_at: datetime


class Message(BaseModel):
    id: int
    conversation_id: str
    role: Literal["user", "assistant"]
    content: str
    reasoning: Optional[str] = None
    created_at: datetime


class NewConversation(BaseModel):
    title: Optional[str] = None


class NewMessage(BaseModel):
    content: str = Field(min_length=1, max_length=20000)
    # Ask the model to reason longer before answering.
    think_harder: bool = False


class Exchange(BaseModel):
    user_message: Message
    assistant_message: Message


def _require(conversation_id: str) -> dict:
    conversation = db.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.get("/api/health")
def health():
    return {"status": "ok", "database": db.ping(), "model": config.LLM_MODEL}


@app.get("/api/conversations", response_model=List[Conversation])
def list_conversations():
    return db.list_conversations()


@app.post("/api/conversations", response_model=Conversation, status_code=201)
def create_conversation(body: Optional[NewConversation] = None):
    return db.create_conversation((body and body.title) or "New chat")


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
def get_conversation(conversation_id: str):
    return _require(conversation_id)


@app.delete("/api/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: str):
    if not db.delete_conversation(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")


@app.get("/api/conversations/{conversation_id}/messages", response_model=List[Message])
def get_messages(conversation_id: str):
    _require(conversation_id)
    return db.get_messages(conversation_id)


def _save_user_message(conversation_id: str, body: NewMessage) -> Dict:
    conversation = _require(conversation_id)
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message is empty")
    user_message = db.add_message(conversation_id, "user", content)
    # The first message names the conversation.
    if conversation["title"] == "New chat":
        db.set_title(conversation_id, content[:60])
    return user_message


@app.post("/api/conversations/{conversation_id}/messages", response_model=Exchange, status_code=201)
def send_message(conversation_id: str, body: NewMessage):
    user_message = _save_user_message(conversation_id, body)
    try:
        answer, reasoning = chat.reply(db.get_messages(conversation_id), body.think_harder)
    except Exception as error:  # noqa: BLE001 — surface any model failure as 502
        raise HTTPException(status_code=502, detail=f"Model request failed: {error}")

    assistant_message = db.add_message(conversation_id, "assistant", answer, reasoning)
    return {"user_message": user_message, "assistant_message": assistant_message}


def _event(**fields) -> str:
    return json.dumps(fields, default=str) + "\n"


@app.post("/api/conversations/{conversation_id}/messages/stream")
def stream_message(conversation_id: str, body: NewMessage):
    user_message = _save_user_message(conversation_id, body)
    history = db.get_messages(conversation_id)

    def events() -> Iterator[str]:
        answer, reasoning = [], []
        saved = False
        yield _event(type="user_message", message=Message(**user_message).model_dump())
        try:
            for kind, text in chat.stream_reply(history, body.think_harder):
                (reasoning if kind == "reasoning" else answer).append(text)
                yield _event(type=kind, text=text)
            message = db.add_message(conversation_id, "assistant", "".join(answer), "".join(reasoning) or None)
            saved = True
            yield _event(type="done", message=Message(**message).model_dump())
        except Exception as error:  # noqa: BLE001 — the stream has started, so report it as an event
            yield _event(type="error", detail=f"Model request failed: {error}")
        finally:
            # The browser left mid-answer: keep what was written so far.
            if not saved and answer:
                db.add_message(conversation_id, "assistant", "".join(answer), "".join(reasoning) or None)

    return StreamingResponse(events(), media_type="application/x-ndjson")
