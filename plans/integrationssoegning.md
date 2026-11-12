# Plan: /viden/integrationer — søg i PDF'er med Terminal-, Baxi- og Sofie-integrationsdata

En søgeside til integrationsdokumentation (PDF). Fase 1 kører på mock-data i browseren, så brugergrænsefladen kan
afprøves, før dokumenterne ligger i et vidensrum.

## Fase 1 — Brugergrænseflade på mock-data (start her)
- [x] Mock-PDF'er i `web/src/knowledge/integrationDocs.ts` (Terminal, Baxi, Sofie; flere sider pr. dokument)
- [x] Søgemotor i `web/src/knowledge/integrationSearch.ts`: ord, præfiks, "sætninger", `-udelad`, `integration:`/`type:`/`fejlkode:`, rangering og uddrag med fremhævning
- [x] Side `web/src/knowledge/IntegrationSearch.tsx`: facetter med antal, sortering, træf pr. side, PDF-forhåndsvisning med hop mellem træf, delbar URL, seneste søgninger, tastaturgenveje (`/`, `j`/`k`, `Esc`)
- [x] Route `/viden/integrationer` i `routes.json` + `App.tsx`, link fra `/viden`; `npm run app-map --prefix web`
- [x] Spørgsmål i søgefeltet (fx „Hvilken byte er TLS i steps?“): fyldord fjernes, synonymer (steps → trin), sjældne ord vægtes højest, og et simuleret svar med nøgleværdier og kildehenvisninger vises over resultaterne
- [x] `npm run build --prefix web`

## Fase 2 — Rigtige data
- [ ] Læg PDF'erne i et vidensrum „Integrationer“ og tag dokumenterne med integration og type (`/api/meta`)
- [ ] Udvid `GET /api/knowledge/search` med facetter (integration, type, version) og side-uddrag med fremhævning
- [ ] Skift mock-kilden ud med API-kaldet; „Åbn original“ via `/api/knowledge/documents/{id}/link#page=N`
- [ ] Skift det simulerede svar ud med vidensagenten (samme kort: svar, nøgleværdier, kilder)

## Fase 3 — Finpudsning
- [ ] Gemte søgninger pr. bruger, eksport af træf, tests
