// Client-side search over the mock PDFs in integrationDocs.ts. Phase 2 moves this to GET /api/knowledge/search;
// the result shape (documents → page hits → highlighted excerpt) is what the page renders either way.

import { DOC_TYPES, INTEGRATIONS, PDF_DOCS, type DocType, type Integration, type PdfDoc, type PdfPage } from "./integrationDocs";

export type Segment = { text: string; hit: boolean };
export type PageHit = { page: PdfPage; score: number; matches: number; excerpt: Segment[] };
export type DocResult = { doc: PdfDoc; score: number; matches: number; pages: PageHit[] };
export type Filters = { integrations: Integration[]; types: DocType[] };
export type SortKey = "relevans" | "nyeste" | "titel";
export type Parsed = { terms: string[]; phrases: string[]; excludes: string[]; integrations: Integration[]; types: DocType[]; question: boolean };
export type AnswerPart = { segments: Segment[]; cite: number };
export type Source = { docId: string; page: number; title: string; heading: string };
export type Answer = { parts: AnswerPart[]; sources: Source[]; values: string[]; missing: string[] };
export type SearchOutcome = {
  parsed: Parsed;
  results: DocResult[];
  totalPages: number;
  facets: { integrations: Record<Integration, number>; types: Record<DocType, number> };
  suggestion: string | null;
  answer: Answer | null;
};

// Question mode: a query that reads like a question drops filler words, needs only one term to match and gets a
// simulated answer stitched together from the best sentences (phase 2: the knowledge agent answers instead).
const QUESTION_START = /^(hvilk\p{L}*|hvad|hvordan|hvorfor|hvornår|hvor|hvem|kan|skal|må|er|findes|what|which|how|why|when|where|can|is|does)(?=\s|$)/iu;
const STOPWORDS = new Set(("hvilken hvilket hvilke hvad hvordan hvorfor hvornår hvor hvem kan skal må er var være bliver blive findes " +
  "i på til af med for fra om ved under over efter før som at og eller men så der den det de en et man jeg vi du " +
  "mig os jer sig sin sit sine hos ind ud op ned når hvis bruges bruger brug gør gøre have har ikke nogen noget " +
  "betyder betyde betydning mener gælder sker handler handterer håndterer håndtere fungerer virker " +
  "what which how why when where who can is are the a an of in on to for does do").split(" "));
const SYNONYMS: Record<string, string[]> = {
  steps: ["trin", "step"], step: ["trin", "steps"], trin: ["step"],
  error: ["fejl"], fejl: ["error"], fejlkode: ["fejl"],
  byte: ["bytes", "byten"], certifikat: ["certificate"], kryptering: ["tls", "krypteres"],
  refund: ["refusion"], settlement: ["afregning", "dagsafslutning"], afregning: ["settlement"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findKey<K extends string>(map: Record<K, string | { label: string }>, value: string): K | null {
  const v = norm(value);
  for (const k of Object.keys(map) as K[]) {
    const entry = map[k];
    const label = typeof entry === "string" ? entry : entry.label;
    if (norm(k) === v || norm(label).startsWith(v)) return k;
  }
  return null;
}

export function parseQuery(q: string): Parsed {
  const question = /\?\s*$/.test(q) || QUESTION_START.test(q.trim());
  const out: Parsed = { terms: [], phrases: [], excludes: [], integrations: [], types: [], question };
  const re = /(-?)"([^"]+)"|(\S+)/g;
  for (const m of q.matchAll(re)) {
    if (m[2] !== undefined) {
      const phrase = norm(m[2].trim());
      if (!phrase) continue;
      if (m[1]) out.excludes.push(phrase);
      else out.phrases.push(phrase);
      continue;
    }
    const tok = m[3];
    const field = /^(integration|i|type|t):(.+)$/i.exec(tok);
    if (field) {
      const isIntegration = field[1].toLowerCase().startsWith("i");
      const key = isIntegration ? findKey(INTEGRATIONS, field[2]) : findKey(DOC_TYPES, field[2]);
      if (key && isIntegration) out.integrations.push(key as Integration);
      else if (key) out.types.push(key as DocType);
      continue;
    }
    const word = norm(tok.replace(/^[^\p{L}\p{N}-]+|[^\p{L}\p{N}]+$/gu, ""));
    if (tok.startsWith("-") && word.length > 1) out.excludes.push(word.replace(/^-+/, ""));
    else if (word && !(question && STOPWORDS.has(word))) out.terms.push(word);
  }
  return out;
}

