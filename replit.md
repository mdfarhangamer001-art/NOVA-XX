# NOVA-X — Cognitive Desktop AI Assistant

## Project Overview

NOVA-X is a voice-first AI assistant built with Electron + React + Vite + Express. In Replit, it runs as a web app via the Express server (`server.ts`) which serves the React UI through Vite middleware.

**Stack:** TypeScript, React 18, Tailwind CSS v4, Vite 7, Express 5, Google Gemini API (`gemini-2.0-flash`), Groq (optional fallback), Electron (desktop only)

---

## How to Run

```bash
npm run dev
```

Starts the Express + Vite dev server on port 5000. Open the preview to see the app.

**Workflow:** `Start application` → `npm run dev` → port 5000

---

## Architecture

- **`server.ts`** — Express server with Vite middleware. Handles all AI calls (Gemini/Groq), file system, notes, gallery, clipboard, and IPC simulation for web mode.
- **`src/renderer/`** — React frontend (SPA). Main entry: `src/renderer/src/NovaXRoot.tsx`
- **`src/renderer/src/mock-electron.ts`** — Bridges Electron IPC calls to HTTP `/api/ipc` in web mode via SSE + fetch
- **`src/renderer/src/components/UI/RightPanel.tsx`** — Conversation Core: chat, emotional vibes, streaming, intent detection
- **`src/renderer/src/UI/NovaX.tsx`** — Main layout: tabs, header, system icon selector
- **`src/renderer/src/data/agents.ts`** — 80+ agent definitions across Automation, Neural, DevOps, Security, Media, Research
- **`src/main/ai-clients.ts`** — Gemini + Groq client factory, reads from `credentials.json`

---

## AI Model

- **Default:** `gemini-2.0-flash` (Gemini) or `llama-3.3-70b-versatile` (Groq)
- Set your API key in Settings → API Vault inside the app, or via environment variables:
  - `GEMINI_API_KEY` — Google Gemini
  - `GROQ_API_KEY` — Groq (optional fast fallback)

---

## Conversation / Personality System

The AI system prompt is defined in `src/renderer/src/components/UI/RightPanel.tsx` inside `executeCoreCommand()`.

- **Persona:** NOVA-X — warm, caring, Hinglish-friendly AI companion. Always calls user "Boss".
- **Vibes:** TACTICAL 🛡️ / EMPATHETIC 💖 / CALM 🌊 / INTENSE ⚡ — dynamically changes tone + TTS rate/pitch
- **Tones:** Authoritative / Friendly / Minimalist (set in Settings)
- **Streaming:** Real-time via SSE (`/api/ipc-events`) + `gemini-stream-chunk` events
- **Intent detection:** Noise filter removes filler words; local command patterns handled before AI call

---

## Key Files Changed (Latest)

| File | Change |
|------|--------|
| `server.ts` | Fixed model: `gemini-3.5-flash` → `gemini-2.0-flash` |
| `src/renderer/src/components/UI/RightPanel.tsx` | Rewrote system prompt (warm/emotional/Hinglish), improved noise filter, warm vibe messages |
| `vite.config.ts` | Port now uses `process.env.PORT` (defaults 5000) |
| `package.json` | Removed darwin/win32 platform-specific rollup packages |

---

## User Preferences

- Keep Hinglish-friendly (Hindi + English mix) in AI system prompts
- AI must always call user "Boss"
- Streaming responses preferred over batch
