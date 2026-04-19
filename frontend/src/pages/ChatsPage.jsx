import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function ChatsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const chatIdFromQuery = Number(searchParams.get("chat") || 0);

  const loadChats = async () => {
    const data = await api.getChats();
    setChats(data);
  };

  useEffect(() => {
    loadChats().catch(() => {});
    const timer = setInterval(() => {
      loadChats().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!["admin", "support"].includes(user?.role)) return;
    const q = userSearch.trim();
    if (q.length < 2) return setUserSuggestions([]);
    const t = setTimeout(async () => {
      try {
        setUserSuggestions(await api.suggestChatUsers(q));
      } catch {
        setUserSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [userSearch, user?.role]);

  const selected = useMemo(() => {
    if (active) return active;
    if (chatIdFromQuery) return chats.find((c) => c.id === chatIdFromQuery) || null;
    return chats[0] || null;
  }, [active, chats, chatIdFromQuery]);

  useEffect(() => {
    if (!selected) return;
    api.getMessages(selected.id).then(setMessages).catch(() => setMessages([]));
  }, [selected?.id]);

  const send = async () => {
    if (!selected || !text.trim()) return;
    await api.sendMessage(selected.id, text.trim());
    setText("");
    setMessages(await api.getMessages(selected.id));
    await loadChats();
  };

  const editMessage = async (messageId, currentBody) => {
    const next = window.prompt("Edit your message (15 min window):", currentBody);
    if (!next || next.trim() === currentBody) return;
    await api.editMessage(messageId, next.trim());
    setMessages(await api.getMessages(selected.id));
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-[320px_1fr]">
      <Card className="max-h-[75vh] overflow-y-auto p-2">
        {["admin", "support"].includes(user?.role) ? (
          <div className="mb-2 space-y-2 border-b border-border pb-2">
            <Input placeholder="Search users to chat" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            {userSuggestions.length > 0 ? (
              <div className="space-y-1">
                {userSuggestions.map((u) => (
                  <button
                    key={u.id}
                    className="w-full rounded-md border border-border px-2 py-1 text-left text-sm hover:bg-muted"
                    onClick={async () => {
                      const c = await api.startDirectChat(u.id);
                      setUserSearch("");
                      setUserSuggestions([]);
                      const updated = await api.getChats();
                      setChats(updated);
                      const found = updated.find((x) => x.id === c.chat_id);
                      if (found) setActive(found);
                    }}
                  >
                    {u.name} ({u.mobile || u.email})
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {chats.map((chat) => (
          <button
            key={chat.id}
            className={`w-full rounded-md p-3 text-left hover:bg-muted ${selected?.id === chat.id ? "bg-muted" : ""}`}
            onClick={() => setActive(chat)}
          >
            <p className="font-medium">{chat.title}</p>
            <p className="text-sm text-muted-foreground">
              {chat.other_user} {Number(chat.unread_count) > 0 ? `• ${chat.unread_count} new` : ""}
            </p>
          </button>
        ))}
      </Card>

      <Card className="flex h-[75vh] flex-col p-4">
        <div className="mb-3 border-b border-border pb-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{selected ? selected.title : "Select chat"}</h2>
            {selected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!window.confirm("Delete this chat?")) return;
                  await api.deleteChat(selected.id);
                  setActive(null);
                  setMessages([]);
                  await loadChats();
                }}
              >
                Delete chat
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[70%] rounded-md p-2 text-sm ${m.sender_id === user?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p>{m.body}</p>
              <div className="mt-1 flex items-center gap-2 text-xs opacity-75">
                <span>{m.sender_name}</span>
                {m.sender_id === user?.id ? (
                  <button className="underline" onClick={() => editMessage(m.id, m.body)}>Edit</button>
                ) : null}
              </div>
            </div>
          ))}
          {!selected ? <p className="text-sm text-muted-foreground">No chat selected. Pick one and start the banter.</p> : null}
          {selected && messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet. Say hi before the silence gets awkward.</p> : null}
        </div>

        <div className="mt-3 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type message" />
          <Button onClick={send}>Send</Button>
        </div>
      </Card>
    </div>
  );
}
