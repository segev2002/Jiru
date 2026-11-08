/** The REST API. Only the server talks to the model; this file never sees a key. */

export type Role = "user" | "assistant";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: string;
  role: Role;
  content: string;
  /** The assistant's thinking before it answered, if any. */
  reasoning: string | null;
  created_at: string;
}

/** One line of the streamed reply. */
export type StreamEvent =
  | { type: "user_message"; message: Message }
  | { type: "reasoning" | "content"; text: string }
  | { type: "done"; message: Message }
  | { type: "error"; detail: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  listConversations: () => request<Conversation[]>("/conversations"),
  createConversation: () => request<Conversation>("/conversations", { method: "POST", body: "{}" }),
  deleteConversation: (conversationId: string) =>
    request<void>(`/conversations/${conversationId}`, { method: "DELETE" }),
  getMessages: (conversationId: string) => request<Message[]>(`/conversations/${conversationId}/messages`),
  /** Sends a message and calls `onEvent` for each piece of the reply as it arrives. */
  async streamMessage(
    conversationId: string,
    body: { content: string; think_harder: boolean },
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
  ) {
    const response = await fetch(`/api/conversations/${conversationId}/messages/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.detail ?? `Request failed (${response.status})`);
    }
    // Newline-delimited JSON: a chunk can end mid-line, so keep the tail for the next one.
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) if (line.trim()) onEvent(JSON.parse(line));
    }
  },
};
