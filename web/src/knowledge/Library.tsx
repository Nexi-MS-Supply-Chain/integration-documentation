// /viden, /viden/:id and /viden/dokument/:id — the Viden library (specs/knowledge): search the knowledge spaces behind
// the agents the user may use, browse a space's documents, read the indexed text and open the original. The server
// decides what is visible (routes/knowledge.py); this page only shows it.

import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, errorText } from "../api";
import { Alert, fmtBytes, fmtDate, Loading, PageHeader, useLoad } from "../ui";

type AgentRef = { slug: string; name: string };
type Space = { id: number; name: string; description: string; updated_at: string; documents: number; agents: AgentRef[] };
type Agent = { slug: string; name: string; description: string };
type Library = { spaces: Space[]; agents: Agent[] };
type Doc = { id: number; filename: string; path: string; content_type: string; size_bytes: number; page_count: number; indexed_at: string | null };
type SpaceDetail = { id: number; name: string; description: string; documents: Doc[] };
type Hit = { document_id: number; filename: string; space_id: number; space_name: string; section: string | null; page: number | null; excerpt: string };
type DocDetail = Doc & { space_id: number; space_name: string; markdown: string };

async function openOriginal(id: number, setError: (e: string) => void) {
  try {
    const r = await api.get<{ url: string }>(`/api/knowledge/documents/${id}/link`);
    window.open(r.url, "_blank", "noopener");
  } catch (e) {
    setError(errorText(e));
  }
}

function SearchBox({ spaceId }: { spaceId?: number }) {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    setParams(q ? { q } : {});
  };
  return (
    <form onSubmit={submit} className="row" role="search">
      <label className="field" style={{ flex: "1 1 320px" }}>
        <input type="search" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} aria-label="Søg"
          placeholder={spaceId ? "Søg i dette vidensrum …" : "Søg i al viden …"} />
      </label>
      <button className="btn btn-primary" disabled={!text.trim()}>Søg</button>
    </form>
  );
}

