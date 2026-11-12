# Plan: /viden — vidensdatabase for brugere

Brugere kan se og søge i de vidensrum, de har adgang til gennem udgivne agenter, og åbne dokumenterne.
Adgangsreglen er den samme som for agenterne: et vidensrum er synligt, når det indgår i den seneste udgivne
version af en agent, brugeren må bruge.

## Fase 1 — API (`server/app/routes/knowledge.py`)
- [x] `GET /api/knowledge/library` — synlige vidensrum (antal dokumenter, agenter) og agenter
- [x] `GET /api/knowledge/spaces/{id}` — vidensrum med indekserede dokumenter
- [x] `GET /api/knowledge/search?q=&space_id=` — søgning (samme motor som agenterne)
- [x] `GET /api/knowledge/documents/{id}` — udtrukket tekst; `GET …/documents/{id}/link` — originalfil
- [x] Tests i `server/tests/test_knowledge.py` (adgang via agent, members-only, papirkurv)

## Fase 2 — Frontend
- [x] `/viden`, `/viden/:id`, `/viden/dokument/:id` i `routes.json` + `App.tsx` (feature `knowledge`)
- [x] `web/src/knowledge/Library.tsx`: søgning, vidensrum, agenter, dokumentliste, læsevisning
- [x] Menupunkt „Viden“ i `shell.tsx`; `npm run app-map --prefix web`
- [x] `pytest server` og `npm run build --prefix web`
