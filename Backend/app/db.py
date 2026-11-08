"""MySQL access: conversations and their messages."""

import uuid
from contextlib import contextmanager
from typing import Dict, List, Optional

import pymysql
from pymysql.cursors import DictCursor

from . import config


@contextmanager
def connect():
    conn = pymysql.connect(
        host=config.MYSQL_HOST,
        port=config.MYSQL_PORT,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DATABASE,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )
    try:
        yield conn
    finally:
        conn.close()


def create_conversation(title: str = "New chat") -> Dict:
    conversation_id = str(uuid.uuid4())
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO conversations (id, title) VALUES (%s, %s)",
            (conversation_id, title[:255]),
        )
    return get_conversation(conversation_id)


def get_conversation(conversation_id: str) -> Optional[Dict]:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, title, created_at FROM conversations WHERE id = %s",
            (conversation_id,),
        )
        return cur.fetchone()


def list_conversations() -> List[Dict]:
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, title, created_at FROM conversations ORDER BY created_at DESC")
        return cur.fetchall()


def delete_conversation(conversation_id: str) -> bool:
    with connect() as conn, conn.cursor() as cur:
        return cur.execute("DELETE FROM conversations WHERE id = %s", (conversation_id,)) > 0


def set_title(conversation_id: str, title: str) -> None:
    with connect() as conn, conn.cursor() as cur:
        cur.execute("UPDATE conversations SET title = %s WHERE id = %s", (title[:255], conversation_id))


def add_message(conversation_id: str, role: str, content: str, reasoning: Optional[str] = None) -> Dict:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO messages (conversation_id, role, content, reasoning) VALUES (%s, %s, %s, %s)",
            (conversation_id, role, content, reasoning),
        )
        cur.execute(
            "SELECT id, conversation_id, role, content, reasoning, created_at FROM messages WHERE id = %s",
            (cur.lastrowid,),
        )
        return cur.fetchone()


def get_messages(conversation_id: str) -> List[Dict]:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, conversation_id, role, content, reasoning, created_at FROM messages "
            "WHERE conversation_id = %s ORDER BY id",
            (conversation_id,),
        )
        return cur.fetchall()


def ping() -> bool:
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1")
        return True