function SearchResults({ q, spaceId }: { q: string; spaceId?: number }) {
  const [linkError, setLinkError] = useState("");
  const { data, error, loading } = useLoad(() => {
    const p = new URLSearchParams({ q });
    if (spaceId) p.set("space_id", String(spaceId));
    return api.get<{ method: string; hits: Hit[] }>(`/api/knowledge/search?${p}`);
  }, [q, spaceId]);
  return (
    <section className="stack" aria-label="Søgeresultater">
      <Alert>{error || linkError}</Alert>
      {loading && <Loading />}
      {data && !loading && (
        <p className="small muted">
          {data.hits.length === 0 ? `Ingen træf for „${q}“.` : `${data.hits.length} træf for „${q}“`}
          {data.hits.length > 0 && (data.method === "vector" ? " · semantisk søgning" : " · fritekstsøgning")}
        </p>
      )}
      {data?.hits.map((h, i) => (
        <article key={`${h.document_id}-${i}`} className="card" style={{ gap: 6 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <Link to={`/viden/dokument/${h.document_id}`}><strong>{h.filename}</strong></Link>
            <button className="btn btn-ghost btn-sm" onClick={() => openOriginal(h.document_id, setLinkError)}>Åbn original</button>
          </div>
          <span className="tiny muted">
            {!spaceId && <><Link to={`/viden/${h.space_id}`}>{h.space_name}</Link> · </>}
            {h.section ?? "Uden overskrift"}{h.page ? ` · side ${h.page}` : ""}
          </span>
          <p className="small" style={{ margin: 0 }}>{h.excerpt}</p>
        </article>
      ))}
    </section>
  );
}

export function LibraryHome() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const { data, error, loading } = useLoad(() => api.get<Library>("/api/knowledge/library"), []);
  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <PageHeader eyebrow="Viden" title="Vidensdatabase">
        Søg og læs i de vidensrum, du har adgang til gennem dine agenter. Vil du hellere spørge, så åbn en agent.
      </PageHeader>
      <SearchBox />
      <Link to="/viden/integrationer" className="card muted-bg" style={{ textDecoration: "none", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <span className="stack" style={{ ["--gap" as string]: "2px" }}>
          <strong>Søg i integrationsdokumenter</strong>
          <span className="small muted">PDF'er om betalingsterminaler, BAXI og Sofie — med filtre og forhåndsvisning af siderne.</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      {q ? <SearchResults q={q} /> : (
        <>
          <Alert>{error}</Alert>
          {loading && !data && <Loading />}
          {data && data.spaces.length === 0 && (
            <p className="muted">Du har ikke adgang til nogen vidensrum endnu. En administrator giver adgang ved at udgive en agent med vidensrummet.</p>
          )}
          {data && data.spaces.length > 0 && (
            <section className="stack">
              <h3>Vidensrum</h3>
              <div className="grid">
                {data.spaces.map((s) => (
                  <Link key={s.id} to={`/viden/${s.id}`} className="card" style={{ textDecoration: "none" }}>
                    <strong>{s.name}</strong>
                    {s.description && <span className="small muted">{s.description}</span>}
                    <span className="tiny muted">{s.documents} dokument{s.documents === 1 ? "" : "er"} · opdateret {fmtDate(s.updated_at)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {data && data.agents.length > 0 && (
            <section className="stack">
              <h3>Spørg en agent</h3>
              <div className="grid">
                {data.agents.map((a) => (
                  <a key={a.slug} href={`/extension/agent/${a.slug}`} className="card" style={{ textDecoration: "none" }}>
                    <strong>{a.name}</strong>
                    {a.description && <span className="small muted">{a.description}</span>}
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function LibrarySpace() {
  const id = Number(useParams().id);
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [linkError, setLinkError] = useState("");
  const { data, error, loading } = useLoad(() => api.get<SpaceDetail>(`/api/knowledge/spaces/${id}`), [id]);
  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <Link to="/viden" className="small">← Viden</Link>
      <Alert>{error || linkError}</Alert>
      {loading && !data && <Loading />}
      {data && (
        <>
          <PageHeader eyebrow="Vidensrum" title={data.name}>{data.description || undefined}</PageHeader>
          <SearchBox spaceId={id} />
          {q ? <SearchResults q={q} spaceId={id} /> : data.documents.length === 0 ? (
            <p className="muted">Der er ingen indekserede dokumenter i vidensrummet endnu.</p>
          ) : (
            <ul className="card" style={{ listStyle: "none", margin: 0, padding: 0, gap: 0 }}>
              {data.documents.map((d, i) => (
                <li key={d.id} className="row" style={{ borderTop: i ? "1px solid var(--hm-border)" : 0, padding: "12px 18px", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <Link to={`/viden/dokument/${d.id}`}><strong>{d.filename}</strong></Link>
                    <span className="tiny muted">
                      {d.path !== d.filename && `${d.path} · `}{fmtBytes(d.size_bytes)}{d.page_count ? ` · ${d.page_count} sider` : ""}
                    </span>
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => openOriginal(d.id, setLinkError)}>Åbn original</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** The extracted Markdown as plain blocks: headings, page markers and paragraphs. Never rendered as HTML. */
function MarkdownText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="stack" style={{ ["--gap" as string]: "10px" }}>
      {blocks.map((b, i) => {
        const page = b.match(/^<!--\s*page\s+(\d+)\s*-->$/);
        if (page) return <div key={i} className="tiny muted" style={{ borderTop: "1px dashed var(--hm-border)", paddingTop: 6 }}>Side {page[1]}</div>;
        const h = b.match(/^(#{1,6})\s+(.*)$/s);
        if (h) return h[1].length <= 2 ? <h3 key={i} style={{ margin: "8px 0 0" }}>{h[2]}</h3> : <h4 key={i} style={{ margin: "6px 0 0" }}>{h[2]}</h4>;
        return <p key={i} style={{ margin: 0, whiteSpace: "pre-wrap" }}>{b}</p>;
      })}
    </div>
  );
}

export function LibraryDocument() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [linkError, setLinkError] = useState("");
  const { data, error, loading } = useLoad(() => api.get<DocDetail>(`/api/knowledge/documents/${id}`), [id]);
  return (
    <div className="stack" style={{ ["--gap" as string]: "20px" }}>
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => navigate(-1)}>← Tilbage</button>
      <Alert>{error || linkError}</Alert>
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <PageHeader eyebrow={data.space_name} title={data.filename} />
            <button className="btn btn-outline" onClick={() => openOriginal(data.id, setLinkError)}>Åbn original</button>
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>
            <Link to={`/viden/${data.space_id}`}>{data.space_name}</Link> · {fmtBytes(data.size_bytes)}
            {data.page_count ? ` · ${data.page_count} sider` : ""}{data.indexed_at ? ` · indekseret ${fmtDate(data.indexed_at)}` : ""}
          </p>
          <article className="card">
            {data.markdown ? <MarkdownText text={data.markdown} /> : <p className="muted">Der blev ikke udtrukket tekst fra dokumentet.</p>}
          </article>
        </>
      )}
    </div>
  );
}
