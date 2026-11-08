import type { ReactNode } from "react";

export function About() {
  return (
    <div className="h-full overflow-y-auto px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900">About</h1>

        {/* Muted so the browser allows autoplay; the controls can turn the soundtrack on. */}
        <video
          src="/jiru-showreel.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls
          aria-label="Jiru showreel"
          className="aspect-video w-full rounded-2xl border border-line bg-ink-900"
        />

        <Section title="The system">
          <p>
            <b>Jiru</b> is a super fast, ChatGPT-style AI: hold a continuous conversation with an assistant that remembers
            everything said earlier in the chat, with replies in under a second. Start over at any time with <b>New chat</b>.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              <b>Frontend</b> — React SPA (Vite, TypeScript, Tailwind CSS), with a liquid-glass light and dark theme.
            </li>
            <li>
              <b>Backend</b> — Python FastAPI REST API. It alone calls the LLM (Groq, through the OpenAI-compatible API); the key lives in the server’s{" "}
              <code>.env</code>.
            </li>
            <li>
              <b>Database</b> — MySQL. Each conversation has a unique ID, and each message records whether the user
              or the assistant wrote it.
            </li>
          </ul>
        </Section>

        <Section title="The developer">
          <p>
            <b>Yoni Segev</b> — Full Stack Web Developer course, John Bryce. This app is the course’s final project.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 text-[15px] leading-relaxed">
      <h2 className="mb-3 text-lg font-semibold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}
