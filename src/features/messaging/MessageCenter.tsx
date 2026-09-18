"use client";

/* eslint-disable react-hooks/set-state-in-effect -- conversation state is reconciled asynchronously. */
import { Paperclip, Search, Send, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Input, Select } from "@/components/shared/FormControls";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { getAuthenticatedSupabaseRealtimeClient } from "@/lib/supabase/client";
import type { ChatMessage, ConversationSummary } from "./types";

type Account = { id: string; name: string; employeeCode?: string; department?: string; roleLabel?: string };
const when = (value: string) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function MessageCenter({ activeId, canCreateGroup }: { activeId?: string; canCreateGroup: boolean }) {
  const router = useRouter();
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLFormElement>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selfId, setSelfId] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [group, setGroup] = useState(false);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string>();
  const [conversationSearch, setConversationSearch] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File>();
  const [attachmentError, setAttachmentError] = useState("");

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/v1/chat/conversations", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setConversations(body.data);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    const response = await fetch(`/api/v1/chat/conversations/${activeId}/messages`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setMessages(body.data.items);
    setNextCursor(body.data.nextCursor);
    setSelfId(body.data.selfAccountId);
    await fetch(`/api/v1/chat/conversations/${activeId}/read`, { method: "POST" });
    await loadConversations();
    queueMicrotask(() => bottom.current?.scrollIntoView());
  }, [activeId, loadConversations]);

  async function loadOlderMessages() {
    if (!activeId || !nextCursor) return;
    const response = await fetch(`/api/v1/chat/conversations/${activeId}/messages?cursor=${encodeURIComponent(nextCursor)}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message); return; }
    setMessages((current) => [...body.data.items, ...current]);
    setNextCursor(body.data.nextCursor);
  }

  useEffect(() => {
    if (!activeId) void loadConversations().catch((reason) => setError(reason.message));
  }, [activeId, loadConversations]);

  useEffect(() => {
    if (!showCreate) return;
    let disposed = false;
    void fetch("/api/v1/chat/accounts", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      if (!disposed) setAccounts(body.data ?? []);
    }).catch((reason) => { if (!disposed) setError(reason.message); });
    return () => { disposed = true; };
  }, [showCreate]);

  useEffect(() => {
    void loadMessages().catch((reason) => setError(reason.message));
  }, [loadMessages]);

  useEffect(() => {
    if (!activeId) return;
    let disposed = false;
    let cleanup = () => {};
    void getAuthenticatedSupabaseRealtimeClient().then((client) => {
      if (!client || disposed) return;
      const channel = client.channel(`conversation-${activeId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, () => void loadMessages())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_attachments", filter: `conversation_id=eq.${activeId}` }, () => void loadMessages())
        .subscribe();
      cleanup = () => { void client.removeChannel(channel); };
      if (disposed) cleanup();
    });
    return () => { disposed = true; cleanup(); };
  }, [activeId, loadMessages]);

  function toggleGroupMember(accountId: string) {
    setGroupMembers((current) => current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId]);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = group
      ? { type: "group", title: String(form.get("title") ?? ""), accountIds: groupMembers }
      : { type: "direct", accountId: String(form.get("accountId") ?? "") };
    const response = await fetch("/api/v1/chat/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error?.message);
      return;
    }
    setShowCreate(false);
    setGroupMembers([]);
    await loadConversations();
    router.push(`/messages/${body.data.id}`);
  }

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
  return (
    <div className="message-center">
      <Card className="message-sidebar">
        <div className="panel-header"><h2>Tin nhắn</h2><Button onClick={() => setShowCreate((value) => !value)} size="sm" variant="primary">Mới</Button></div>
        {showCreate ? (
          <form className="message-create" onSubmit={create}>
            {canCreateGroup ? <label className="choice-field"><input checked={group} className="checkbox" onChange={(event) => { setGroup(event.target.checked); setGroupMembers([]); }} type="checkbox" />Nhóm</label> : null}
            {group ? <Input label="Tên nhóm" name="title" required /> : null}
            {group ? (
              <fieldset className="message-member-picker">
                <legend>Thành viên</legend>
                {accounts.map((item) => <label key={item.id}><input checked={groupMembers.includes(item.id)} onChange={() => toggleGroupMember(item.id)} type="checkbox" />{item.name}</label>)}
              </fieldset>
            ) : <Select label="Thành viên" name="accountId" options={accounts.map((item) => ({ value: item.id, label: `${item.name}${item.department || item.employeeCode ? ` · ${[item.department,item.employeeCode].filter(Boolean).join(" · ")}` : item.roleLabel ? ` · ${item.roleLabel}` : ""}` }))} placeholder="Chọn người dùng" required />}
            <Button disabled={group && !groupMembers.length} type="submit">Tạo hội thoại</Button>
          </form>
        ) : null}
        <label className="message-search"><Search size={16} /><input aria-label="Tìm hội thoại" onChange={(event) => setConversationSearch(event.target.value)} placeholder="Tìm hội thoại" value={conversationSearch} /></label>
        <div className="conversation-list">
          {conversations.filter((item) => item.title.toLocaleLowerCase("vi").includes(conversationSearch.trim().toLocaleLowerCase("vi"))).map((item) => <button className={item.id === activeId ? "is-active" : ""} key={item.id} onClick={() => router.push(`/messages/${item.id}`)}><span><strong>{item.title}</strong><small>{item.lastMessage ? `${item.lastMessage.senderName}: ${item.lastMessage.body}` : "Chưa có tin nhắn"}</small></span>{item.unreadCount ? <b>{item.unreadCount}</b> : null}</button>)}
        </div>
      </Card>
      <Card className="message-thread">
        {activeId ? <><div className="message-thread__header"><Users size={18} /><strong>{conversations.find((item) => item.id === activeId)?.title ?? "Hội thoại"}</strong></div><div className="message-list">{nextCursor ? <Button className="message-load-older" onClick={() => void loadOlderMessages()} size="sm" variant="ghost">Tải tin cũ hơn</Button> : null}{messages.map((item) => <article className={item.senderAccountId === selfId ? "is-own" : ""} key={item.id}><span>{item.senderName}</span><p>{item.body}</p>{item.metadata?.payslipId?<a className="message-payslip" href={`/accounting/payslips/${item.metadata.payslipId}`}><span>Phiếu lương {item.metadata.payslipPeriod??""}</span><strong>Xem · Tải PDF</strong></a>:null}{item.attachments.map((attachment) => <a className="message-attachment" href={`/api/v1/chat/conversations/${activeId}/attachments/${attachment.id}`} key={attachment.id} rel="noreferrer" target="_blank"><Paperclip size={14} /><span>{attachment.fileName}</span><small>{fileSize(attachment.sizeBytes)}</small></a>)}<time dateTime={item.createdAt}>{when(item.createdAt)}</time></article>)}<div ref={bottom} /></div><form className="message-composer" onSubmit={send} ref={composer}><input aria-label="Tin nhắn" autoComplete="off" className="input" name="body" placeholder="Nhập tin nhắn" required /><ImageUploader accept="image/jpeg,image/png,image/webp,application/pdf" compact error={attachmentError} file={attachmentFile} label="Tệp" onFileChange={(file) => { setAttachmentFile(file); setAttachmentError(""); }} onRetry={() => composer.current?.requestSubmit()} uploading={sending && Boolean(attachmentFile)} /><Button disabled={sending} leftIcon={<Send size={16} />} type="submit" variant="primary">Gửi</Button></form></> : <div className="message-empty"><MessageCircleIcon /><strong>Chọn một hội thoại</strong></div>}
        {error ? <p className="form-error">{error}</p> : null}
      </Card>
    </div>
  );
}

function MessageCircleIcon() { return <span aria-hidden="true" className="message-empty__icon">●</span>; }
