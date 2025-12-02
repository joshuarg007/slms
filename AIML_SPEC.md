# AIML - AI Memory Language

> A lightweight, universal format for persistent AI context in web applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0--draft-orange.svg)]()

---

## The Problem

Every AI-powered web app faces the same challenge:

```
User: "What did we discuss yesterday?"
AI: "I don't have access to previous conversations."
```

Current solutions are expensive and complex:
- **Full chat history** → 2000+ tokens per request → $$$
- **Server-side storage** → Database costs, privacy concerns
- **Session-only memory** → Lost when user closes tab

---

## The Solution

**AIML** is a compact, human-readable format that stores AI conversation context client-side.

```
AIML/1
@ctx:sales_crm
@usr:joshua|pref:direct,detailed
@ent:AcmeCorp,JohnSmith,Q4Pipeline
@mem:BANT_explained;email_seq_3touch
@pen:pricing_question
@ttl:30d
---
User prefers bullet points. Discussed cold outreach strategy.
```

**400 bytes** instead of 16KB. **100x compression.**

---

## Features

| Feature | Benefit |
|---------|---------|
| **Cookie-sized** | < 4KB, fits anywhere |
| **Self-updating** | AI reads and writes the format |
| **Privacy-first** | Data stays on user's device |
| **Provider-agnostic** | Works with Claude, GPT, Gemini, Llama |
| **Human-readable** | Debug without tools |
| **Versioned** | `AIML/1`, `AIML/2`, etc. |

---

## Format Specification

### Structure

```
AIML/{version}
@{field}:{value}
@{field}:{value}
---
{freeform natural language context}
```

### Core Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `@ctx` | string | Context domain/app type | `sales_crm`, `support`, `coding` |
| `@usr` | string | User identifier + preferences | `joshua\|pref:direct,detailed` |
| `@ent` | csv | Named entities mentioned | `AcmeCorp,JohnSmith,Deal123` |
| `@mem` | ssv | Memory keys (semicolon-separated) | `topic1;topic2;insight3` |
| `@pen` | string | Pending/unresolved context | `awaiting_response_on_pricing` |
| `@ttl` | duration | Time-to-live | `30d`, `7d`, `session`, `forever` |

### Extension Fields

| Field | Type | Description |
|-------|------|-------------|
| `@prv` | enum | Privacy level: `local`, `sync`, `public` |
| `@sync` | csv | Fields allowed to sync to server |
| `@redact` | csv | Fields to strip before AI calls |
| `@lang` | string | Language code: `en`, `es`, `fr` |
| `@tone` | string | Conversation tone: `formal`, `casual`, `technical` |
| `@role` | string | AI persona: `assistant`, `analyst`, `coach` |

### Freeform Section

Everything after `---` is natural language context. Use for nuance that doesn't fit structured fields.

```
---
User is evaluating competitors. Sensitive to pricing discussions.
Previous meeting scheduled for Friday was cancelled.
```

---

## Storage Strategy

### Tiered Approach

```
┌─────────────────────────────────────────────────────────────┐
│  Cookie (4KB)           │  Core AIML - syncs across devices │
├─────────────────────────────────────────────────────────────┤
│  localStorage (5MB)     │  Extended memory, conversation    │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB (Unlimited)  │  Full archive, semantic search    │
└─────────────────────────────────────────────────────────────┘
```

### Auto-Compression Rules

When approaching storage limits:

1. **Merge similar `@mem` entries** → `email_v1;email_v2;email_v3` → `email_strategies`
2. **Prune old `@ent`** → Keep last 10, archive rest
3. **Summarize freeform section** → Ask AI to compress
4. **Cascade to next tier** → Cookie → localStorage → IndexedDB

---

## Integration

### Prompt Template

```
You are an AI assistant with persistent memory using AIML/1 format.

INSTRUCTIONS:
1. Read the <aiml> block to understand conversation context
2. Respond to the user's message
3. Return an updated <aiml> block reflecting new context

CURRENT MEMORY:
<aiml>
{aiml_content}
</aiml>

USER MESSAGE:
{user_message}

Respond naturally, then include:
<aiml>
{updated_aiml}
</aiml>
```

### JavaScript Reference Implementation

