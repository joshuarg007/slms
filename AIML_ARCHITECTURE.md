# AIML Architecture Plan

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │   Cookie    │    │ localStorage│    │          IndexedDB              │ │
│  │   (4KB)     │    │   (5MB)     │    │         (Unlimited)             │ │
│  │             │    │             │    │                                 │ │
│  │  Core AIML  │───▶│Extended AIML│───▶│  Full Conversation Archive     │ │
│  │  ~400 bytes │    │  ~2-10KB    │    │  + Semantic Search Index       │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────────────┘ │
│         │                  │                          │                     │
│         └──────────────────┼──────────────────────────┘                     │
│                            │                                                │
│                            ▼                                                │
│                   ┌─────────────────┐                                       │
│                   │   AIML.js SDK   │                                       │
│                   │                 │                                       │
│                   │  • parse()      │                                       │
│                   │  • toString()   │                                       │
│                   │  • save()       │                                       │
│                   │  • load()       │                                       │
│                   │  • toPrompt()   │                                       │
│                   │  • compress()   │                                       │
│                   └────────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                   ┌─────────────────┐                                       │
│                   │   Chat UI       │                                       │
│                   │                 │                                       │
│                   │  User Input     │                                       │
│                   │       +         │                                       │
│                   │  AIML Context   │                                       │
│                   │       +         │                                       │
│                   │  Last 2 msgs    │                                       │
│                   └────────┬────────┘                                       │
│                            │                                                │
└────────────────────────────┼────────────────────────────────────────────────┘
                             │
                             ▼ HTTPS POST /api/chat/messages
