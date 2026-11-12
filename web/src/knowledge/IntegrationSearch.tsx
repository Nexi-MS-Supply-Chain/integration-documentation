// /viden/integrationer — search the PDFs with Terminal, Baxi and Sofie integration data (plans/integrationssoegning.md).
// Phase 1 runs on mock documents in the browser; phase 2 swaps search() for the knowledge search API.

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, fmtBytes, fmtDay } from "../ui";
import { DOC_TYPES, INTEGRATIONS, PDF_DOCS, type DocType, type Integration, type PdfDoc } from "./integrationDocs";
import { highlight, queryRegexes, search, type Answer, type Segment, type SortKey } from "./integrationSearch";
import "./integrationSearch.css";

const EXAMPLES = ["Hvilken byte er TLS i steps?", "T-104", "\"dagsafslutning\"", "GetLastTransaction", "settlement.mismatch", "fejl 2010", "integration:sofie webhook"];
const RECENT_KEY = "gaer.integrationssoeg.recent";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "relevans", label: "Relevans" },
  { key: "nyeste", label: "Nyeste" },
  { key: "titel", label: "Titel" },
];

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function Marked({ segments }: { segments: Segment[] }) {
  return <>{segments.map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}</>;
}

function IntegrationPill({ integration }: { integration: Integration }) {
  return <span className="isearch-pill" style={{ ["--c" as string]: INTEGRATIONS[integration].color }}>{INTEGRATIONS[integration].label}</span>;
}

type Selection = { docId: string; page: number };

