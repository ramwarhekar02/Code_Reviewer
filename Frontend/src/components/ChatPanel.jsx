import { useRef, useEffect } from "react";
import Markdown from "react-markdown";

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0s" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
    </div>
  );
}

export default function ChatPanel({ chatMessages, chatLoading, chatInput, setChatInput, sendChatMessage }) {
  const chatScrollerRef = useRef(null);

  useEffect(() => {
    if (chatScrollerRef.current) {
      chatScrollerRef.current.scrollTop = chatScrollerRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">AI Chat</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ask questions about your code</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3" ref={chatScrollerRef}>
        {chatMessages.map((message, index) => {
          const isError = message.role === "assistant" && message.content?.startsWith("⚠️");
          return (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-xl border border-white/5 p-4 ${
                isError 
                  ? "bg-red-500/10 border-red-500/30" 
                  : message.role === "user" 
                    ? "bg-sky-500/5 ml-8" 
                    : "bg-white/[0.03] mr-8"
              }`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${
                isError ? "text-red-400" : message.role === "user" ? "text-sky-400" : "text-emerald-400"
              }`}>
                {isError ? "Error" : message.role === "user" ? "You" : "AI"}
              </span>
              <div className={`text-sm prose prose-invert prose-sm max-w-none ${
                isError ? "text-red-300" : "text-gray-300"
              }`}>
                <Markdown>{message.content}</Markdown>
              </div>
            </div>
          );
        })}
        {chatLoading && (
          <div className="rounded-xl border border-white/5 bg-white/[0.03] mr-8 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-2">AI</span>
            <TypingDots />
          </div>
        )}
      </div>
      <form onSubmit={sendChatMessage} className="p-4 border-t border-white/5 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask something about your code..."
            rows={5}
            className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-emerald-500/30 transition-colors break-words overflow-y-auto"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-emerald-500 text-gray-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
