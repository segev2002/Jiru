import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LuArrowUp, LuBrain, LuChevronRight, LuSquare, LuZap } from "react-icons/lu";
import { CodeBlock } from "../components/CodeBlock";
import type { ChatMessage } from "../lib/useChat";

export function Home({
  messages,
  busy,
  loading,
  onSend,
  onStop,
}: {
  messages: ChatMessage[];
  busy: boolean;
  /** A saved conversation is being fetched. */
  loading: boolean;
  onSend: (text: string, thinkHarder: boolean) => void;
  onStop: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Here rather than in Composer: the start screen and the chat each mount their own.
  const [thinkHarder, setThinkHarder] = useState(false);
  // Follow the answer as it streams, unless the reader scrolled up to read.
  const stick = useRef(true);

  useEffect(() => {
    const box = scrollRef.current;
    if (box && stick.current) box.scrollTop = box.scrollHeight;
  }, [messages]);

  if (!messages.length && !loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink-900">
          <LuZap className="h-3.5 w-3.5" /> Jiru · Super fast AI
        </span>
        <h1 className="mb-8 text-center text-2xl font-medium tracking-tight text-ink-900 sm:text-3xl">
          What’s on the agenda today?
        </h1>
        <div className="w-full max-w-3xl">
          <Composer busy={busy} thinkHarder={thinkHarder} onThinkHarder={setThinkHarder} onSend={onSend} onStop={onStop} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const box = event.currentTarget;
          stick.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4"
      >
        <div className="mx-auto max-w-3xl space-y-8 py-8">
          {messages.map((message) => (
            <Bubble key={message.key} message={message} />
          ))}
          {loading && <Typing />}
        </div>
      </div>
      <div className="shrink-0 px-4 pb-5 pt-2">
        <div className="mx-auto max-w-3xl">
          <Composer busy={busy} thinkHarder={thinkHarder} onThinkHarder={setThinkHarder} onSend={onSend} onStop={onStop} />
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="fade-in flex justify-end">
        <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-ink-900 px-4 py-2.5 text-[15px] leading-relaxed text-champagne">
          {message.content}
        </div>
      </div>
    );
  }
  if (message.failed) {
    return (
      <div className="fade-in rounded-2xl border border-[#f3d3d0] bg-[#fbeceb] px-4 py-3 text-sm text-blocked">
        {message.content}
      </div>
    );
  }
  return (
    <div className="fade-in">
      {message.reasoning && <Thinking message={message} />}
      {message.streaming && !message.content && !message.reasoning && <Typing />}
      {message.content && (
        <div className="prose max-w-none text-[15px] leading-relaxed">
          <Markdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>
            {message.content}
          </Markdown>
        </div>
      )}
      {message.durationMs != null && (
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted" title="Response time">
          <LuZap className="h-3 w-3 text-ink-500" /> {(message.durationMs / 1000).toFixed(2)}s
        </span>
      )}
    </div>
  );
}

/** The model's reasoning: open while it thinks, folded away once it answers. */
function Thinking({ message }: { message: ChatMessage }) {
  const thinking = message.streaming && !message.content;
  const [open, setOpen] = useState(false);
  const shown = thinking || open;
  const label = thinking
    ? "Thinking…"
    : message.thinkingMs != null
      ? `Thought for ${(message.thinkingMs / 1000).toFixed(1)}s`
      : "Thought process";

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((value) => !value)}
        disabled={thinking}
        aria-expanded={shown}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-body"
      >
        <LuBrain className={`h-3.5 w-3.5 ${thinking ? "animate-pulse text-ink-500" : ""}`} />
        {label}
        {!thinking && <LuChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />}
      </button>
      {shown && (
        <div className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap border-l-2 border-line pl-3 text-[13px] leading-relaxed text-muted">
          {message.reasoning}
        </div>
      )}
    </div>
  );
}

function Typing() {
  return (
    <div className="flex gap-1 py-2" aria-label="Jiru is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot h-2 w-2 rounded-full bg-ink-500" />
      ))}
    </div>
  );
}

function Composer({
  busy,
  thinkHarder,
  onThinkHarder,
  onSend,
  onStop,
}: {
  busy: boolean;
  thinkHarder: boolean;
  onThinkHarder: (value: boolean) => void;
  onSend: (text: string, thinkHarder: boolean) => void;
  onStop: () => void;
}) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!busy) ref.current?.focus();
  }, [busy]);

  function submit() {
    if (!draft.trim() || busy) return;
    onSend(draft, thinkHarder);
    setDraft("");
  }

  return (
    <div className="rounded-[28px] border border-line bg-white py-2 pl-5 pr-2 shadow-lg">
      <textarea
        ref={ref}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder="Ask anything"
        aria-label="Message"
        className="field-sizing-content block max-h-48 min-h-10 w-full resize-none bg-transparent py-2 pr-3 text-[15px] text-body placeholder:text-muted/70 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => onThinkHarder(!thinkHarder)}
          aria-pressed={thinkHarder}
          title="Reason longer before answering: slower, more careful"
          className={`-ml-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            thinkHarder
              ? "border-ink-900 bg-ink-900 text-champagne"
              : "border-line text-muted hover:border-ink-300 hover:text-body"
          }`}
        >
          <LuBrain className="h-3.5 w-3.5" />
          Think deeper
        </button>
        <span className="flex-1" />
        {busy ? (
          <button
            onClick={onStop}
            aria-label="Stop"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-900 text-champagne"
          >
            <LuSquare className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!draft.trim()}
            aria-label="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-900 text-champagne transition-opacity disabled:opacity-35"
          >
            <LuArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