export function IntegrationSearch() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const integrations = list(params.get("i")).filter((x): x is Integration => x in INTEGRATIONS);
  const types = list(params.get("t")).filter((x): x is DocType => x in DOC_TYPES);
  const sort = (SORTS.find((s) => s.key === params.get("sort"))?.key ?? "relevans") as SortKey;
  const selected: Selection | null = params.get("doc") ? { docId: params.get("doc")!, page: Number(params.get("p")) || 1 } : null;

  const [text, setText] = useState(q);
  const [recent, setRecent] = useState(loadRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setText(q), [q]);

  const outcome = useMemo(() => search(q, { integrations, types }, sort), [q, params.get("i"), params.get("t"), sort]);
  const regexes = useMemo(() => queryRegexes(q), [q]);

  const update = (patch: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace });
  };

  const runSearch = (value: string) => {
    const v = value.trim();
    setText(v);
    update({ q: v || null, doc: null, p: null });
    if (v) {
      const next = [v, ...recent.filter((r) => r !== v)].slice(0, 6);
      setRecent(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(text);
  };
  const toggle = (key: "i" | "t", value: string, current: string[]) => {
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    update({ [key]: next.join(",") || null, doc: null, p: null });
  };
  const select = (docId: string, page: number) => update({ doc: docId, p: String(page) }, true);

  // Flat list of every page hit, in result order, for j/k navigation.
  const flat = useMemo(
    () => outcome.results.flatMap((r) => (r.pages.length ? r.pages.map((h) => ({ docId: r.doc.id, page: h.page.n })) : [{ docId: r.doc.id, page: 1 }])),
    [outcome],
  );
  const flatIndex = selected ? flat.findIndex((f) => f.docId === selected.docId && f.page === selected.page) : -1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "Escape") {
        if (typing) (e.target as HTMLElement).blur();
        else if (selected) update({ doc: null, p: null }, true);
      } else if (!typing && (e.key === "j" || e.key === "k") && flat.length) {
        const i = e.key === "j" ? Math.min(flat.length - 1, flatIndex + 1) : Math.max(0, flatIndex - 1);
        select(flat[i].docId, flat[i].page);
        document.getElementById(`hit-${flat[i].docId}-${flat[i].page}`)?.scrollIntoView({ block: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selectedDoc = selected ? PDF_DOCS.find((d) => d.id === selected.docId) ?? null : null;
  const activeFilters = integrations.length + types.length + outcome.parsed.integrations.length + outcome.parsed.types.length;
  const hasQuery = regexes.length > 0;

  return (
    <div className="stack isearch" style={{ ["--gap" as string]: "20px" }}>
      <Link to="/viden" className="small">← Viden</Link>
      <div className="stack" style={{ ["--gap" as string]: "8px" }}>
        <div className="eyebrow">Viden · Integrationer</div>
        <h2>Søg i integrationsdokumenter</h2>
        <p className="muted" style={{ maxWidth: 760, margin: 0 }}>
          Find svaret i PDF'erne om betalingsterminaler, BAXI og Sofie — fejlkoder, API-kald, opsætning og driftsvejledninger.
        </p>
      </div>
      <Alert kind="info">Eksempeldata: dokumenterne her er mock-data, indtil de rigtige PDF'er ligger i et vidensrum.</Alert>

      <form onSubmit={submit} role="search" className="isearch-bar">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="isearch-icon"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input ref={inputRef} type="search" value={text} onChange={(e) => setText(e.target.value)} maxLength={400}
          aria-label="Søg i integrationsdokumenter" placeholder="Søg efter fejlkode, API-kald, emne …" autoFocus />
        {text && <button type="button" className="btn btn-ghost btn-sm" onClick={() => runSearch("")} aria-label="Ryd søgning">Ryd</button>}
        <kbd className="isearch-kbd" title="Tryk / for at søge">/</kbd>
        <button className="btn btn-primary">Søg</button>
      </form>

      <div className="row isearch-chips" style={{ ["--gap" as string]: "6px" }}>
        <span className="tiny muted">{recent.length ? "Seneste:" : "Prøv:"}</span>
        {(recent.length ? recent : EXAMPLES).map((ex) => (
          <button key={ex} type="button" className="isearch-chip" onClick={() => runSearch(ex)}>{ex}</button>
        ))}
        {recent.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY); }}>Glem</button>
        )}
        <details className="isearch-help">
          <summary className="tiny">Søgetips</summary>
          <ul className="tiny muted">
            <li><code>"dagsafslutning fejlede"</code> — præcis sætning</li>
            <li><code>afstem</code> — finder også „afstemning“ og „afstemmes“</li>
            <li><code>-annullering</code> — udelad sider med ordet</li>
            <li><code>integration:baxi</code>, <code>type:fejlkoder</code> — filtrér i søgefeltet</li>
            <li><code>Hvad betyder S-404?</code> — stil et spørgsmål og få et svar med kilder</li>
            <li><kbd>/</kbd> søg · <kbd>j</kbd>/<kbd>k</kbd> næste/forrige træf · <kbd>Esc</kbd> luk visning</li>
          </ul>
        </details>
      </div>

      <div className="isearch-tiles" role="group" aria-label="Integration">
        {(Object.keys(INTEGRATIONS) as Integration[]).map((k) => {
          const on = integrations.includes(k) || outcome.parsed.integrations.includes(k);
          return (
            <button key={k} type="button" aria-pressed={on} className={`isearch-tile${on ? " on" : ""}`}
              style={{ ["--c" as string]: INTEGRATIONS[k].color }} onClick={() => toggle("i", k, integrations)}
              disabled={outcome.parsed.integrations.includes(k)}>
              <span className="isearch-tile-head"><strong>{INTEGRATIONS[k].label}</strong><span className="num">{outcome.facets.integrations[k]}</span></span>
              <span className="tiny muted">{INTEGRATIONS[k].description}</span>
            </button>
          );
        })}
      </div>

      <div className="spread">
        <div className="row" role="group" aria-label="Dokumenttype" style={{ ["--gap" as string]: "6px" }}>
          {(Object.keys(DOC_TYPES) as DocType[]).map((k) => {
            const on = types.includes(k) || outcome.parsed.types.includes(k);
            return (
              <button key={k} type="button" aria-pressed={on} className={`isearch-chip${on ? " on" : ""}`}
                disabled={outcome.facets.types[k] === 0 && !on} onClick={() => toggle("t", k, types)}>
                {DOC_TYPES[k]} <span className="num muted">{outcome.facets.types[k]}</span>
              </button>
            );
          })}
          {activeFilters > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ i: null, t: null, doc: null, p: null })}>Nulstil filtre</button>
          )}
        </div>
        <label className="row small" style={{ ["--gap" as string]: "6px" }}>
          <span className="muted">Sortér</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value === "relevans" ? null : e.target.value })}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className={`isearch-layout${selectedDoc ? " with-preview" : ""}`}>
        <section className="stack" aria-label="Søgeresultater" aria-live="polite" style={{ ["--gap" as string]: "12px" }}>
          <p className="small muted" style={{ margin: 0 }}>
            {hasQuery
              ? `${outcome.results.length} dokument${outcome.results.length === 1 ? "" : "er"} · ${outcome.totalPages} side${outcome.totalPages === 1 ? "" : "r"} med træf`
              : `${outcome.results.length} dokument${outcome.results.length === 1 ? "" : "er"}`}
          </p>
          {outcome.parsed.question && hasQuery && (
            <AnswerCard key={q} answer={outcome.answer} onCite={select} />
          )}
          {outcome.results.length === 0 && (
            <div className="card muted-bg">
              <strong>Ingen træf{q ? ` for „${q}“` : ""}.</strong>
              {outcome.suggestion && (
                <span className="small">Mente du <button type="button" className="isearch-link" onClick={() => runSearch(outcome.suggestion!)}>{outcome.suggestion}</button>?</span>
              )}
              <span className="small muted">Prøv færre ord, en del af ordet, eller fjern filtrene.</span>
            </div>
          )}
          {outcome.results.map((r) => (
            <article key={r.doc.id} className={`card isearch-result${selected?.docId === r.doc.id ? " selected" : ""}`}>
              <button type="button" className="isearch-doc" onClick={() => select(r.doc.id, r.pages[0]?.page.n ?? 1)}>
                <span className="isearch-pdf" aria-hidden="true">PDF</span>
                <span className="stack" style={{ ["--gap" as string]: "4px", minWidth: 0 }}>
                  <strong>{r.doc.title}</strong>
                  <span className="tiny muted isearch-file">{r.doc.filename}</span>
                </span>
              </button>
              <div className="row" style={{ ["--gap" as string]: "6px" }}>
                <IntegrationPill integration={r.doc.integration} />
                <span className="pill">{DOC_TYPES[r.doc.type]}</span>
                <span className="pill mono">v{r.doc.version}</span>
                <span className="tiny muted">{r.doc.pages.length} sider · {fmtBytes(r.doc.sizeBytes)} · {fmtDay(r.doc.updated)}</span>
              </div>
              {r.pages.length > 0 && (
                <ul className="isearch-hits">
                  {r.pages.slice(0, 3).map((h) => {
                    const on = selected?.docId === r.doc.id && selected.page === h.page.n;
                    return (
                      <li key={h.page.n}>
                        <button type="button" id={`hit-${r.doc.id}-${h.page.n}`} className={`isearch-hit${on ? " on" : ""}`} onClick={() => select(r.doc.id, h.page.n)}>
                          <span className="tiny isearch-hit-meta">
                            <strong>Side {h.page.n}</strong> · <Marked segments={highlight(h.page.heading, regexes)} />
                            <span className="muted"> · {h.matches} træf</span>
                          </span>
                          <span className="small"><Marked segments={h.excerpt} /></span>
                        </button>
                      </li>
                    );
                  })}
                  {r.pages.length > 3 && <li className="tiny muted" style={{ paddingLeft: 12 }}>+ {r.pages.length - 3} sider mere — åbn dokumentet for at se dem</li>}
                </ul>
              )}
            </article>
          ))}
        </section>
        {selectedDoc && selected && (
          <Preview doc={selectedDoc} page={selected.page} q={q} onPage={(p) => select(selectedDoc.id, p)} onClose={() => update({ doc: null, p: null }, true)} />
        )}
      </div>
    </div>
  );
}

