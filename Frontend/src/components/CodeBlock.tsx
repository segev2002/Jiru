import { isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { LuCheck, LuCopy, LuExternalLink } from "react-icons/lu";

/**
 * A fenced code block from an answer. HTML gets a live Preview tab (rendered in
 * a sandboxed iframe, so the page cannot touch the app) and can open in its own tab.
 */
export function CodeBlock({ children }: { children?: ReactNode }) {
  const code = isValidElement(children) ? (children as ReactElement<{ className?: string; children?: ReactNode }>) : null;
  const language = /language-(\w+)/.exec(code?.props.className ?? "")?.[1] ?? "";
  const text = String(code?.props.children ?? "").replace(/\n$/, "");
  const isHtml = language === "html";
  const [tab, setTab] = useState<"preview" | "code">(isHtml ? "preview" : "code");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function openInTab() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
    }`;

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-line bg-[rgb(0_26_77/0.92)]">
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-1.5">
        {isHtml ? (
          <>
            <button className={tabClass(tab === "preview")} onClick={() => setTab("preview")}>
              Preview
            </button>
            <button className={tabClass(tab === "code")} onClick={() => setTab("code")}>
              Code
            </button>
          </>
        ) : (
          <span className="px-2.5 py-1 text-xs text-white/60">{language || "code"}</span>
        )}
        <span className="flex-1" />
        {isHtml && (
          <button className={tabClass(false)} onClick={openInTab} title="Open in a new tab">
            <LuExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
        <button className={tabClass(false)} onClick={copy} title="Copy">
          {copied ? <LuCheck className="h-3.5 w-3.5" /> : <LuCopy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {tab === "preview" ? (
        <iframe
          title="HTML preview"
          srcDoc={text}
          sandbox="allow-scripts allow-forms allow-modals"
          className="h-[480px] w-full bg-white"
        />
      ) : (
        <pre className="max-h-[480px] overflow-auto p-4 text-[13px] leading-relaxed text-[#f8f7f4]">
          <code>{text}</code>
        </pre>
      )}
    </div>
  );
}
