// src/utils/wmem.ts
// WMEM (Web Memory) - Compressed AI context format for Site2CRM

const VERSION = '1';
const STORAGE_KEY = 'wmem_consultant';

interface WMEMFields {
  ctx?: string;      // Context domain
  usr?: string;      // User preferences
  ent?: string;      // Entities (comma-separated)
  mem?: string;      // Memory keys (semicolon-separated)
  pen?: string;      // Pending context
  ttl?: string;      // Time-to-live
}

class WMEM {
  fields: WMEMFields = {};
  freeform: string = '';

  constructor(raw: string = '') {
    if (raw) this.parse(raw);
  }

  parse(raw: string): void {
    const lines = raw.trim().split('\n');
    let inFreeform = false;
    this.freeform = '';

    for (const line of lines) {
      if (line.startsWith('WMEM/')) continue;
      if (line === '---') {
        inFreeform = true;
        continue;
      }

      if (inFreeform) {
        this.freeform += line + '\n';
      } else if (line.startsWith('@')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const field = line.slice(1, colonIdx);
          const value = line.slice(colonIdx + 1);
          this.fields[field as keyof WMEMFields] = value;
        }
      }
    }
    this.freeform = this.freeform.trim();
  }

  toString(): string {
    let out = `WMEM/${VERSION}\n`;
    for (const [k, v] of Object.entries(this.fields)) {
      if (v) out += `@${k}:${v}\n`;
    }
    if (this.freeform) {
      out += '---\n' + this.freeform;
    }
    return out;
  }

  // Getters/setters
  get ctx(): string { return this.fields.ctx || ''; }
  set ctx(v: string) { this.fields.ctx = v; }

  get entities(): string[] {
    return (this.fields.ent || '').split(',').filter(Boolean);
  }

  addEntity(e: string): void {
    const ents = new Set(this.entities);
    ents.add(e);
    // Keep last 20
    this.fields.ent = [...ents].slice(-20).join(',');
  }

  get memories(): string[] {
    return (this.fields.mem || '').split(';').filter(Boolean);
  }

  addMemory(m: string): void {
    const mems = new Set(this.memories);
    mems.add(m);
    // Keep last 30
    this.fields.mem = [...mems].slice(-30).join(';');
  }

  get pending(): string { return this.fields.pen || ''; }
  set pending(v: string) { this.fields.pen = v; }

  get userPrefs(): string { return this.fields.usr || ''; }
  set userPrefs(v: string) { this.fields.usr = v; }

  // Append to freeform
  addNote(note: string): void {
    if (this.freeform.length > 400) {
      // Truncate old notes, keep recent
      this.freeform = this.freeform.slice(-300);
    }
    this.freeform = (this.freeform + ' ' + note).trim();
  }

  // Storage
  save(key: string = STORAGE_KEY): void {
    try {
      localStorage.setItem(key, this.toString());
    } catch {
      // Storage full or unavailable
    }
  }

  static load(key: string = STORAGE_KEY): WMEM {
    try {
      const raw = localStorage.getItem(key);
      return new WMEM(raw || '');
    } catch {
      return new WMEM();
    }
  }

  static clear(key: string = STORAGE_KEY): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  // For AI prompt
  toPrompt(): string {
    return `<wmem>\n${this.toString()}\n</wmem>`;
  }

  // Extract updated WMEM from AI response
  static extractFromResponse(response: string): WMEM | null {
    const match = response.match(/<wmem>([\s\S]*?)<\/wmem>/);
    return match ? new WMEM(match[1]) : null;
  }

  // Check if empty/new
  isEmpty(): boolean {
    return !this.fields.ctx && !this.fields.ent && !this.fields.mem;
  }

  // Initialize with defaults for Site2CRM
  static createDefault(userEmail?: string): WMEM {
    const wmem = new WMEM();
    wmem.fields.ctx = 'sales_crm';
    wmem.fields.ttl = '30d';
    if (userEmail) {
      wmem.fields.usr = userEmail.split('@')[0] + '|pref:default';
    }
    return wmem;
  }
}

export default WMEM;
