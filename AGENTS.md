# HER2: instructions for Claude and Codex

Pathology decision-support tool, published on GitHub Pages. Vite/TypeScript app (source in `src/`, build with `npm run build`). Tests: `npm test`.

## Rules
- Diagnostic content (entities, criteria, cutoffs, scoring, report wording) is curated by Filippo. Change it only on his instruction or from a cited source, never from memory. If code and source disagree, report it; do not choose.
- Before changing anything that can alter an output: plan first, state which outputs change, add or update tests (or, where none exist, say how you verified it) with at least one input per affected class, and run the tests before closing.
- After such a change, get an independent review against the agreed spec: `/verify-agent` in Claude Code, or a separate review pass against the cited source.
- Keep logic separate from the UI where the code allows it. No fake precision: show uncertainty and equivocal results.
- Secrets stay out of the repo: use `.env` (ignored) and keep `.env.example` current.
- No patient data in code, tests, fixtures, docs or commit messages.
- `AGENTS.md` is a copy of this file for Codex: keep the two aligned when you edit either.

## Note for Codex
- `/verify-agent` exists only in Claude Code. For the independent review, do a separate review pass against the cited source and report the result and any open items.