┌────────────────────────────────────────────────────────────────────────────┐
│                              SERVER (FastAPI)                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                         /api/chat/messages                           │ │
│  │                                                                      │ │
│  │   1. Validate user auth & plan quota                                │ │
│  │   2. Receive: { message, aiml_context, last_messages }              │ │
│  │   3. Build prompt with AIML system instructions                     │ │
│  │   4. Call AI Provider                                               │ │
│  │   5. Extract updated <aiml> from response                           │ │
│  │   6. Return: { response, updated_aiml, tokens_used }                │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                            │                                               │
│                            ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                      AI Provider Abstraction                         │ │
│  │                                                                      │ │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │ │
│  │   │   Claude    │  │   GPT-4o    │  │   Gemini    │  │   Llama   │  │ │
│  │   │  (Default)  │  │  (Fallback) │  │  (Future)   │  │ (Future)  │  │ │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                         Database (Optional)                          │ │
│  │                                                                      │ │
│  │   • Usage tracking (tokens, costs per org)                          │ │
│  │   • Conversation metadata (not content - that's client-side)        │ │
│  │   • Audit logs                                                       │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Send Message Flow

```
1. User types message
          │
          ▼
2. AIML.load() - Get current context from storage
          │
          ▼
3. Build request payload:
   {
     message: "What about pricing?",
     aiml_context: "AIML/1\n@ctx:sales...",
     last_messages: [
       { role: "user", content: "Tell me about Acme" },
       { role: "assistant", content: "Acme is a..." }
     ]
   }
          │
          ▼
4. POST /api/chat/messages
          │
          ▼
5. Server builds full prompt:
   """
   System: You maintain context using AIML/1...

   <aiml>
   AIML/1
   @ctx:sales_crm
   ...
   </aiml>

   Previous:
   User: Tell me about Acme
   Assistant: Acme is a...

   User: What about pricing?
   """
          │
          ▼
6. AI Provider responds:
   """
   Based on your conversation about Acme, here's
   their pricing structure...

   <aiml>
   AIML/1
   @ctx:sales_crm
   @ent:AcmeCorp,Pricing
   @mem:acme_overview;pricing_discussed
   @pen:none
   </aiml>
   """
          │
          ▼
7. Server extracts AIML, returns:
   {
     response: "Based on your conversation...",
     updated_aiml: "AIML/1\n@ctx:sales...",
     tokens_used: 387
   }
          │
          ▼
8. Client saves updated AIML:
   AIML.parse(updated_aiml).save()
          │
          ▼
9. Display response to user
```

---

## Storage Tiers Detail

### Tier 1: Cookie (Cross-Device Core)

```javascript
// Max ~3.5KB after encoding
{
  purpose: "Cross-device identity & core preferences",
  syncs: "Automatically via browser",
  contains: [
    "@ctx",     // Context domain
    "@usr",     // User prefs (truncated)
    "@ent",     // Last 5 entities
    "@mem",     // Last 10 memory keys
    "@pen"      // Pending context
  ],
  ttl: "30 days (configurable)",
  security: "HttpOnly: false (needs JS access), Secure, SameSite=Strict"
}
```

### Tier 2: localStorage (Extended Memory)

```javascript
// Max 5MB, typically use <50KB
{
  purpose: "Full session context, detailed memory",
  syncs: "Single device only",
  contains: [
    "Full AIML with all fields",
    "Last 20 entities",
    "Last 50 memory keys",
    "Extended freeform section",
    "Conversation summaries"
  ],
  ttl: "Permanent until cleared",
  key: "aiml_v1_{context_domain}"
}
```

### Tier 3: IndexedDB (Archive & Search)

```javascript
// Unlimited, typically <10MB
{
  purpose: "Full conversation archive, semantic search",
  syncs: "Single device only",
  contains: [
    "All historical messages",
    "AIML snapshots over time",
    "Search index (keywords, entities)",
    "Analytics (topics discussed, frequency)"
  ],
  ttl: "User-configurable retention",
  schema: {
    conversations: { id, aiml_snapshot, created_at },
    messages: { id, conversation_id, role, content, timestamp },
    search_index: { term, message_ids, weight }
  }
}
```

---

## Compression Strategies

### Automatic Compression Triggers

```javascript
const LIMITS = {
  cookie: 3500,      // bytes
  localStorage: 50000, // bytes
  entities: 20,       // max count
  memories: 30,       // max count
  freeform: 500       // characters
};

function autoCompress(aiml) {
  // 1. Dedupe entities
  aiml.fields.ent = [...new Set(aiml.entities)].slice(-LIMITS.entities).join(',');

  // 2. Merge similar memories
  aiml.fields.mem = mergeSimilarMemories(aiml.memories).slice(-LIMITS.memories).join(';');

  // 3. Truncate freeform
  if (aiml.freeform.length > LIMITS.freeform) {
    aiml.freeform = aiml.freeform.slice(-LIMITS.freeform);
    // Or: request AI summarization
  }

  // 4. Cascade tiers if still too large
  if (aiml.toString().length > LIMITS.cookie) {
    saveToLocalStorage(aiml);
    aiml = aiml.toCore(); // Minimal version for cookie
  }

  return aiml;
}
```

### AI-Assisted Compression

When memory gets large, ask AI to summarize:

```
Your AIML memory is getting large. Compress the following into a more
concise AIML block while preserving the most important context:

<aiml>
{large_aiml}
</aiml>

Return a compressed version under 500 characters total.
```

---

## Security Model

### Threat Model

| Threat | Mitigation |
|--------|------------|
| XSS stealing AIML | CSP headers, sanitize all outputs |
| Cookie theft | Secure, SameSite=Strict, no sensitive data |
| Server-side logging | AIML stays client-side, server only sees current turn |
| AI provider data retention | Redact @usr before API calls if needed |
| Device theft | Optional encryption with user passphrase |

### Privacy Levels

```
AIML/1
@prv:local          # Never leaves device
@prv:sync           # Can sync to server (user opted in)
@prv:public         # Can be shared (anonymized)
```

### Field-Level Redaction

```javascript
// Before sending to AI provider
function redactForAI(aiml) {
  const redactFields = (aiml.fields.redact || '').split(',');
  const clean = new AIML(aiml.toString());

  for (const field of redactFields) {
    if (field === 'usr') {
      clean.fields.usr = clean.fields.usr?.split('|')[1] || ''; // Keep prefs, drop ID
    } else {
      delete clean.fields[field];
    }
  }

  return clean;
}
```

---

## API Contract

### Request

```typescript
interface ChatRequest {
  message: string;
  aiml_context?: string;        // Current AIML block
  last_messages?: {             // Last N messages for immediate context
    role: 'user' | 'assistant';
    content: string;
  }[];
  context_type?: string;        // 'general' | 'lead_analysis' | 'coaching'
  context_id?: number;          // e.g., lead_id for analysis
}
```

### Response

```typescript
interface ChatResponse {
  conversation_id: number;
  message_id: number;
  response: string;             // AI's response text
  updated_aiml?: string;        // New AIML block to save
  tokens_used: number;
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| 400 | Invalid AIML format |
| 401 | Unauthorized |
| 403 | AI feature not in plan |
| 429 | Quota exceeded |
| 500 | AI provider error |

---

## Implementation Phases

### Phase 1: Core (Week 1)
- [ ] AIML.js parser/writer class
- [ ] localStorage integration
- [ ] Update ChatPage to use AIML
- [ ] Backend: accept aiml_context in request
- [ ] Backend: extract and return updated_aiml

### Phase 2: Optimization (Week 2)
- [ ] Cookie tier with auto-compression
- [ ] Memory limits enforcement
- [ ] Prompt engineering for reliable AIML updates
- [ ] Fallback if AI doesn't return valid AIML

### Phase 3: Advanced (Week 3+)
- [ ] IndexedDB archive tier
- [ ] AI-assisted compression
- [ ] Semantic search in archive
- [ ] Cross-device sync (optional server storage)
- [ ] Encryption option

### Phase 4: SDK & Open Source
- [ ] Extract to standalone npm package
- [ ] React hook: `useAIML()`
- [ ] Vue composable: `useAIML()`
- [ ] Documentation site
- [ ] Community field proposals

---

## Testing Strategy

### Unit Tests

```javascript
describe('AIML', () => {
  test('parses valid AIML string', () => {
    const aiml = new AIML('AIML/1\n@ctx:test\n@ent:A,B,C');
    expect(aiml.ctx).toBe('test');
    expect(aiml.entities).toEqual(['A', 'B', 'C']);
  });

  test('handles missing fields gracefully', () => {
    const aiml = new AIML('AIML/1\n@ctx:test');
    expect(aiml.entities).toEqual([]);
    expect(aiml.pending).toBe('');
  });

  test('enforces entity limit', () => {
    const aiml = new AIML();
    for (let i = 0; i < 50; i++) aiml.addEntity(`E${i}`);
    expect(aiml.entities.length).toBe(20);
  });

  test('round-trips through toString/parse', () => {
    const original = 'AIML/1\n@ctx:test\n@usr:bob|pref:fast\n---\nSome notes';
    const aiml = new AIML(original);
    expect(new AIML(aiml.toString()).ctx).toBe('test');
  });
});
```

### Integration Tests

```javascript
describe('ChatPage with AIML', () => {
  test('saves updated AIML after response', async () => {
    // Mock API response with updated_aiml
    // Verify localStorage contains new AIML
  });

  test('loads AIML on mount', async () => {
    localStorage.setItem('aiml', 'AIML/1\n@ctx:sales');
    // Mount component
    // Verify AIML context sent with first message
  });

  test('compresses when approaching limit', async () => {
    // Fill AIML to near-limit
    // Add more entities
    // Verify compression occurred
  });
});
```

---

## Metrics & Monitoring

### Track (Client-Side)

```javascript
// Anonymous analytics
{
  aiml_size_bytes: 423,
  compression_triggered: false,
  storage_tier: 'localStorage',
  entities_count: 8,
  memories_count: 12,
  session_messages: 5
}
```

### Track (Server-Side)

```python
# Per-request logging
{
  "org_id": 123,
  "tokens_in": 287,
  "tokens_out": 156,
  "aiml_provided": True,
  "aiml_returned": True,
  "response_time_ms": 1423
}
```

---

## Open Questions

1. **AIML Versioning**: How to handle breaking changes in format?
2. **Multi-Tab**: Sync AIML across browser tabs via BroadcastChannel?
3. **Offline**: Queue messages when offline, process when back?
4. **Import/Export**: Let users download/upload their AIML?
5. **Team Sharing**: Shared org-level AIML vs personal AIML?

---

*Architecture v1.0 - Draft*
