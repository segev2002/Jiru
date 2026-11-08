import { useCallback, useRef, useState } from "react";
import { api, type Role } from "./api";

export interface ChatMessage {
  key: string;
  role: Role;
  content: string;
  /** The assistant's thinking before it answered. */
  reasoning?: string;
  /** Still arriving from the server. */
  streaming?: boolean;
  failed?: boolean;
  /** How long the reply took, shown under it. */
  durationMs?: number;
  /** How long it thought before the first word of the answer. */
  thinkingMs?: number;
}

/**
 * The open conversation. A new one is created on the server with its first
 * message; a saved one is loaded from the server with `open`. Replies stream
 * in piece by piece; the server sends the model the recent history, so
 * replies keep the context.
 */
export function useChat({ onSaved }: { onSaved: (conversationId: string, created: boolean) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const conversationId = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  // Bumped by newChat and open, so a reply for the previous chat is dropped.
  const generation = useRef(0);

  const send = useCallback(
    async (text: string, thinkHarder = false) => {
      const content = text.trim();
      if (!content || busy) return;
      const turn = generation.current;
      const replyKey = crypto.randomUUID();
      const started = performance.now();
      setMessages((list) => [
        ...list,
        { key: crypto.randomUUID(), role: "user", content },
        { key: replyKey, role: "assistant", content: "", streaming: true },
      ]);
      setBusy(true);

      const update = (change: (message: ChatMessage) => ChatMessage) => {
        if (turn !== generation.current) return;
        setMessages((list) => list.map((m) => (m.key === replyKey ? change(m) : m)));
      };

      const controller = new AbortController();
      abort.current = controller;
      let created = false;
      try {
        if (conversationId.current === null) {
          conversationId.current = (await api.createConversation()).id;
          created = true;
        }
        const id = conversationId.current;
        await api.streamMessage(
          id,
          { content, think_harder: thinkHarder },
          (event) => {
            if (event.type === "reasoning") {
              update((m) => ({ ...m, reasoning: (m.reasoning ?? "") + event.text }));
            } else if (event.type === "content") {
              update((m) => ({
                ...m,
                content: m.content + event.text,
                thinkingMs: m.thinkingMs ?? performance.now() - started,
              }));
            } else if (event.type === "done") {
              update((m) => ({ ...m, streaming: false, durationMs: performance.now() - started }));
            } else if (event.type === "error") {
              update((m) => ({ ...m, content: event.detail, failed: true, streaming: false }));
            }
          },
          controller.signal,
        );
        if (turn === generation.current) onSaved(id, created);
      } catch (error) {
        const stopped = (error as Error).name === "AbortError";
        update((m) =>
          stopped
            ? { ...m, streaming: false }
            : { ...m, content: (error as Error).message, failed: true, streaming: false },
        );
        if (stopped && conversationId.current && turn === generation.current) onSaved(conversationId.current, created);
      } finally {
        if (turn === generation.current) setBusy(false);
        if (abort.current === controller) abort.current = null;
      }
    },
    [busy, onSaved],
  );

  /** Stops the reply mid-stream; the server keeps what was written so far. */
  const stop = useCallback(() => abort.current?.abort(), []);

  const newChat = useCallback(() => {
    generation.current += 1;
    abort.current?.abort();
    conversationId.current = null;
    setMessages([]);
    setBusy(false);
    setLoading(false);
  }, []);

  const open = useCallback(async (id: string) => {
    const turn = ++generation.current;
    abort.current?.abort();
    conversationId.current = id;
    setMessages([]);
    setBusy(false);
    setLoading(true);
    try {
      const saved = await api.getMessages(id);
      if (turn !== generation.current) return;
      setMessages(
        saved.map((m) => ({ key: String(m.id), role: m.role, content: m.content, reasoning: m.reasoning ?? undefined })),
      );
    } catch (error) {
      if (turn !== generation.current) return;
      setMessages([{ key: "error", role: "assistant", content: (error as Error).message, failed: true }]);
    } finally {
      if (turn === generation.current) setLoading(false);
    }
  }, []);

  /** Whether `id` is the conversation already open (so the route need not reload it). */
  const isOpen = useCallback((id: string | null) => conversationId.current === id, []);

  return { messages, busy, loading, send, stop, newChat, open, isOpen };
}