function Preview({ doc, page, q, onPage, onClose }: { doc: PdfDoc; page: number; q: string; onPage: (p: number) => void; onClose: () => void }) {
  const regexes = useMemo(() => queryRegexes(q), [q]);
  const [copied, setCopied] = useState(false);
  const current = doc.pages.find((p) => p.n === page) ?? doc.pages[0];
  const hitsPerPage = useMemo(
    () => new Map(doc.pages.map((p) => [p.n, highlight(`${p.heading} ${p.text}`, regexes).filter((s) => s.hit).length])),
    [doc, regexes],
  );
  const hitPages = doc.pages.filter((p) => (hitsPerPage.get(p.n) ?? 0) > 0).map((p) => p.n);
  const hitPos = hitPages.indexOf(current.n);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = paperRef.current;
    const mark = wrap?.querySelector("mark");
    wrap?.scrollTo({ top: mark ? Math.max(0, mark.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop - wrap.clientHeight / 3) : 0 });
    setCopied(false);
  }, [doc.id, current.n, q]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  };

  return (
    <aside className="card isearch-preview" aria-label={`Forhåndsvisning af ${doc.filename}`}>
      <div className="spread">
        <div className="stack" style={{ ["--gap" as string]: "2px", minWidth: 0 }}>
          <strong>{doc.title}</strong>
          <span className="tiny muted isearch-file">{doc.filename}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Luk forhåndsvisning">✕</button>
      </div>
      <div className="spread">
        <div className="row" style={{ ["--gap" as string]: "4px" }}>
          <button type="button" className="btn btn-outline btn-sm" disabled={current.n <= 1} onClick={() => onPage(current.n - 1)} aria-label="Forrige side">‹</button>
          <span className="small num">Side {current.n} af {doc.pages.length}</span>
          <button type="button" className="btn btn-outline btn-sm" disabled={current.n >= doc.pages.length} onClick={() => onPage(current.n + 1)} aria-label="Næste side">›</button>
        </div>
        {hitPages.length > 0 && (
          <div className="row" style={{ ["--gap" as string]: "4px" }}>
            <button type="button" className="btn btn-ghost btn-sm" disabled={hitPos === 0 || (hitPos < 0 && current.n < hitPages[0])}
              onClick={() => onPage(hitPos > 0 ? hitPages[hitPos - 1] : [...hitPages].reverse().find((n) => n < current.n) ?? hitPages[0])}>↑ Forrige træf</button>
            <span className="tiny muted num">{hitPos >= 0 ? `${hitPos + 1}/${hitPages.length}` : `${hitPages.length} sider`}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={hitPos === hitPages.length - 1 || (hitPos < 0 && current.n > hitPages[hitPages.length - 1])}
              onClick={() => onPage(hitPos >= 0 ? hitPages[hitPos + 1] : hitPages.find((n) => n > current.n) ?? hitPages[0])}>Næste træf ↓</button>
          </div>
        )}
      </div>

      <div className="isearch-viewer">
        <nav className="isearch-thumbs" aria-label="Sider">
          {doc.pages.map((p) => {
            const n = hitsPerPage.get(p.n) ?? 0;
            return (
              <button key={p.n} type="button" className={`isearch-thumb${p.n === current.n ? " on" : ""}`} onClick={() => onPage(p.n)}
                aria-label={`Side ${p.n}${n ? `, ${n} træf` : ""}`} aria-current={p.n === current.n ? "page" : undefined}>
                <span className="isearch-thumb-lines" aria-hidden="true"><i /><i /><i /><i /></span>
                <span className="tiny num">{p.n}</span>
                {n > 0 && <span className="isearch-thumb-badge num">{n}</span>}
              </button>
            );
          })}
        </nav>
        <div className="isearch-paper-wrap" ref={paperRef}>
          <div className="isearch-paper">
            <div className="isearch-paper-head tiny">
              <span>{INTEGRATIONS[doc.integration].label} · {doc.title}</span>
              <span>v{doc.version}</span>
            </div>
            <h3><Marked segments={highlight(current.heading, regexes)} /></h3>
            <p><Marked segments={highlight(current.text, regexes)} /></p>
            <div className="isearch-paper-foot tiny">Side {current.n} af {doc.pages.length} · opdateret {fmtDay(doc.updated)}</div>
          </div>
        </div>
      </div>

      <div className="row" style={{ ["--gap" as string]: "8px" }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={copyLink}>{copied ? "Link kopieret ✓" : "Kopiér link til siden"}</button>
        <IntegrationPill integration={doc.integration} />
        <span className="pill">{DOC_TYPES[doc.type]}</span>
      </div>
    </aside>
  );
}

