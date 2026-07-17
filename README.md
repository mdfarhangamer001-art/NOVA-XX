<div align="center">

![NOVA-X Neural OS Documentation Banner](./Build/logo.png)

### Voice-First Desktop AI Assistant

**Build Faster. Automate Workflows. Control your Desktop with Voice Commands.**

---

<div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">

</div>

**Speak your command. NOVA-X executes it.**

A voice-first neural execution system powered by **Gemini 3.1 Live API** with real-time WebRTC audio, biometric security, and autonomous system control.

---

</div>

# 📑 Table of Contents

- [⚡ Overview](#-overview)
- [🎯 What is Voice-First?](#-what-is-voice-first)
- [✨ Core Features](#-core-features)
- [🔐 Code Protection & Security](#-code-protection--security)
- [💰 Sponsorship Tiers](#-sponsorship-tiers)
- [🏗️ Architecture](#️-architecture)
- [💻 Tech Stack](#-tech-stack)
- [🚀 Installation & Setup](#-installation--setup)
- [📁 Project Structure](#-project-structure)
- [🧠 Development Philosophy](#-development-philosophy)
- [🤝 Contributing](#-contributing)
- [🧩 Extending NOVA-X](#-extending-novax)
- [🧠 Roadmap](#-roadmap)
- [⚠️ Disclaimer](#️-disclaimer)
- [👨‍💻 Architect](#-architect)
- [📜 License](#-license)

---

# ⚡ Overview

NOVA-X is not a chatbot.

It is a **Voice-First Desktop AI Assistant** that executes real-world actions across your system, applications, and devices—powered by **Gemini 3.1 Live API** with real-time bidirectional audio processing.

> **Speak naturally. NOVA-X understands intent. Real actions execute instantly.**

## What Makes NOVA-X Different?

✅ **Voice-First Design** – Optimized for natural speech input with real-time WebRTC audio streaming  
✅ **Proprietary Agent Logic** – Heavily protected, production-grade agentic orchestration  
✅ **Production-Ready Security** – V8 bytecode + ASAR integrity validation + window isolation  
✅ **No Code Exposure** – Core agent and tools are completely hidden from public source  
✅ **Autonomous Execution** – LangGraph-powered state machine with dynamic tool orchestration

---

# ✨ What's New In v1.6.0

- Added Wakeup word functionality for seamless hands-free activation
- Introduced Chat/Voice toggle — use voice or text to interact with NOVA-X
- Advanced Mobile Camera Control: Full control over front/back camera with customized video recording settings
- More precise authentication including IP and Location verification
- NOVA-X now divided into Free and PRO tiers with distinct badges
- Introduced Custom Protocols to build and execute multi-step automated workflows
- Introduced AI Wallpaper Engine to dynamically change PC wallpaper with natural language
- New quick-access overlay available via Ctrl + Shift + I
- Complete UI Upgrade: Simple, premium, and fully animated interface
- Updated Settings panel with a new proper build structure
- Quick Build integration resulting in significantly faster app load times
- Various underlying bug fixes and system stability improvements

---

# 🪡 Open Core Model

### NOVA-X follows an Open Core development model.

**The public repository includes**:

- Desktop application framework
- User interface
- Core infrastructure
- Selected integrations
- Community-facing examples

The following production components are private:

- Core voice orchestration engine
- Advanced tool execution logic
- Internal automation systems
- Production-grade implementations
- Certain premium modules

GitHub Sponsors receive access to additional documentation, implementation examples, architecture breakdowns, and development resources depending on tier.

**Sponsorship does not include access to the complete private source code.**

---

# 🎯 What is Voice-First?

Traditional AI assistants are **text-first**: you type → they respond → you read.

NOVA-X is **voice-first**: you speak → they listen & execute → actions happen in real-time.

### Real-Time Audio Processing

```
Your Voice
    ↓ (WebRTC Stream)
Gemini 3.1 Live API (Real-time)
    ↓ (Intent Recognition)
LangGraph Agent Orchestration
    ↓ (Tool Selection)
Protected Tool Execution
    ↓ (System Actions)
Results Streamed Back to You
```

- **Latency:** < 500ms end-to-end (including network)
- **Quality:** Full duplex (talk while agent responds)
- **Models:** Gemini 3.1 Live API (primary) + Groq (Fast Responses) + Hugging Face (Open-Sourced + Local Models)
- **Search:** Tavily for real-time web data

No local-only limitations. NOVA-X connects to **cloud AI, search engines, and APIs** for maximum intelligence.

---

# ✨ Core Features & System Capabilities

### ✨ Special Features

Autonomous voice activation hooks, advanced screen character peeling, and phantom inline input overlays.

- **Wake Up Word Activation:** NOVA-X is configured for hands-free local startup. Speaking the wake word automatically opens the assistant window, performs local telemetry diagnostics, and checks real-time atmospheric updates.
  - _Commands:_ "Hey, NOVA-X", "NOVA-X", "Wake up, NOVA-X"
- **Phantom Control (Ghost Keyboard):** Inline typing injection overlay. Activating the shortcut creates a phantom input hook to inject typed keystrokes anywhere on the OS, integrating cleanly with VS Code.
  - _Commands:_ "Press Ctrl + Alt + Space", "Activate Phantom Typer", "Start Ghost Typer"
- **ScreenPeeler (Multimodal AI OCR):** Intelligent rectangular region screen selection. Takes a high-resolution snapshot of any screen coordinate area, runs local/cloud multimodal extraction, and populates extracted text to your clipboard.
  - _Commands:_ "Press Ctrl + Alt + X", "Extract text from active workspace", "Scan system screen portion"
- **Small Ghost Overlay (Ctrl + Shift + I):** [PRO Exclusive] Launches a sleek, floating quick-access mini overlay at your cursor for immediate keyboard/voice commands without opening the main OS dashboard.
  - _Commands:_ "Press Ctrl + Shift + I", "Open quick overlay", "Toggle ghost mini panel"

### 📂 System & File Management

Complete native file system and directory access with app process lifecycle controls.

- **Open App:** Native application lifecycle initialization.
  - _Commands:_ "Open Spotify", "Launch VS Code", "Start Google Chrome"
- **Close App:** Instant process termination hook.
  - _Commands:_ "Close Photoshop", "Kill the Chrome process", "Stop Node"
- **Create Folder:** Directory structure generator.
  - _Commands:_ "Create a folder named assets in my current directory", "Make folder UI under components"
- **Read & Write Files:** Disk file writing and code extraction.
  - _Commands:_ "Read the index.js file inside the root", "Write a server.js file with simple express setup"
- **Smart Drop Zones:** Autonomous sorting algorithms for system files.
  - _Commands:_ "Sort my downloads folder", "Organize my chaotic project directories"

### 🧠 Vector Search & Local Knowledge

Semantic ingestion using local Vector databases and direct multimodal vision APIs.

- **Index Folder:** Index folder contents into a local semantic database.
  - _Commands:_ "Index my src folder", "Embed my docs folder for search"
- **Smart File Search:** Vector-based local file retrieval.
  - _Commands:_ "Find files related to user authentication", "Search for codebase configuration hooks"
- **Analyze Photo & Gallery:** OCR and direct multimodal layout processing.
  - _Commands:_ "Scan my screenshot folder", "Analyze this error screenshot and find a solution"

### 💻 Developer & Terminal Tools

Globally accessible NPM package with tunneling and secure CLI execution.

- **Run Terminal:** Native shell script/CLI executor.
  - _Commands:_ "Run npm run build", "Execute git status", "Run typescript checker"
- **Deploy Wormhole:** Localhost tunnels exposing local servers to the public internet.
  - _Commands:_ "Expose port 3000 to the public internet", "Open local server to external connection"
- **Execute Sequence / Macro:** JSON-based workflow sequence triggering.
  - _Commands:_ "Run the development startup sequence", "Execute my custom deploy macro"
- **Manage PC Settings:** Control OS-level settings like Wi-Fi, Bluetooth, Audio, and Display.
  - _Commands:_ "Turn off Wi-Fi on my PC", "Open the sound settings"

### 🎯 Desktop UI & Automation

AI-driven coordinate cursor control, scroll tracking, and screen peeler OCR.

- **Teleport Windows:** Desktop window movement, resizing, and alignment.
  - _Commands:_ "Move this active window to the left side", "Minimize active window", "Maximize terminal"
- **Click & Scroll on Screen:** Cursor control with AI coordinate calculation.
  - _Commands:_ "Click the login button", "Scroll down fifty percent", "Click at coordinates 800 by 600"
- **Screen Peeler & Phantom Typer:** Instant OCR extraction to code editor.
  - _Commands:_ "Extract code from active window", "Type my secure email address in the active input box"
- **Custom Protocols:** Build and execute multi-step automated workflows natively in the OS.
  - _Commands:_ "Activate Coding Mode", "Start Hardcore Gaming Protocol"
- **AI Wallpaper Engine:** Dynamically change PC wallpaper with natural language queries.
  - _Commands:_ "Change my wallpaper to a cyberpunk city", "Set background to a mountain sunset"

### 💾 Memory & Information

Persistent identity tracking, note management, and remote inbox integrations.

- **Core Memory Ingestion:** Saves details into permanent memory database.
  - _Commands:_ "Remember that my API host is port 5000", "Forget my old server address"
- **Retrieve Memory:** Retrieves context parameters from past workflows.
  - _Commands:_ "What is my current project setup?", "What wake word configs did I set earlier?"
- **System Notes:** Save ideas, plans, and code snippets into memory notes.
  - _Commands:_ "Create a note for my next project", "What was the plan from my notes?"
- **Read Emails:** Gmail inbox scanning and key data extraction.
  - _Commands:_ "Read my latest unread emails", "Summarize my last developer newsletters"

### 🌐 Web, Media & Financials

Real-time web browsing, music control, market analytics, and image generators.

- **Advanced Web Agent:** Browses the web, performs deep Playwright-based scraping, fills forms, and searches for reference information.
  - _Commands:_ "Search for the latest NextJS 16 features", "Scrape the content from this URL"
- **Spotify & Media Controls:** Instant audio playback control.
  - _Commands:_ "Play synthwave music on Spotify", "Pause playback", "Skip to next track"
- **Market Analytics:** Ticker checks and dual stock comparison.
  - _Commands:_ "Get current stock price of Apple", "Compare NVIDIA and AMD performance charts"
- **Generate Image & Live Website:** Image rendering and dynamic CSS/DOM injections.
  - _Commands:_ "Generate an image of a neon forest", "Inject a cyber-green background to the current site"

### 💬 Communications

WhatsApp scheduling, contact message queues, and mail composing.

- **WhatsApp Integration:** Automate messaging and files sending.
  - _Commands:_ "Send WhatsApp message to Harsh saying: Build is online!", "Schedule a WhatsApp message for tomorrow morning"
- **Mail Drafting & Direct Send:** Email composition and delivery dispatch.
  - _Commands:_ "Draft an email to client about project submission", "Send email containing build report"

### 📱 Mobile Telekinesis

ADB remote control, coordinate touch, notifications reading, and toggle hardware.

- **Remote Android Control:** Open applications and read hardware status remotely.
  - _Commands:_ "Open Slack on my Android device", "Get my phone's battery level", "Toggle phone flashlight"
- **Remote Action Touch & Swipe:** Interactive Android touch executions.
  - _Commands:_ "Swipe down on my phone screen", "Remote click coordinate 400 and 800"
- **Push & Pull Files:** Transfers data seamlessly between phone and workstation.
  - _Commands:_ "Push my screenshot to my Android phone", "Pull documents from mobile directory"
- **Advanced Hardware & Camera Control:** Toggle hardware (Wi-Fi, Bluetooth) and hijack lenses to capture photos/videos remotely.
  - _Commands:_ "Take a picture with my front camera", "Turn off phone bluetooth"
- **Clipboard & APK Deployment:** Inject text directly to mobile inputs or push/install APKs seamlessly.
  - _Commands:_ "Paste this API key to my phone", "Deploy my build to my phone"

### 🕵️ Deep RAG & Autonomous Research

Autonomous Llama 3 agents crawling databases and codebase oracle RAG.

- **Deep Research:** Multimodal agentic crawlers executing deep research cycles.
  - _Commands:_ "Research current breakthroughs in quantum computing and sync it to Notion"
- **Codebase Oracle & RAG:** Ingests entire repositories for semantic queries.
  - _Commands:_ "Ingest my codebase into database", "Ask Oracle: how does the routing layout hook together?"

### 📄 Document & Presentation Generation

Autonomous generation of professional documents, spreadsheets, and presentations.

- **Generate PowerPoint (PPT):** Autonomously generate complete PowerPoint presentations from structured data and open them instantly.
  - _Commands:_ "Generate a PPT about artificial intelligence", "Create a 5-slide presentation on Q3 sales"
- **Generate Excel Spreadsheets:** Create structured Excel sheets from JSON data and launch them.
  - _Commands:_ "Create an Excel sheet with our user data", "Generate a spreadsheet for monthly expenses"
- **Generate Beautiful PDFs:** Generate highly aesthetic PDFs using raw text or Tailwind CSS injected HTML.
  - _Commands:_ "Export this report to PDF", "Generate a beautiful PDF invoice"

### 🛠️ Interactive UI Generation & Live Coding

Spawns live widgets, mutates reality, and writes physical code.

- **Widget Forge:** Spawn live, floating desktop widgets like timers, clocks, or stock tickers.
  - _Commands:_ "Create a floating timer widget", "Spawn a desktop calculator"
- **Design to Widget (Visual UI Extraction):** Visually scans your screen, extracts a UI component, and instantly spawns a live widget.
  - _Commands:_ "Forge a widget out of this table", "Clone that button into a widget"
- **Live Code Forging:** Write, stream, and save raw code into a physical file via an interactive UI.
  - _Commands:_ "Write a Python script for data scraping", "Stream a React component to Button.tsx"
- **Reality Hacker:** Visually mutate and inject custom CSS/JS into live internet websites.
  - _Commands:_ "Make Wikipedia look like a terminal", "Inject the neon green UI into this site"

### 🗺️ Global Maps & Live Location

Interactive real-time map controls and telemetry.

- **Live Location Telemetry:** Fetch your current real-time physical coordinates, city, and timezone.
  - _Commands:_ "Where am I currently?", "What is my live location?"
- **Interactive Dark-Mode Maps:** Open real, interactive maps tailored to the OS aesthetics.
  - _Commands:_ "Show me a map of Tokyo", "Open the map for New York"
- **Route Navigation:** Calculate and display driving directions between cities.
  - _Commands:_ "Get directions from Delhi to Mumbai", "Show the route to San Francisco"
- **Weather Insights:** Fetch real-time weather conditions for any city.
  - _Commands:_ "What's the weather like in London?", "Is it raining in Seattle?"

### 🔐 Security & OS Vault

OS-level biometric encryption and multi-face recognition locks.

- **Vault Lockdown:** PIN validation system lock.
  - _Commands:_ "Lock the system vault", "Activate biometric lockdown mode"

---

# 🔐 Code Protection & Security

## ⚠️ Important: Core Code is Protected

NOVA-X uses **enterprise-grade code protection** to secure proprietary agent logic and tool implementations:

### What is Protected?

✅ **Agent Core** (`novax-ai.ts`)  
✅ **Tool Implementations** (`tools.ts`)  
✅ **IPC Handlers** (`handlers.ts`)  
✅ **System Utilities** (All Main Process code)

### How It's Protected?

1. **V8 Bytecode Compilation**
   - TypeScript → JavaScript → Binary V8 bytecode
   - Result: `.jsc` files (unreadable, machine-specific)
   - Reverse engineering: 100+ hours of effort

2. **Protected Strings Obfuscation**
   - Sensitive strings transformed to obfuscated functions
   - Example: System prompts, tool definitions, API patterns
   - Grep/string search returns nothing useful

3. **ASAR Integrity Validation**
   - SHA256 hashing at build time
   - Runtime validation at app startup
   - Tampering detection: **App crashes immediately**

4. **Window Isolation**
   - Renderer windows cannot directly access each other
   - All inter-process communication via secure IPC bridge
   - No Node.js in renderer process

### Security Guarantees

- **100% BYOK** (Bring Your Own Key) – Your API keys, your control
- **Local Encryption** – Keys stored in OS keychain, never transmitted
- **Zero-Trust Architecture** – All inputs validated, outputs sanitized
- **No External Validation** – Core logic never phones home

---

# ⚡ Why Upgrade to NOVA-X Pro?

NOVA-X is built on an **Open Core model**. While the Free Tier (Public Repository) gives you access to the community UI and basic templates, the **core voice engine, agent loops, and advanced execution tools** are protected within the NOVA-X Pro ecosystem.

Upgrading to **NOVA-X Pro (₹499 base license + platform processing fee (Final Checkout: ₹513))** unlocks the complete autonomous OS controller experience.

## 🎁 Free Tier (Base Engine)

**Cost:** Free

- Access to the public frontend shell (React + Tailwind)
- Community Layout Config & Themes
- Standard PIN-only OS Vault lockdown
- Basic UI Widgets & Desktop Shell structure
- **Core File & Desktop Management:** Read/Write files, search system, open apps, move windows.
- **Basic Automations:** Ghost typing, scroll, macro sequences, shortcuts.
- **Maps & Weather:** Live location, navigation, and weather insights.
- **Docs & Email:** PDF Generation and background Email Drafting.

## 🚀 NOVA-X Paid Pro

**Cost:** ₹499 base license + platform processing fee (Final Checkout: ₹513)

- **Instant License Activation:** Pay once, keep it forever. No subscriptions.
- **Hands-Free Wake Up Word:** Passive offline activation ("Hey, NOVA-X").
- **ScreenPeeler Multimodal AI OCR:** Instantly scan and extract text/code from your screen (Ctrl+Alt+X).
- **Phantom Ghost Keyboard:** Global inline injection (Ctrl+Alt+Space).
- **Small Ghost Overlay:** Instantly summon a fast-access floating command overlay via `Ctrl + Shift + I`.
- **Mobile Telekinesis (Android):** Full ADB remote actions, telemetry, camera hijacking, file pushing, and APK deployment.
- **Deep Research & Code Oracle:** Multi-step autonomous web crawling, RAG codebase indexing, and vector memory.
- **Wormhole Networking:** Instantly expose local localhost ports to the public internet.
- **Generative Power:** PPT/Excel Generation, Aesthetic Image generation.
- **Live UI Forging:** Build entire animated websites (GSAP + Tailwind) and Forge Screen UI into live Widgets.
- **Direct Communications:** Dispatch WhatsApp messages automatically and directly send emails.
- **Deep Work Protocol:** Instantly mute distractions, kill specific apps, and optimize environment focus.
- **Direct Pro Access:** Fully functional local execution engine.

### How to Upgrade?

1. **Authenticate with Google** to create your secure identity.
2. **Purchase a License** via our Secure Checkout (Razorpay).
3. **Unlock the NOVA-X PRO** instantly.

**Check Out The Full Free vs PRO Tool Comparison** (add a `Comparison.md` file at the repo root and link it here)

---

---

# 🏗️ Architecture

### Frontend (React)

- UI, widgets, visualizations
- Voice input/output handling
- Real-time metrics display

### Backend (Electron Main Process) - **PROTECTED**

- LangGraph agent orchestration
- Tool execution engine
- Protected by V8 bytecode + ASAR

### IPC Bridge (Secure)

```typescript
// Frontend
window.electron.ipcRenderer.invoke('tool-name', payload)

// Backend (Protected)
ipcMain.handle('tool-name', async (event, payload) => {
  // Secure tool execution
})
```

### AI Integration

- **Gemini 3.1 Live API** – Real-time voice processing
- **Groq API** – Ultra-fast infe
