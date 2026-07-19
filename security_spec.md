# Security Specification & Threat Model for NOVA-X Firestore

## 1. Data Invariants

- **Identity Lock**: A user can only access or modify records (User profile and Notes) that belong directly to their own authenticated UID.
- **Relational Integrity**: A Note document path `/users/{userId}/notes/{noteId}` must have `{userId}` matching the authenticated user's `uid`, and the note's inner `userId` field must also match.
- **Timestamp Veracity**: `createdAt` and `updatedAt` must be set via `request.time` (the server-side current time) to prevent clients from altering historical sequences.
- **Volumetric Safety**: String sizes must be bounded (e.g., titles under 200 characters, contents under 50,000 characters) to prevent "Denial of Wallet" size-bloat attacks.

---

## 2. The "Dirty Dozen" Attack Payloads

### Payload 1: PII Privilege Escalation

An attacker tries to read another user's profile document `/users/victimUID`.

- **Target Path**: `/users/victimUID`
- **Action**: GET
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Ghost Field Hijack (Shadow Update)

An attacker tries to update their profile with an unwhitelisted field `isAdmin: true`.

- **Target Path**: `/users/attackerUID`
- **Action**: UPDATE
- **Payload**: `{ uid: "attackerUID", email: "attacker@novax.ai", isAdmin: true, createdAt: ... }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 3: Spoofed Identity Note Creation

An attacker tries to create a note under `/users/victimUID/notes/note123` referencing their own uid.

- **Target Path**: `/users/victimUID/notes/note123`
- **Action**: CREATE
- **Payload**: `{ id: "note123", userId: "attackerUID", title: "Malicious Note", content: "test", createdAt: request.time, updatedAt: request.time }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Orphaned Write / Mismatched ID

An attacker tries to create a note under `/users/attackerUID/notes/note123` with the internal field `userId` set to `victimUID`.

- **Target Path**: `/users/attackerUID/notes/note123`
- **Action**: CREATE
- **Payload**: `{ id: "note123", userId: "victimUID", title: "Mismatched note", content: "test", createdAt: request.time, updatedAt: request.time }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 5: Title Size-Overflow Attack (Denial of Wallet)

An attacker attempts to write a note with a huge title of 100,000 characters to bloat database storage costs.

- **Target Path**: `/users/attackerUID/notes/note123`
- **Action**: CREATE
- **Payload**: `{ id: "note123", userId: "attackerUID", title: "[100,000 chars...]", content: "test", createdAt: request.time, updatedAt: request.time }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 6: Note Content Overflow Attack

An attacker attempts to write a note with content exceeding 50,000 characters.

- **Target Path**: `/users/attackerUID/notes/note123`
- **Action**: CREATE
- **Payload**: `{ id: "note123", userId: "attackerUID", title: "Ok title", content: "[50,001 chars...]", createdAt: request.time, updatedAt: request.time }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Client-Spoofed CreatedAt Timestamp

An attacker attempts to backdate a note's creation by sending a manual client timestamp.

- **Target Path**: `/users/attackerUID/notes/note123`
- **Action**: CREATE
- **Payload**: `{ id: "note123", userId: "attackerUID", title: "Hack Time", content: "test", createdAt: timestamp("2010-01-01T00:00:00Z"), updatedAt: request.time }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 8: Immutable CreatedAt Hijack on Update

An attacker tries to modify `createdAt` during a note update.

- **Target Path**: `/users/attackerUID/notes/note123`
- **Action**: UPDATE
- **Payload**: `{ id: "note123", userId: "attackerUID", title: "Changed Title", content: "test", createdAt: timestamp("2020-01-01T00:00:00Z"), updatedAt: request.time }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 9: Malicious/Poisoned Document ID Inject

An attacker attempts to create a note with a weird, huge, or escaped document ID containing invalid characters.

- **Target Path**: `/users/attackerUID/notes/poisoned-%%-id-$$`
- **Action**: CREATE
- **Payload**: `{ id: "poisoned-%%-id-$$", userId: "attackerUID", title: "Poison", content: "test", createdAt: request.time, updatedAt: request.time }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: Anonymous / Unverified User Write

An unauthenticated or unverified email user tries to create a note.

- **Target Path**: `/users/anonUID/notes/note123`
- **Action**: CREATE
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: System-Generated Field Tampering on Update

An attacker attempts to change the structural metadata `id` or `userId` in an existing note.

- **Target Path**: `/users/attackerUID/notes/note123`
- **Action**: UPDATE
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 12: Blanket List Scrape without Filtering

An attacker queries the entire notes collection without filtering by their authenticated owner ID.

- **Target Path**: `/users/victimUID/notes` (or cross-user queries)
- **Action**: LIST
- **Expected Outcome**: `PERMISSION_DENIED`