// A term matches at the start of a word ("dagsafslut" finds "dagsafslutning"); a phrase matches anywhere.
function patterns(p: Parsed): RegExp[] {
  return [
    ...p.phrases.map((ph) => new RegExp(escape(ph).replace(/\s+/g, "\\s+"), "gu")),
    ...p.terms.map((t) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${[t, ...(p.question ? SYNONYMS[t] ?? [] : [])].map(escape).join("|")})`, "gu")),
  ];
}

function countAll(re: RegExp, text: string): number {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text)) n++;
  return n;
}

export function highlight(text: string, regexes: RegExp[]): Segment[] {
  if (regexes.length === 0) return [{ text, hit: false }];
  const lower = norm(text);
  const ranges: [number, number][] = [];
  for (const re of regexes) {
    re.lastIndex = 0;
    for (let m = re.exec(lower); m; m = re.exec(lower)) {
      let end = m.index + m[0].length;
      while (end < lower.length && /[\p{L}\p{N}]/u.test(lower[end])) end++;
      ranges.push([m.index, end]);
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: Segment[] = [];
  let pos = 0;
  for (const [s, e] of ranges) {
    if (e <= pos) continue;
    const start = Math.max(s, pos);
    if (start > pos) out.push({ text: text.slice(pos, start), hit: false });
    out.push({ text: text.slice(start, e), hit: true });
    pos = e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}

function excerpt(text: string, regexes: RegExp[], size = 200): Segment[] {
  const lower = norm(text);
  let first = -1;
  for (const re of regexes) {
    re.lastIndex = 0;
    const m = re.exec(lower);
    if (m && (first < 0 || m.index < first)) first = m.index;
  }
  if (text.length <= size || first < 0) {
    const cut = text.length <= size ? text : text.slice(0, size).replace(/\s+\S*$/, "") + " …";
    return highlight(cut, regexes);
  }
  let start = Math.max(0, first - Math.floor(size / 3));
  if (start > 0) start = text.indexOf(" ", start) + 1 || start;
  let end = Math.min(text.length, start + size);
  if (end < text.length) end = text.lastIndexOf(" ", end) > start ? text.lastIndexOf(" ", end) : end;
  const segs = highlight(text.slice(start, end), regexes);
  if (start > 0) segs.unshift({ text: "… ", hit: false });
  if (end < text.length) segs.push({ text: " …", hit: false });
  return segs;
}

export function queryRegexes(q: string): RegExp[] {
  return patterns(parseQuery(q));
}

function scorePage(doc: PdfDoc, page: PdfPage, p: Parsed, regexes: RegExp[], weights: number[]): PageHit | null {
  const body = norm(`${page.heading}\n${page.text}`);
  if (p.excludes.some((x) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(x)}`, "u").test(body))) return null;
  if (regexes.length === 0) return { page, score: 0, matches: 0, excerpt: excerpt(page.text, []) };
  const heading = norm(page.heading);
  const title = norm(`${doc.title} ${doc.filename}`);
  let score = 0;
  let matches = 0;
  let covered = 0;
  for (const [i, re] of regexes.entries()) {
    const n = countAll(re, body);
    if (n === 0) {
      if (p.question) continue;
      return null;
    }
    covered += weights[i];
    matches += n;
    // Exact words weigh more than prefixes, rare words more than common ones.
    score += 1 + Math.log2(1 + n) + (countAll(re, heading) > 0 ? 2 : 0) + (countAll(re, title) > 0 ? 1.5 : 0);
  }
  if (covered === 0) return null;
  // In question mode a page that covers more (and rarer) words of the question beats one that repeats a common word.
  if (p.question) score += covered * covered;
  score += p.phrases.length * 1.5;
  return { page, score, matches, excerpt: excerpt(page.text, regexes) };
}

const VOCAB = (() => {
  const words = new Set<string>();
  for (const d of PDF_DOCS) for (const pg of d.pages) {
    for (const w of norm(`${pg.heading} ${pg.text} ${d.title}`).split(/[^\p{L}\p{N}.-]+/u)) if (w.length > 3) words.add(w.replace(/[.-]+$/, ""));
  }
  return [...words];
})();

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

function suggest(q: string, p: Parsed): string | null {
  let changed = false;
  let out = q;
  for (const t of p.terms) {
    if (t.length < 4 || VOCAB.some((w) => w.startsWith(t))) continue;
    let best: string | null = null;
    let bestD = Math.max(2, Math.floor(t.length / 4)) + 1;
    for (const w of VOCAB) {
      if (Math.abs(w.length - t.length) > 3) continue;
      const d = distance(t, w);
      if (d < bestD) { best = w; bestD = d; }
    }
    if (best) {
      out = out.replace(new RegExp(escape(t), "i"), best);
      changed = true;
    }
  }
  return changed ? out : null;
}

