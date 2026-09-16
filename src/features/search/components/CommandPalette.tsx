"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Command, CornerDownLeft, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IconButton } from "@/components/shared/Button";
import { commandsForUser, type AppCommand } from "@/features/search/commandRegistry";
import { recordRecentResult, SearchResultList } from "@/features/search/components/SearchResultList";
import type { GlobalSearchResponse, RecentEntity, SearchResult } from "@/features/search/types";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

interface SearchBody { ok: boolean; data?: GlobalSearchResponse; }
interface RecentBody { ok: boolean; data?: { items: RecentEntity[] }; }

export function CommandPalette({ user }: { user: AuthenticatedUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<RecentEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSequence = useRef(0);
  const commands = useMemo(() => commandsForUser(user, query).slice(0, 6), [query, user]);
  const recentResults: SearchResult[] = useMemo(() => recent.map((item) => ({ ...item, reference: undefined, status: undefined, icon: "file", score: 0 })), [recent]);
  const visibleResults = query.trim().length >= 2 ? results : recentResults;
  const searchLoading = loading && open && query.trim().length >= 2;
  const selectable = useMemo(() => [...commands.map((item) => ({ kind: "command" as const, item })), ...visibleResults.map((item) => ({ kind: "result" as const, item }))], [commands, visibleResults]);

  const close = useCallback(() => { setOpen(false); setQuery(""); setResults([]); setActive(0); }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "/" && !open && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLSelectElement) && !(event.target instanceof HTMLElement && event.target.isContentEditable)) {
        event.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    void fetch("/api/v1/recent-items", { cache: "no-store" }).then((response) => response.json() as Promise<RecentBody>).then((body) => setRecent(body.data?.items ?? [])).catch(() => setRecent([]));
  }, [open]);

  useEffect(() => {
    const requestId = ++searchSequence.current;
    if (!open || query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch(`/api/v1/search?q=${encodeURIComponent(query)}&limit=8`, { cache: "no-store", signal: controller.signal })
        .then((response) => response.json() as Promise<SearchBody>)
        .then((body) => { if (requestId === searchSequence.current) { setResults(body.data?.results ?? []); setActive(0); } })
        .catch((reason: unknown) => { if (requestId === searchSequence.current && !(reason instanceof DOMException && reason.name === "AbortError")) setResults([]); })
        .finally(() => { if (requestId === searchSequence.current) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  function selectCommand(command: AppCommand) { close(); router.push(command.href); }
  function selectActive() {
    const selected = selectable[active];
    if (!selected) { if (query.trim().length >= 2) { close(); router.push(`/search?q=${encodeURIComponent(query.trim())}`); } return; }
    if (selected.kind === "command") selectCommand(selected.item);
    else { recordRecentResult(selected.item); close(); router.push(selected.item.deepLink); }
  }

  function handleDialogKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => selectable.length ? (value + 1) % selectable.length : 0); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => selectable.length ? (value - 1 + selectable.length) % selectable.length : 0); return; }
    if (event.key === "Enter") { event.preventDefault(); selectActive(); return; }
    if (event.key === "Tab") {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,a[href]');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  return (
    <>
      <button aria-haspopup="dialog" className="header-search" onClick={() => setOpen(true)} type="button"><Search aria-hidden="true" size={17} /><span>Tìm nhân viên, dự án, lô hàng, chứng từ...</span><kbd>Ctrl K</kbd></button>
      <IconButton className="header-search-mobile" label="Tìm kiếm" onClick={() => setOpen(true)}><Search aria-hidden="true" size={19} /></IconButton>
      {open ? (
        <div className="command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div aria-label="Tìm kiếm và lệnh" aria-modal="true" className="command-palette" onKeyDown={handleDialogKey} ref={dialogRef} role="dialog">
            <div className="command-input-row"><Search aria-hidden="true" size={19} /><input aria-activedescendant={selectable.length ? `command-option-${active}` : undefined} aria-autocomplete="list" aria-controls="command-results" aria-expanded="true" aria-label="Tìm kiếm toàn hệ thống" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm hoặc nhập lệnh" ref={inputRef} role="combobox" value={query} /><IconButton label="Đóng" onClick={close}><X aria-hidden="true" size={18} /></IconButton></div>
            <div className="command-content" id="command-results">
              {commands.length ? <section><h2>{query ? "Đi đến và tạo mới" : "Đi đến"}</h2><ul className="command-list" role="listbox">{commands.map((command, index) => <li aria-selected={active === index} className={active === index ? "is-active" : undefined} id={`command-option-${index}`} key={command.key} role="option"><button onClick={() => selectCommand(command)} type="button"><Command aria-hidden="true" size={17} /><span>{command.label}</span><ArrowRight aria-hidden="true" size={16} /></button></li>)}</ul></section> : null}
              {query.trim().length < 2 && recentResults.length ? <section><h2>Gần đây</h2><SearchResultList activeIndex={active - commands.length} idPrefix="command-option" indexOffset={commands.length} results={recentResults} /></section> : null}
              {query.trim().length >= 2 ? <section><h2>Tìm kiếm</h2>{searchLoading ? <div className="command-loading">Đang tìm…</div> : results.length ? <SearchResultList activeIndex={active - commands.length} idPrefix="command-option" indexOffset={commands.length} results={results} /> : <div className="command-empty">Không tìm thấy kết quả cho “{query}”.</div>}</section> : null}
            </div>
            <footer><span><CornerDownLeft aria-hidden="true" size={14} /> Chọn</span><span>↑↓ Di chuyển</span><span>Esc Đóng</span></footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
