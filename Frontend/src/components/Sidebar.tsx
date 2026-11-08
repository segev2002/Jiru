import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router";
import { LuInfo, LuMessageSquare, LuSquarePen, LuTrash2, LuX } from "react-icons/lu";
import type { Conversation } from "../lib/api";
import { ThemeSwitcher, type Theme } from "./ThemeSwitcher";

const ICON = "h-[18px] w-[18px]";

/** `match` says which paths light the item up: Chat stays lit inside a saved conversation. */
const NAV: { to: string; label: string; icon: ReactNode; match: (path: string) => boolean }[] = [
  { to: "/", label: "Chat", icon: <LuMessageSquare className={ICON} />, match: (p) => p === "/" || p.startsWith("/c/") },
  { to: "/about", label: "About", icon: <LuInfo className={ICON} />, match: (p) => p === "/about" },
];

const ITEM =
  "flex w-full items-center gap-3 rounded-xl px-[15px] py-2.5 text-sm font-medium transition-colors";

export function Sidebar({
  conversations,
  onNewChat,
  onDelete,
  onClose,
  theme,
  onThemeChange,
  className = "",
}: {
  conversations: Conversation[];
  onNewChat: () => void;
  onDelete: (conversation: Conversation) => void;
  /** Closes the drawer on a phone. */
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  className?: string;
}) {
  const { pathname } = useLocation();

  return (
    <aside className={`flex w-[248px] shrink-0 flex-col overflow-hidden bg-ink-900 text-champagne/90 ${className}`}>
      <div className="flex items-center gap-2.5 px-6 pb-6 pt-7">
        <img src="/favicon.svg" alt="Jiru" className="h-9 w-9 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 whitespace-nowrap">
          <p className="text-[17px] font-semibold leading-none text-champagne">Jiru</p>
          <p className="mt-1 text-[11px] tracking-wide text-champagne/55">Super fast AI</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-lg p-1.5 text-champagne/60 transition-colors hover:bg-white/8 hover:text-champagne md:hidden"
        >
          <LuX className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={onNewChat}
          className={`${ITEM} border border-white/12 text-champagne hover:bg-white/8`}
        >
          <LuSquarePen className={`${ICON} text-champagne/70`} />
          New chat
        </button>
      </div>

      <nav className="shrink-0 space-y-1 px-3" aria-label="Main menu">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={`${ITEM} ${active ? "bg-champagne text-ink-900" : "text-champagne/70 hover:bg-white/8 hover:text-champagne"}`}
            >
              <span className={active ? "text-ink-700" : "text-champagne/60"}>{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-champagne/50">Chats</p>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3" aria-label="Saved conversations">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="group relative">
              <NavLink
                to={`/c/${conversation.id}`}
                onClick={onClose}
                title={conversation.title}
                className={({ isActive }) =>
                  `block truncate rounded-lg py-2 pl-[15px] pr-9 text-[13px] transition-colors ${
                    isActive ? "bg-white/15 text-champagne" : "text-champagne/70 hover:bg-white/8 hover:text-champagne"
                  }`
                }
              >
                {conversation.title}
              </NavLink>
              <button
                onClick={() => onDelete(conversation)}
                // Hover-only with a mouse; always shown on touch screens, which have no hover.
                aria-label={`Delete “${conversation.title}”`}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-champagne/60 opacity-0 transition-opacity hover:bg-white/10 hover:text-champagne focus:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
              >
                <LuTrash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {!conversations.length && <li className="px-[15px] py-2 text-[13px] text-champagne/50">No saved chats yet</li>}
        </ul>
      </div>

      <div className="flex shrink-0 justify-center border-t border-white/10 px-3 py-4">
        <ThemeSwitcher value={theme} onValueChange={onThemeChange} />
      </div>
    </aside>
  );
}
