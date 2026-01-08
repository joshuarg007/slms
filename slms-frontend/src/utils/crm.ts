// src/utils/crm.ts
export type CRM = "hubspot" | "pipedrive" | "salesforce" | "nutshell" | "zoho";

const KEY = "slms.crm";

const CRM_LABELS: Record<CRM, string> = {
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  salesforce: "Salesforce",
  nutshell: "Nutshell",
  zoho: "Zoho",
};

export function getCRM(): CRM {
  try {
    const v = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) as CRM | null;
    if (v && v in CRM_LABELS) return v;
    return "hubspot";
  } catch {
    return "hubspot";
  }
}

export function setCRM(v: CRM) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, v);
  } catch {}
}

export function crmLabel(v: CRM): string {
  return CRM_LABELS[v] || v;
}

// salespeople endpoints root for a CRM
export function crmSalespeopleBase(v: CRM): string {
  // e.g. /integrations/hubspot/salespeople or /integrations/pipedrive/salespeople
  return `/integrations/${v}/salespeople`;
}

// All supported CRMs
export const ALL_CRMS: CRM[] = ["hubspot", "pipedrive", "salesforce", "nutshell", "zoho"];
