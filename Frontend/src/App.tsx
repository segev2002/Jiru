import { useCallback, useEffect, useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router";
import { LuMenu, LuSquarePen } from "react-icons/lu";
import { Sidebar } from "./components/Sidebar";
import type { Theme } from "./components/ThemeSwitcher";
import { api, type Conversation } from "./lib/api";
import { useChat } from "./lib/useChat";
import { About } from "./pages/About";
import { Home } from "./pages/Home";

function savedTheme(): Theme {
  try {
    const saved = localStorage.getItem("chat.theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage blocked */
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const loadConversations = useCallback(() => {
    api.listConversations().then(setConversations, () => setConversations([]));
  }, []);

  const chat = useChat({
    // A new chat gets its own address, and the list picks up its title.
    onSaved: useCallback(
      (id: string, created: boolean) => {
        if (created) navigate(`/c/${id}`, { replace: true });
        loadConversations();
      },
      [navigate, loadConversations],
    ),
  });

  useEffect(loadConversations, [loadConversations]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("chat.theme", theme);
    } catch {
      /* storage blocked */
    }
  }, [theme]);

  function newChat() {
    // Also when already on "/", where the route sees no change of address.
    chat.newChat();
    setDrawer(false);
    navigate("/");
  }

  async function deleteConversation(conversation: Conversation) {
    if (!window.confirm(`Delete “${conversation.title}”?`)) return;
    await api.deleteConversation(conversation.id);
    if (chat.isOpen(conversation.id)) navigate("/");
    loadConversations();
  }

  const home = <ChatRoute chat={chat} />;

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Phone: the sidebar is a drawer over the page. */}
      {drawer && <div className="fixed inset-0 z-30 bg-ink-950/40 md:hidden" onClick={() => setDrawer(false)} />}
      <Sidebar
        conversations={conversations}
        onNewChat={newChat}
        onDelete={deleteConversation}
        onClose={() => setDrawer(false)}
        theme={theme}
        onThemeChange={setTheme}
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 ${
          drawer ? "translate-x-0" : "-translate-x-full"
        }`}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between px-4 py-3 md:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-lg p-2 text-ink-900">
            <LuMenu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-ink-900">Jiru</span>
          <button onClick={newChat} aria-label="New chat" className="rounded-lg p-2 text-ink-900">
            <LuSquarePen className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1">
          <Routes>
            <Route path="/" element={home} />
            <Route path="/c/:id" element={home} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/** `/` is a new chat; `/c/:id` opens a saved one. */
function ChatRoute({ chat }: { chat: ReturnType<typeof useChat> }) {
  const { id = null } = useParams();
  const { isOpen, open, newChat } = chat;

  useEffect(() => {
    if (isOpen(id)) return;
    if (id) open(id);
    else newChat();
  }, [id, isOpen, open, newChat]);

  return (
    <Home messages={chat.messages} busy={chat.busy} loading={chat.loading} onSend={chat.send} onStop={chat.stop} />
  );
}
