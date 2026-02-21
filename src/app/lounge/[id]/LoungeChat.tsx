"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { sendLoungeMessage, joinLounge } from "~/server/actions";

type Message = {
  id: string;
  text: string;
  createdAt: Date;
  user: { name: string; handle: string; image: string | null };
};

type CurrentUser = {
  id: string;
  name: string;
  image: string | null;
};

const POLL_INTERVAL = 4000;

export function LoungeChat({
  loungeId,
  initialMessages,
  currentUser,
  isMember,
}: {
  loungeId: string;
  initialMessages: Message[];
  currentUser: CurrentUser;
  isMember: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(isMember);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(initialMessages[initialMessages.length - 1]?.id);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling for new messages
  useEffect(() => {
    if (!joined) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/lounge/${loungeId}/messages?after=${lastIdRef.current ?? ""}`,
        );
        if (!res.ok) return;
        const newMsgs: Message[] = await res.json();
        if (newMsgs.length > 0) {
          setMessages((prev) => [...prev, ...newMsgs]);
          lastIdRef.current = newMsgs[newMsgs.length - 1]?.id;
        }
      } catch {
        // ignore network errors during polling
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [loungeId, joined]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");

    startTransition(async () => {
      const msg = await sendLoungeMessage(loungeId, trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          text: msg.text,
          createdAt: new Date(msg.createdAt),
          user: { name: currentUser.name, handle: "", image: currentUser.image },
        },
      ]);
      lastIdRef.current = msg.id;
    });
  };

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await joinLounge(loungeId);
      setJoined(true);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <p className="py-12 text-center font-serif italic text-charcoal/30">
              No messages yet. Start the discussion!
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.user.name === currentUser.name;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-charcoal/10">
                  {msg.user.image ? (
                    <Image src={msg.user.image} alt={msg.user.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-sage/20 text-xs font-bold text-sage">
                      {msg.user.name[0]}
                    </div>
                  )}
                </div>
                <div className={`max-w-[65%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {!isMe && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-charcoal/35">
                      {msg.user.name}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isMe
                        ? "rounded-tr-sm bg-sage text-white"
                        : "rounded-tl-sm bg-white/70 text-charcoal shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-charcoal/25">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input / Join prompt */}
      <div className="border-t border-charcoal/8 bg-white/50 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          {!joined ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-charcoal/50">Join the lounge to participate in the discussion.</p>
              <button
                type="button"
                onClick={handleJoin}
                disabled={isJoining}
                className="rounded-full bg-sage px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-sage/20 transition-all hover:scale-105 disabled:opacity-60"
              >
                {isJoining ? "Joining..." : "Join Lounge"}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Share your thoughts…"
                className="flex-grow rounded-full border border-charcoal/12 bg-white/80 px-5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-sage/50 focus:outline-none focus:ring-2 focus:ring-sage/15"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending || !text.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sage text-white shadow-lg shadow-sage/20 transition-all hover:scale-105 disabled:opacity-50 active:scale-95"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
