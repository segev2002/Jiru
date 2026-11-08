"""The LLM call. Runs only on the server, so the key never reaches the browser.

Groq (the default) speaks the OpenAI Chat Completions format, so the openai
SDK works with Groq's base URL and key. OpenAI or Gemini work the same way.
"""

import re
from datetime import date
from typing import Dict, Iterator, List, Optional, Tuple

from openai import APIStatusError, OpenAI

from . import config

SYSTEM_PROMPT = """You are Jiru — a super fast AI assistant, built by Yoni Segev.
Today's date is {today}.

Who you are
- Your name is Jiru. When asked who or what you are, say you are Jiru, a super fast AI built by Yoni Segev.
- Do not claim to be ChatGPT or any other product, and do not name the model behind you.

How you think
- First work out what the user actually needs, not just what they literally typed.
- For anything non-trivial (math, logic, code, comparisons, plans, advice), reason it through step by step and check your answer before you give it. Count and calculate carefully instead of guessing.
- If a request is ambiguous in a way that would change the answer, ask one short clarifying question. Otherwise pick the most sensible reading, and say which assumption you made if it matters.

How you answer
- Lead with the answer, then only the detail that helps. Short by default; thorough when the task needs it or the user asks.
- Use Markdown: headings for long answers, numbered lists for steps, tables for comparisons, fenced code blocks with the language name for code.
- Code must be complete and runnable — no placeholders like "rest of the code here". Briefly explain anything non-obvious.
- Be honest. If you don't know, or something may have changed since your training, say so plainly. Never invent facts, numbers, sources or links.
- Be warm and direct. If the user is mistaken, say so politely and explain why; don't flatter.
- Reply in the language the user writes in.

Current information
- Your training data is out of date. For anything that may have changed (news, prices, releases, versions, sports, people's current roles, "latest"/"today" questions), use web search before answering, and mention the sources you used.
- For timeless questions (math, coding, writing, general knowledge), answer directly without searching.

What you can't do
- You cannot open files, apps or links on the user's computer, or host pages. Never invent links (no data: or made-up URLs) — only link to pages you actually found.

Web pages
- When the user wants a web page, a visual, or a "preview", reply with ONE complete, self-contained ```html code block (inline CSS/JS, no external files). The chat shows a live Preview of it automatically, so tell them to look at the Preview."""

# Groq's free plan allows 8,000 tokens per request (prompt + reply, thinking
# included). Long chats send only their most recent messages; the rest stay
# saved in the database.
MAX_REPLY_TOKENS = 3000
MAX_HISTORY_CHARS = 12000  # about 4,000 tokens

LIMIT_MESSAGE = "Jiru got too much text at once (free plan limit). Wait a minute and try again."

# Fail within about two minutes rather than the SDK's default of ten, with retries.
_client = (
    OpenAI(api_key=config.LLM_API_KEY, base_url=config.LLM_BASE_URL, timeout=60, max_retries=1)
    if config.LLM_API_KEY
    else None
)


# Browser search leaves citation markers like 【0†L6-L7】 in the text.
_CITATION = re.compile(r"【[^】]*】")


def _recent(history: List[Dict]) -> List[Dict]:
    """The newest messages that fit MAX_HISTORY_CHARS; always at least the last one."""
    kept: List[Dict] = []
    size = 0
    for message in reversed(history):
        size += len(message["content"])
        if kept and size > MAX_HISTORY_CHARS:
            break
        kept.append({"role": message["role"], "content": message["content"]})
    return kept[::-1]


def _create(history: List[Dict], think_harder: bool, stream: bool):
    if _client is None:
        raise RuntimeError("LLM_API_KEY is not set in Backend/.env")
    system = SYSTEM_PROMPT.format(today=date.today().strftime("%A, %B %d, %Y"))
    request: Dict = {
        "model": config.LLM_MODEL,
        "messages": [{"role": "system", "content": system}] + _recent(history),
        "max_tokens": MAX_REPLY_TOKENS,
        "stream": stream,
    }
    if config.LLM_REASONING_EFFORT:
        request["reasoning_effort"] = "high" if think_harder else config.LLM_REASONING_EFFORT
    if config.LLM_WEB_SEARCH:
        # Groq runs the search server-side; the model decides when it's needed.
        request["tools"] = [{"type": "browser_search"}]
        request["tool_choice"] = "auto"
    try:
        return _client.chat.completions.create(**request)
    except APIStatusError as error:
        # 413: one request over the plan's size; 429: too many tokens this minute.
        if error.status_code in (413, 429):
            raise RuntimeError(LIMIT_MESSAGE)
        raise


def reply(history: List[Dict], think_harder: bool = False) -> Tuple[str, Optional[str]]:
    """Answer the last user message. Returns (answer, reasoning)."""
    message = _create(history, think_harder, stream=False).choices[0].message
    return _CITATION.sub("", message.content or ""), (message.model_extra or {}).get("reasoning")


def stream_reply(history: List[Dict], think_harder: bool = False) -> Iterator[Tuple[str, str]]:
    """Answer the last user message piece by piece: yields ("reasoning" | "content", text)."""
    pending = ""  # text held back while a citation marker may still be arriving
    for chunk in _create(history, think_harder, stream=True):
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        reasoning = (delta.model_extra or {}).get("reasoning")
        if reasoning:
            yield "reasoning", reasoning
        if delta.content:
            pending = _CITATION.sub("", pending + delta.content)
            cut = pending.find("【")
            ready, pending = (pending, "") if cut == -1 else (pending[:cut], pending[cut:])
            if ready:
                yield "content", ready
    if pending:
        yield "content", _CITATION.sub("", pending)