export function search(q: string, filters: Filters, sort: SortKey): SearchOutcome {
  const parsed = parseQuery(q);
  const regexes = patterns(parsed);
  const integrations = new Set([...filters.integrations, ...parsed.integrations]);
  const types = new Set([...filters.types, ...parsed.types]);

  const allPages = PDF_DOCS.flatMap((d) => d.pages.map((pg) => norm(`${pg.heading}\n${pg.text}`)));
  const weights = regexes.map((re) => 1 + Math.log2(allPages.length / (1 + allPages.filter((t) => countAll(re, t) > 0).length)));

  const matched: DocResult[] = [];
  for (const doc of PDF_DOCS) {
    const pages = doc.pages.map((pg) => scorePage(doc, pg, parsed, regexes, weights)).filter((h): h is PageHit => h !== null);
    if (pages.length === 0) continue;
    pages.sort((a, b) => b.score - a.score || a.page.n - b.page.n);
    const score = pages[0].score + pages.slice(1).reduce((s, h) => s + h.score * 0.3, 0);
    matched.push({ doc, score, matches: pages.reduce((s, h) => s + h.matches, 0), pages: regexes.length ? pages : [] });
  }

  // Each facet counts with every other filter applied, so its numbers show what choosing it would give.
  const facets = {
    integrations: Object.fromEntries(Object.keys(INTEGRATIONS).map((k) => [k, 0])) as Record<Integration, number>,
    types: Object.fromEntries(Object.keys(DOC_TYPES).map((k) => [k, 0])) as Record<DocType, number>,
  };
  for (const r of matched) {
    if (types.size === 0 || types.has(r.doc.type)) facets.integrations[r.doc.integration]++;
    if (integrations.size === 0 || integrations.has(r.doc.integration)) facets.types[r.doc.type]++;
  }

  const results = matched.filter(
    (r) => (integrations.size === 0 || integrations.has(r.doc.integration)) && (types.size === 0 || types.has(r.doc.type)),
  );
  results.sort((a, b) => {
    if (sort === "nyeste") return b.doc.updated.localeCompare(a.doc.updated);
    if (sort === "titel") return a.doc.title.localeCompare(b.doc.title, "da");
    return b.score - a.score || b.doc.updated.localeCompare(a.doc.updated);
  });

  return {
    answer: parsed.question && results.length ? buildAnswer(results, parsed, regexes, weights) : null,
    parsed,
    results,
    totalPages: results.reduce((s, r) => s + r.pages.length, 0),
    facets,
    suggestion: results.length === 0 && regexes.length > 0 ? suggest(q, parsed) : null,
  };
}

const VALUE_RE = /\b0x[0-9a-f]{2,4}\b|\b[TS]-\d{3}\b|\b(?:fejl|result)\s+\d{1,4}\b|\bport\s+\d{2,5}\b|\bTLS\s+\d\.\d\b/gi;

function buildAnswer(results: DocResult[], parsed: Parsed, regexes: RegExp[], weights: number[]): Answer {
  const labels = [...parsed.phrases, ...parsed.terms];
  const corpus = PDF_DOCS.map((d) => norm(`${d.title} ${d.pages.map((p) => `${p.heading} ${p.text}`).join(" ")}`)).join("\n");
  const missing = labels.filter((_, i) => countAll(regexes[i], corpus) === 0);

  type Cand = { text: string; covered: number; score: number; doc: PdfDoc; page: PdfPage };
  const cands: Cand[] = [];
  for (const r of results.slice(0, 4)) {
    for (const h of r.pages.slice(0, 2)) {
      for (const sentence of h.page.text.split(/(?<=[.!?])\s+(?=[A-ZÆØÅ0-9])/u)) {
        const low = norm(sentence);
        const covered = regexes.reduce((sum, re, i) => sum + (countAll(re, low) > 0 ? weights[i] : 0), 0);
        if (covered) cands.push({ text: sentence, covered, score: covered * 10 + h.score - sentence.length / 80, doc: r.doc, page: h.page });
      }
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const best = cands[0]?.covered ?? 0;
  const top = cands.filter((c) => c.covered >= best * 0.6).slice(0, 3);
  const values = [...new Set(top.flatMap((c) => [...c.text.matchAll(VALUE_RE)].map((m) => m[0])))].slice(0, 6);
  // Best page first, but sentences from the same page in document order, so steps read in sequence.
  const picked = top.flatMap((c, i) => (top.findIndex((o) => o.page === c.page) === i
    ? top.filter((o) => o.page === c.page).sort((a, b) => c.page.text.indexOf(a.text) - c.page.text.indexOf(b.text))
    : []));

  const sources: Source[] = [];
  const parts = picked.map((c) => {
    let cite = sources.findIndex((s) => s.docId === c.doc.id && s.page === c.page.n);
    if (cite < 0) cite = sources.push({ docId: c.doc.id, page: c.page.n, title: c.doc.title, heading: c.page.heading }) - 1;
    return { segments: highlight(c.text, regexes), cite: cite + 1 };
  });
  return { parts, sources, values, missing };
}
