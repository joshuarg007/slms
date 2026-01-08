// src/components/CRMSelect.tsx
import type { CRM } from "@/utils/crm";
import { crmLabel, ALL_CRMS } from "@/utils/crm";

type Props = {
  value: CRM;
  onChange: (v: CRM) => void;
  className?: string;
};

export default function CRMSelect({ value, onChange, className }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CRM)}
      className={className ?? "rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"}
      aria-label="Select CRM"
    >
      {ALL_CRMS.map((crm) => (
        <option key={crm} value={crm}>
          {crmLabel(crm)}
        </option>
      ))}
    </select>
  );
}
