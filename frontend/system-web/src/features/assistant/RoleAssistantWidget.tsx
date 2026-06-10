import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { api } from "../../lib/api";
import { hasAppRole, useAuth } from "../../lib/auth";
import { buildAssistantFallback } from "./assistantFallback";

type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantChatResponse = {
  answer: string;
  role: string;
  roleLabel: string;
  provider: string;
  generatedAt: string;
  context: Record<string, unknown>;
  suggestions: string[];
};

const defaultSuggestions = [
  "Tom tat van hanh hom nay",
  "Co canh bao nao can xu ly khong?",
  "Nen uu tien viec gi truoc?",
];

function suggestionsForRole(roleName?: string | null) {
  if (hasAppRole(roleName, "branch_manager")) {
    return [
      "Chi nhanh dang co bao nhieu don cho?",
      "Don nao can uu tien truoc?",
      "Nguyen lieu nao sap het?",
    ];
  }
  if (hasAppRole(roleName, "warehouse_manager")) {
    return [
      "Nguyen lieu nao sap het?",
      "Can nhap kho gi truoc?",
      "Tom tat rui ro ton kho",
    ];
  }
  if (hasAppRole(roleName, "delivery_staff")) {
    return [
      "Co don nao san sang giao?",
      "Don giao nao can uu tien?",
      "Luu y khi lien he khach",
    ];
  }
  return defaultSuggestions;
}

function scopeForRole(roleName?: string | null) {
  if (hasAppRole(roleName, "admin")) return "toan he thong";
  if (hasAppRole(roleName, "branch_manager")) return "chi nhanh cua ban";
  if (hasAppRole(roleName, "warehouse_manager")) return "kho va nguyen lieu";
  if (hasAppRole(roleName, "delivery_staff")) return "don giao hang";
  return "vai tro hien tai";
}

function displayName(name?: string | null) {
  return name?.trim() || "ban";
}

async function sendAssistantMessage(message: string, history: AssistantChatMessage[]) {
  return api.post<AssistantChatResponse>("/ai/assistant/chat", {
    message,
    history: history.slice(-8),
  });
}

export function RoleAssistantWidget() {
  const { session } = useAuth();
  const roleName = session?.userInfo?.roleName || session?.role;
  const staffName = displayName(session?.userInfo?.name);
  const roleScope = scopeForRole(roleName);
  const initialSuggestions = useMemo(() => suggestionsForRole(roleName), [roleName]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      role: "assistant",
      content: `Chao ${staffName}. Minh co the ho tro bang du lieu trong pham vi ${roleScope}.`,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSuggestions(initialSuggestions);
  }, [initialSuggestions]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const ask = async (value: string) => {
    const text = value.trim();
    if (!text || loading) return;
    const nextMessages: AssistantChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const response = await sendAssistantMessage(text, messages);
      setMessages([...nextMessages, { role: "assistant", content: response.answer }]);
      if (response.suggestions?.length) setSuggestions(response.suggestions);
    } catch (error) {
      console.warn("AI assistant request failed", error);
      const fallback = buildAssistantFallback(text, roleName);
      setMessages([...nextMessages, { role: "assistant", content: fallback.answer }]);
      setSuggestions(fallback.suggestions);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ background: "#0F4761", color: "#FFFFFF" }}
        aria-label="Mo AI assistant"
        title="AI assistant"
      >
        <MessageCircle size={22} />
      </button>

      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex w-[min(390px,calc(100vw-40px))] flex-col overflow-hidden rounded-lg border bg-white shadow-2xl"
          style={{ borderColor: "#D8E2EA", maxHeight: "min(620px, calc(100vh - 110px))" }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "#0F4761", color: "#FFFFFF" }}>
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <div>
                <p className="text-sm font-bold leading-tight">AI assistant</p>
                <p className="text-[11px] leading-tight text-white/70">Theo vai tro dang nhap</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
              aria-label="Dong AI assistant"
              title="Dong"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-5"
                  style={{
                    background: message.role === "user" ? "#0F4761" : "#EEF5F8",
                    color: message.role === "user" ? "#FFFFFF" : "#14384A",
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: "#EEF5F8", color: "#14384A" }}>
                  <Loader2 size={15} className="animate-spin" />
                  Dang xu ly
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t px-3 py-3" style={{ borderColor: "#D8E2EA" }}>
            <div className="mb-2 flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  className="rounded-md border px-2 py-1 text-xs"
                  style={{ borderColor: "#B8CCD8", color: "#0F4761", background: "#F7FBFD" }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "#B8CCD8", color: "#14384A" }}
                placeholder="Hoi assistant..."
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white disabled:opacity-50"
                style={{ background: "#0F4761" }}
                aria-label="Gui"
                title="Gui"
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