function AnswerCard({ answer, onCite }: { answer: Answer | null; onCite: (docId: string, page: number) => void }) {
  const [thinking, setThinking] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setThinking(false), 700);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <section className="card isearch-answer" aria-label="Svar" aria-busy={thinking}>
      <div className="spread">
        <span className="row" style={{ ["--gap" as string]: "8px" }}>
          <span className="isearch-answer-icon" aria-hidden="true">✦</span>
          <strong>Svar</strong>
          <span className="pill amber">Simuleret</span>
        </span>
        {answer && !thinking && <span className="tiny muted">{answer.sources.length} kilde{answer.sources.length === 1 ? "" : "r"}</span>}
      </div>
      {thinking ? (
        <div className="stack" style={{ ["--gap" as string]: "8px" }} aria-label="Finder svar …">
          <span className="isearch-skeleton" style={{ width: "92%" }} />
          <span className="isearch-skeleton" style={{ width: "78%" }} />
          <span className="isearch-skeleton" style={{ width: "60%" }} />
        </div>
      ) : !answer || answer.parts.length === 0 ? (
        <p className="small" style={{ margin: 0 }}>Det kan jeg ikke finde i integrationsdokumenterne. Prøv andre ord, eller spørg en kollega, der kender integrationen.</p>
      ) : (
        <>
          {answer.values.length > 0 && (
            <div className="row" style={{ ["--gap" as string]: "6px" }}>
              <span className="tiny muted">Nøgleværdier:</span>
              {answer.values.map((v) => <code key={v} className="isearch-value">{v}</code>)}
            </div>
          )}
          <ul className="isearch-answer-parts">
            {answer.parts.map((part, i) => (
              <li key={i}>
                <Marked segments={part.segments} />{" "}
                <button type="button" className="isearch-cite" onClick={() => onCite(answer.sources[part.cite - 1].docId, answer.sources[part.cite - 1].page)}
                  aria-label={`Kilde ${part.cite}: ${answer.sources[part.cite - 1].title}, side ${answer.sources[part.cite - 1].page}`}>{part.cite}</button>
              </li>
            ))}
          </ul>
          {answer.missing.length > 0 && (
            <p className="tiny muted" style={{ margin: 0 }}>Dokumenterne nævner ikke: {answer.missing.map((m) => `„${m}“`).join(", ")}.</p>
          )}
          <ol className="isearch-sources">
            {answer.sources.map((src, i) => (
              <li key={i}>
                <button type="button" className="isearch-link" onClick={() => onCite(src.docId, src.page)}>{src.title}</button>
                <span className="tiny muted"> · side {src.page} · {src.heading}</span>
              </li>
            ))}
          </ol>
          <p className="tiny muted" style={{ margin: 0 }}>Svaret er sammensat af uddrag fra dokumenterne. Tjek altid kilden, før du handler på det.</p>
        </>
      )}
    </section>
  );
}