```javascript
class AIML {
  static VERSION = '1';

  constructor(raw = '') {
    this.fields = {};
    this.freeform = '';
    if (raw) this.parse(raw);
  }

  parse(raw) {
    const lines = raw.trim().split('\n');
    let inFreeform = false;

    for (const line of lines) {
      if (line.startsWith('AIML/')) continue;
      if (line === '---') { inFreeform = true; continue; }

      if (inFreeform) {
        this.freeform += line + '\n';
      } else if (line.startsWith('@')) {
        const [field, ...rest] = line.slice(1).split(':');
        this.fields[field] = rest.join(':');
      }
    }
  }

  toString() {
    let out = `AIML/${AIML.VERSION}\n`;
    for (const [k, v] of Object.entries(this.fields)) {
      if (v) out += `@${k}:${v}\n`;
    }
    if (this.freeform.trim()) {
      out += '---\n' + this.freeform.trim();
    }
    return out;
  }

  // Field helpers
  get ctx() { return this.fields.ctx || ''; }
  set ctx(v) { this.fields.ctx = v; }

  get entities() { return (this.fields.ent || '').split(',').filter(Boolean); }
  addEntity(e) {
    const ents = new Set(this.entities);
    ents.add(e);
    this.fields.ent = [...ents].slice(-20).join(','); // Keep last 20
  }

  get memories() { return (this.fields.mem || '').split(';').filter(Boolean); }
  addMemory(m) {
    const mems = new Set(this.memories);
    mems.add(m);
    this.fields.mem = [...mems].slice(-30).join(';'); // Keep last 30
  }

  get pending() { return this.fields.pen || ''; }
  set pending(v) { this.fields.pen = v; }

  // Storage
  save(key = 'aiml') {
    localStorage.setItem(key, this.toString());
    // Also set cookie for cross-device (truncated if needed)
    const core = this.toCore();
    if (core.length < 3500) {
      document.cookie = `${key}=${encodeURIComponent(core)}; max-age=2592000; path=/; secure; samesite=strict`;
    }
  }

  static load(key = 'aiml') {
    // Prefer localStorage, fallback to cookie
    let raw = localStorage.getItem(key);
    if (!raw) {
      const match = document.cookie.match(new RegExp(`${key}=([^;]+)`));
      if (match) raw = decodeURIComponent(match[1]);
    }
    return new AIML(raw || '');
  }

  toCore() {
    // Minimal version for cookies
    const core = new AIML();
    core.fields = {
      ctx: this.ctx,
      usr: this.fields.usr,
      ent: this.entities.slice(-5).join(','),
      mem: this.memories.slice(-10).join(';'),
      pen: this.pending
    };
    return core.toString();
  }

  toPrompt() {
    return `<aiml>\n${this.toString()}\n</aiml>`;
  }

  static extractFromResponse(response) {
    const match = response.match(/<aiml>([\s\S]*?)<\/aiml>/);
    return match ? new AIML(match[1]) : null;
  }
}

export default AIML;
```

---

## Examples

### E-commerce Support Bot

```
AIML/1
@ctx:ecommerce_support
@usr:customer_8271|pref:quick,friendly
@ent:Order_12345,Blue_Sneakers,ReturnLabel
@mem:order_located;return_initiated;label_sent
@pen:awaiting_dropoff_confirmation
@ttl:7d
---
Customer returning shoes due to size. Already sent prepaid label.
Prefers text over email. Timezone: PST.
```

### Sales CRM Assistant

```
AIML/1
@ctx:sales_crm
@usr:sales_rep|pref:direct,data_driven
@ent:Acme_Corp,John_Smith_CFO,Deal_Q4_2024
@mem:BANT_qualified;sent_proposal;demo_scheduled
@pen:follow_up_after_demo
@ttl:30d
@role:sales_coach
---
Deal size ~$50K ARR. Competition: Competitor X (cheaper but less features).
Champion is John, blocker is procurement. Demo scheduled Dec 15.
```

### Code Assistant

```
AIML/1
@ctx:coding
@usr:developer|pref:concise,typescript
@ent:UserService,AuthModule,PostgreSQL
@mem:explained_auth_flow;fixed_n+1_query;added_rate_limiting
@pen:needs_tests_for_auth
@ttl:session
@lang:en
@tone:technical
---
Working on Node.js backend. Uses Prisma ORM.
Prefers functional style over classes. Already using Jest for tests.
```

---

## Cost Analysis

| Approach | Tokens/Request | Monthly Cost (500 msgs) |
|----------|----------------|------------------------|
| Full history (20 msgs) | 2000-4000 | $30-60 |
| Last 5 messages | 500-1000 | $8-15 |
| **AIML + last 2 msgs** | **200-400** | **$3-6** |

**5-10x cost reduction** while maintaining context quality.

---

## Privacy & Security

### Client-Side by Default

- All data stored in user's browser
- Never transmitted unless explicitly synced
- User can clear anytime: `AIML.clear()`

### Redaction for AI Calls

```
AIML/1
@ctx:healthcare
@usr:patient_id_REDACTED|pref:empathetic
@redact:usr,ent
@ent:Dr_Smith,Prescription_123
```

Before sending to AI provider, `@redact` fields are stripped or anonymized.

### Encryption (Optional)

```javascript
const aiml = AIML.load();
aiml.encrypt(userKey);  // AES-256-GCM
aiml.save();
```

---

## Roadmap

- [x] v1.0 - Core specification
- [ ] v1.1 - Encryption support
- [ ] v1.2 - Semantic compression (AI-powered summarization)
- [ ] v2.0 - Binary format option for extreme compression
- [ ] SDK - npm package `aiml-js`
- [ ] Plugins - React hook, Vue composable, Svelte store

---

## Contributing

This is an open specification. We welcome:

- Field suggestions for new use cases
- Storage strategy optimizations
- Language-specific implementations
- Security audits

---

## License

MIT License - Use freely, attribute appreciated.

---

## Acknowledgments

Developed as part of [Site2CRM](https://site2crm.io) AI Lead Consultant feature.

*"The best AI memory is the one users don't know is there."*
