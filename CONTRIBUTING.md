# Contributing to IRIS

Welcome to the IRIS development workspace. 👁️⚡

IRIS is an advanced, voice-first desktop assistant designed to streamline human-computer interaction through automated desktop actions. This is an open-source, community-driven project led by Tehzeeb, which means your contributions are incredibly valuable.

**🤝 Open Collaboration Notice**

We welcome all public contributions! Developers can fork the repo, refine the React components, build custom front-end layouts, extend backend tools, and submit Pull Requests under the MIT License. There are no paywalls, private license fees, or sponsorship restrictions on core features. Everything is open and free to explore!

Please read this guide to ensure your Pull Requests (PRs) merge smoothly and keep the codebase pristine.

## 🔗 Quick Links

- **GitHub:** [IRIS-AI Public Repo](https://github.com/mdfarhangamer001-art/IRIS-AI)
- **Instagram:** [@xtehzeeb.x](https://www.instagram.com/xtehzeeb.x/)
- **Email:** [cutegirla6777@gmail.com](mailto:cutegirla6777@gmail.com)

## 👑 Maintainers

- **Tehzeeb** - Creator & Lead Architect
  - GitHub: [mdfarhangamer001-art](https://github.com/mdfarhangamer001-art)
  - Instagram: [@xtehzeeb.x](https://www.instagram.com/xtehzeeb.x/)

---

## 🛠 How to Contribute

1. **Explore the Workspace** → Jump in, build features, modify layout aesthetics, and run tests.
2. **Bugs & small fixes** → Open a PR directly in the main repository!
3. **New features / architecture** → Start a GitHub Discussion or open an Issue first. Please don't spend 20 hours building a massive feature without checking if it aligns with the project roadmap.
4. **Refactor-only PRs** → Cosmetic refactors (e.g., changing linting rules, reorganizing folders) are welcome if they improve build compilation speeds.
5. **Questions** → Open a Discussion on GitHub or reach out via Instagram.

## 🛑 Before You PR

- Test locally with your own API keys in the vault.
- Ensure both the **Main Process (Node.js)** and **Renderer Process (React)** compile without errors:
  - `npm run build`
- **Mind the Bridge:** IRIS operates on a strict split-architecture. Frontend React code cannot use Node.js modules (like `fs` or `child_process`). All system-level execution MUST be handled in the protected backend and triggered via the `window.electron.ipcRenderer.invoke` bridge.
- Keep PRs focused. One feature/fix per PR. Do not mix unrelated concerns.
- **Include screenshots/videos:** If you change the UI (Tailwind/GSAP/Framer Motion), you _must_ include a before/after screenshot or a screen recording of the animation in your PR description.
- **Strict Commit Formatting:** Keep your commit messages clean, descriptive, and easy to understand. Clearly state what the commit accomplishes and always include the relevant Issue ID so we can track the changes.

✅ `git commit -m "feat: integrated new desktop widget (#45)"`  
✅ `git commit -m "fix: resolved IPC memory leak in Oracle module (#12)"`  
❌ `git commit -m "Integrated desktop widget"`  
❌ `git commit -m "resolved IPC memory leak in Oracle module"`

---

## 🤖 AI-Assisted PRs Welcome!

Built this with Gemini, Claude, or Cursor? **Awesome—just mark it!**

Since IRIS is an AI-first desktop assistant, AI-assisted code is treated as a first-class citizen. Transparency is required so the implementation can be reviewed accurately.

Please include in your PR description:

- [ ] Mark as AI-assisted in the PR title or description.
- [ ] Note the degree of testing (untested / lightly tested / fully tested locally).
- [ ] Confirm you actually understand what the generated code does (especially regarding Electron IPC and memory management).
- [ ] Resolve any automated review bot comments before asking for a human review.

## 🧭 Current Focus & Roadmap

We are currently prioritizing:

- **Engine Stability:** Hardening the `BidiGenerateContent` WebSocket connection for the multimodal live assistant layer.
- **BYOK Security:** Ensuring no edge cases leak keys from the local secure vault.
- **Agentic Tools:** Expanding the RAG Oracle and Mobile Automation (ADB) toolsets.
- **Cross-Platform:** Preparing the build pipeline for macOS and Linux desktop deployment.

Check the GitHub Issues for labels like `good first issue` or `help wanted`.

## 🤝 Becoming a Core Contributor

IRIS is growing, and we are selectively looking to expand the maintainer team. If you are an elite developer who understands Electron, React, or local LLM execution, we'd love to have you on board.

Being a maintainer is about consistent involvement—triaging issues, reviewing PRs, and driving the architecture forward.

If you've successfully merged a few PRs and want to step up, reach out via Instagram DM or open an issue titled `[Maintainer Application]`. We are looking for people skilled in:

- Electron Security & IPC
- Native Desktop Integration (Windows/macOS/Linux desktop APIs)
- Vector Databases (LanceDB) & RAG pipelines
- UI/UX Animation (GSAP, WebGL, Framer Motion)

## 🛡️ Report a Vulnerability

Because IRIS handles direct system-level execution and local vault decryption, security is the highest priority.

If you find a vulnerability that allows for Remote Code Execution (RCE), key leakage, or IPC bridge bypassing, **DO NOT open a public issue.** Please report it directly via email to: **cutegirla6777@gmail.com**

### Required in Security Reports:

1. **Severity Assessment** (Low/Medium/High/Critical)
2. **Affected Component** (e.g., Main Process, React UI, RAG Oracle)
3. **Technical Reproduction Steps**
4. **Demonstrated Impact**
5. **Remediation Advice** (if you have a suggested fix)
