import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { sendAssistantMessage, AssistantChatMessage } from "../api/assistantApi";
import { buildAssistantFallback } from "../../../../../features/assistant/assistantFallback";

interface AssistantWidgetProps {
  staffName: string;
}

export function AssistantWidget({ staffName }: AssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      role: "assistant",
      content: `Chào ${staffName}. Mình có thể hỗ trợ xử lý đơn, POS, thanh toán và tình trạng hàng chờ theo quyền hiện tại.`,
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Đơn nào cần xử lý trước?",
    "Cách xử lý đơn khách muốn hủy",
    "Tư vấn quy trình bán hàng",
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
      const fallback = buildAssistantFallback(text, "sales_staff");
      setMessages([...nextMessages, { role: "assistant", content: fallback.answer }]);
      setSuggestions(fallback.suggestions);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ background: "#0F4761", color: "#FFFFFF", boxShadow: "0 12px 24px rgba(15,71,97,0.25)" }}
        aria-label="Mở AI assistant"
        title="AI assistant"
      >
        <MessageCircle size={22} />
      </button>

      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex w-[min(380px,calc(100vw-40px))] flex-col overflow-hidden rounded-lg border shadow-2xl"
          style={{ background: "#FFFFFF", borderColor: "#E2E8F0", maxHeight: "min(620px, calc(100vh - 110px))" }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "#0F4761", color: "#FFF" }}>
            <div className="flex items-center gap-2">
              <Bot size={18} style={{ color: "#FFFFFF" }} />
              <div>
                <p className="text-sm font-bold leading-tight">AI assistant</p>
                <p className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.62)" }}>Theo vai trò đăng nhập</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ color: "rgba(255,255,255,0.8)" }}
              aria-label="Đóng AI assistant"
              title="Đóng"
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
                    background: message.role === "user" ? "#0F4761" : "#F1F5F9",
                    color: message.role === "user" ? "#FFF" : "#111827",
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: "#F1F5F9", color: "#111827" }}>
                  <Loader2 size={15} className="animate-spin" />
                  Đang xử lý
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t px-3 py-3" style={{ borderColor: "#E2E8F0" }}>
            <div className="mb-2 flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="rounded-md border px-2 py-1 text-xs"
                  style={{ borderColor: "#CBD5E1", color: "#0F4761", background: "#F8FAFC" }}
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
                style={{ borderColor: "#CBD5E1", color: "#111827" }}
                placeholder="Hỏi assistant..."
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
                style={{ background: "#0F4761", color: "#FFFFFF" }}
                aria-label="Gửi"
                title="Gửi"
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
