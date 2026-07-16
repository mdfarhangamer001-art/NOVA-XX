# Security Policy

If you believe you've found a legitimate security vulnerability in the IRIS Neural OS Agent, please report it privately. Do not open public GitHub issues for critical zero-days, Remote Code Execution (RCE) flaws, or IPC bridge escapes.

## Reporting

Report vulnerabilities directly via email to the Lead Architect:

- **cutegirla6777@gmail.com**

Please allow up to 48 hours for an initial response. Reports affecting the integrity of the host machine are triaged with the highest priority.

### Required in Reports

To ensure rapid triage, please include:

1. **Title & Severity Assessment** (Low/Medium/High/Critical)
2. **Affected Component** (e.g., Main Process IPC, React UI, Protected Core Tooling)
3. **Technical Reproduction** (Exact steps to trigger the flaw)
4. **Demonstrated Impact** (What does this allow an attacker to do?)
5. **Environment** (OS Version, IRIS Version)
6. **Remediation Advice** (Suggested fix, if applicable)

---

## 🛡️ IRIS Trust & Threat Model (CRITICAL)

IRIS is a local, kernel-level Operating System extension built on Electron. Because of this, the security model operates under the **"Trusted Operator"** paradigm.

### 1. The Trusted Operator Assumption

IRIS assumes that anyone who has unlocked the host machine and launched the application is the **Trusted Operator**.

- IRIS is designed to execute commands, read files, click the screen, and modify the OS on behalf of the user.
- **If a user explicitly asks IRIS to delete a file, and IRIS deletes it, that is a feature, not a vulnerability.**
- Vulnerabilities are strictly defined as actions taken _without_ the user's consent, or malicious escalation _bypassing_ the IPC bridge.

### 2. Single-User Boundary

IRIS does **not** model one installation as a multi-tenant, adversarial boundary.

- It is designed for one user per machine/OS profile.
- If multiple mutually untrusted users share the same OS login profile, the security boundary is already broken at the OS level, not by IRIS.

### 3. 100% BYOK (Bring Your Own Key) Architecture

Privacy is absolute. IRIS operates on a strict zero-trust architecture regarding external servers.

- **Your API keys (Gemini, Groq, Tavily, Hugging Face) NEVER touch our servers.**
- Credentials are encrypted locally using your Operating System's native secure keychain:
  - **Windows:** `DPAPI` via Electron `safeStorage`
  - **macOS:** Apple Keychain
  - **Linux:** Secret Service API
- The keys are stored in a local, encrypted `iris_secure_vault.json` file.

---

## ❌ Out of Scope

The following scenarios are considered expected behavior under the IRIS threat model:

1. **Prompt Injection (Without Boundary Bypass):** "Tricking" the LLM via text injection is out of scope _unless_ it results in an unauthorized bypass of the Electron IPC bridge or executes a restricted OS command without user confirmation.
2. **Local Physical Access:** Any attack that requires the attacker to physically sit at the unlocked host machine.
3. **Malicious Workspace Files:** "An attacker writes a malicious payload into `notes.txt`, and the RAG Oracle reads it." Reading files is the Oracle's job.
4. **Expected OS Execution:** Reports treating explicit operator-control surfaces (like the `run_terminal` or `click_on_screen` tools) as vulnerabilities. These are intentional, trusted-operator features.
5. **Missing Network Headers:** Missing HSTS or similar web-centric headers on local Electron `file://` or `localhost` protocols.

---

## ✅ In Scope (High Priority)

We are highly interested in reports regarding:

1. **IPC Bridge Escapes:** Any method where the untrusted React Renderer process can execute arbitrary Node.js code in the Main Process without using the predefined `ipcMain.handle` channels.
2. **Remote Code Execution (RCE):** Any method where an external, remote attacker can force the IRIS engine to execute code without the local Trusted Operator's consent.
3. **Vault Key Leakage:** Flaws in how `safeStorage` encrypts/decrypts the BYOK credentials, leading to keys being logged in plaintext, exposed to the Renderer process unnecessarily, or leaked over the network.
4. **Path Traversal:** Flaws in the file management tools that allow the AI to bypass intended directory restrictions (if configured) during autonomous operations.
