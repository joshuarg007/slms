// src/utils/crm.ts
export type CRM = "hubspot" | "pipedrive";

const KEY = "slms.crm";

export function getCRM(): CRM {
  try {
    const v = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) as CRM | null;
    return v === "pipedrive" ? "pipedrive" : "hubspot";
  } catch {
    return "hubspot";
  }
}

export function setCRM(v: CRM) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, v);
  } catch {}
}

export function crmLabel(v: CRM) {
  return v === "pipedrive" ? "Pipedrive" : "HubSpot";
}

// salespeople endpoints root for a CRM
export function crmSalespeopleBase(v: CRM): string {
  // e.g. /integrations/hubspot/salespeople or /integrations/pipedrive/salespeople
  return `/integrations/${v}/salespeople`;
}
