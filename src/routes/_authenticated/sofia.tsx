import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Sparkles, Send, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { askSofia } from "@/lib/sofia.functions";

export const Route = createFileRoute("/_authenticated/sofia")({
  head: () => ({
    meta: [
      { title: "Sofia — Consultora IA da Lucro Real" },
      { name: "description", content: "Converse com a Sofia, sua consultora de IA que analisa suas finanças e sugere ações." },
    ],
  }),
  component: SofiaPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Como está meu lucro este mês?",
  "Onde estou gastando demais?",
  "Vou bater minha meta?",
  "Qual produto tem margem ruim?",
];

function SofiaPage() {
  const ask = useServerFn(askSofia);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Oi! Sou a Sofia, sua consultora financeira 💙 Já dei uma olhada nos seus números. Pode me perguntar sobre lucro, despesas, meta ou estoque — respondo com base nos seus dados reais.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { answer } = await ask({ data: { messages: next } });
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e?.message || "Não consegui responder agora." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-28">
      <header
        className="px-5 pt-12 pb-6 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Sofia</p>
              <p className="text-[10px] opacity-80 leading-tight">Sua consultora IA</p>
            </div>
          </div>
          <span className="w-10" />
        </div>
      </header>

      <div
        ref={scrollRef}
        className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 py-5"
      >
        <div className="space-y-3">
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-xs text-muted-foreground w-fit">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sofia está pensando...
            </div>
          )}
        </div>

        {messages.length <= 1 && !sending && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Perguntas rápidas
            </p>
            <div className="grid gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition hover:border-accent/60 hover:bg-accent/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto flex max-w-md items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte para a Sofia..."
            disabled={sending}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="grid h-11 w-11 place-items-center rounded-full text-primary-foreground disabled:opacity-40"
            style={{ background: "var(--gradient-hero)" }}
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "text-primary-foreground"
            : "bg-surface text-foreground border border-border"
        }`}
        style={isUser ? { background: "var(--gradient-hero)" } : undefined}
      >
        {content}
      </div>
    </div>
  );
}
