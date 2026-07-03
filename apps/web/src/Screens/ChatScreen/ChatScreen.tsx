import { useState } from "react";
import { X } from "lucide-react";
import { sendChat, type ChatMessage } from "../../api.ts";
import styles from "./ChatScreen.module.css";

type ChatScreenProps = {
  onClose?: () => void;
  onAssistantReply?: () => void;
};

export const ChatScreen = ({ onClose, onAssistantReply }: ChatScreenProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setPending(true);
    setFailed(false);
    try {
      const response = await sendChat(next);
      setMessages([...next, { role: "assistant", content: response }]);
      onAssistantReply?.();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.container} aria-label="Chat with the emcee">
      <header className="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 className="font-semibold">Ask the emcee</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded p-1 text-gray-500 hover:text-gray-800"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        )}
      </header>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 && !pending && (
          <li className="m-auto text-center text-gray-400">
            Need a set idea, a stage name, or a hand signing up? Ask away.
          </li>
        )}
        {messages.map((message, i) => (
          <li
            key={i}
            className={
              message.role === "user"
                ? "max-w-[85%] self-end rounded-lg bg-blue-100 px-3 py-2"
                : "max-w-[85%] self-start rounded-lg bg-gray-100 px-3 py-2"
            }
          >
            {message.content}
          </li>
        ))}
        {pending && <li className="self-start px-3 py-2 text-gray-500">Thinking…</li>}
        {failed && (
          <li className="self-start px-3 py-2 text-red-600">Something went wrong — try again.</li>
        )}
      </ul>

      <form onSubmit={submit} className="flex gap-2 border-t border-gray-200 p-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Need a set idea or an intro?"
          aria-label="Chat message"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
};
