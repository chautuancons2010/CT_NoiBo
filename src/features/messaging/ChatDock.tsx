"use client";

/* eslint-disable react-hooks/set-state-in-effect -- chat state is reconciled with the API and realtime feed. */
import { ChevronDown, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { Button, IconButton } from "@/components/shared/Button";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { getAuthenticatedSupabaseRealtimeClient } from "@/lib/supabase/client";
import type { ChatMessage, ConversationSummary } from "./types";

const when = (value: string) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

export function ChatDock() {
  const bottom = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const composer = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selfId, setSelfId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File>();
  const [attachmentError, setAttachmentError] = useState("");
  const unread = conversations.reduce((sum, item) => sum + item.unreadCount, 0);
  const active = conversations.find((item) => item.id === activeId);

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/v1/chat/conversations", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setConversations(body.data ?? []);
  }, []);
  const loadMessages = useCallback(async () => {
    if (!activeId) { setMessages([]); return; }
    const response = await fetch(`/api/v1/chat/conversations/${activeId}/messages`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setMessages(body.data.items ?? []);
    setSelfId(body.data.selfAccountId ?? "");
    await fetch(`/api/v1/chat/conversations/${activeId}/read`, { method: "POST" });
    await loadConversations();
    queueMicrotask(() => bottom.current?.scrollIntoView());
  }, [activeId, loadConversations]);

  useEffect(() => { if (open && !activeId) void loadConversations().catch(() => undefined); }, [activeId, loadConversations, open]);
  useEffect(() => { if (open && activeId) void loadMessages().catch((reason) => setError(reason.message)); }, [activeId, loadMessages, open]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !dockRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let cleanup = () => {};
    void getAuthenticatedSupabaseRealtimeClient().then((client) => {
      if (!client || disposed) return;
      const channel = client.channel("global-chat-dock").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (activeId && (payload.new as { conversation_id?: string }).conversation_id === activeId) void loadMessages();
        else void loadConversations();
      }).subscribe();
      cleanup = () => { void client.removeChannel(channel); };
      if (disposed) cleanup();
    });
    return () => { disposed = true; cleanup(); };
  }, [activeId, loadConversations, loadMessages, open]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeId || sending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const bodyText = String(form.get("body") ?? "").trim();
    if (!bodyText) return;
    setSending(true);
    setError("");
    setAttachmentError("");
    try {
      const payload = new FormData();
      payload.set("body", bodyText);
      if (attachmentFile) payload.set("file", attachmentFile);
      const response = await fetch(`/api/v1/chat/conversations/${activeId}/messages`, { method: "POST", body: payload });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      formElement.reset();
      setAttachmentFile(undefined);
      await loadMessages();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Không thể gửi tin nhắn.";
      setError(message);
      if (attachmentFile) setAttachmentError(message);
    } finally {
      setSending(false);
    }
  }
  if (!open) return <button aria-label="Mở chat" className="chat-dock-launcher" onClick={() => { setOpen(true); setMinimized(false); }}><MessageCircle size={21}/></button>;
  return <aside aria-label="Chat nội bộ" className={`chat-dock${minimized ? " is-minimized" : ""}`} ref={dockRef}><header><button onClick={() => setMinimized(false)}><MessageCircle size={18}/><strong>{active?.title ?? "Tin nhắn"}</strong>{unread ? <span>{unread}</span> : null}</button><IconButton label={minimized ? "Mở rộng" : "Thu nhỏ"} onClick={() => setMinimized((value) => !value)}><ChevronDown size={17}/></IconButton><IconButton label="Đóng chat" onClick={() => setOpen(false)}><X size={17}/></IconButton></header>{!minimized ? <>{activeId ? <><div className="chat-dock__messages">{messages.map((item) => <article className={item.senderAccountId === selfId ? "is-own" : ""} key={item.id}><p>{item.body}</p>{item.metadata?.payslipId?<a className="message-payslip" href={`/accounting/payslips/${item.metadata.payslipId}`}><span>Phiếu lương {item.metadata.payslipPeriod??""}</span><strong>Xem · Tải PDF</strong></a>:null}{item.attachments.map((attachment) => <a href={`/api/v1/chat/conversations/${activeId}/attachments/${attachment.id}`} key={attachment.id} rel="noreferrer" target="_blank"><Paperclip size={13}/>{attachment.fileName}</a>)}<time>{when(item.createdAt)}</time></article>)}<div ref={bottom}/></div><form className="chat-dock__composer" onSubmit={send} ref={composer}><input aria-label="Tin nhắn" className="input" name="body" placeholder="Nhập tin nhắn" required/><ImageUploader accept="image/jpeg,image/png,image/webp,application/pdf" compact error={attachmentError} file={attachmentFile} label="Tệp" onFileChange={(file)=>{setAttachmentFile(file);setAttachmentError("");}} onRetry={()=>composer.current?.requestSubmit()} uploading={sending&&Boolean(attachmentFile)}/><Button aria-label="Gửi" disabled={sending} size="sm" type="submit" variant="primary"><Send size={16}/></Button></form></> : <div className="chat-dock__conversations">{conversations.map((item) => <button key={item.id} onClick={() => setActiveId(item.id)}><span><strong>{item.title}</strong><small>{item.lastMessage?.body ?? "Chưa có tin nhắn"}</small></span>{item.unreadCount ? <b>{item.unreadCount}</b> : null}</button>)}{conversations.length === 0 ? <p>Chưa có hội thoại.</p> : null}</div>}{error ? <p className="chat-dock__error">{error}</p> : null}</> : null}</aside>;
}
