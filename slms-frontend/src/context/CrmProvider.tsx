// src/context/CrmProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import type { CRM } from "@/utils/crm";
import { getCRM, setCRM as persist } from "@/utils/crm";

type Ctx = { crm: CRM; setCRM: (v: CRM) => void };

const KEY = "slms.crm";
const Ctx = createContext<Ctx | null>(null);

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [crm, setCrmState] = useState<CRM>(() => getCRM());

  const setCRM = (v: CRM) => {
    setCrmState(v);
    persist(v);
  };

  // keep in sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCrmState(getCRM());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <Ctx.Provider value={{ crm, setCRM }}>{children}</Ctx.Provider>;
}

export function useCrm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCrm must be used within CrmProvider");
  return ctx;
}
