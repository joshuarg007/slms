// src/components/CSVImportModal.tsx
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createLead, Lead } from "@/utils/api";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
  onImportComplete?: () => void;
}

type FieldMapping = {
  csvColumn: string;
  leadField: string;
};

const LEAD_FIELDS = [
  { value: "", label: "-- Skip this column --" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "source", label: "Source" },
  { value: "status", label: "Status" },
  { value: "value", label: "Value ($)" },
  { value: "notes", label: "Notes" },
];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Simple CSV parser (handles basic quoted strings)
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter((row) => row.some((cell) => cell.length > 0));

  return { headers, rows };
}

function autoMapFields(headers: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  for (let i = 0; i < headers.length; i++) {
    const header = lowerHeaders[i];
    let field = "";

    if (header.includes("name") || header.includes("full name") || header.includes("contact")) {
      field = "name";
    } else if (header.includes("email") || header.includes("e-mail")) {
      field = "email";
    } else if (header.includes("phone") || header.includes("mobile") || header.includes("tel")) {
      field = "phone";
    } else if (header.includes("company") || header.includes("organization") || header.includes("org")) {
      field = "company";
    } else if (header.includes("source") || header.includes("lead source") || header.includes("channel")) {
      field = "source";
    } else if (header.includes("status") || header.includes("stage")) {
      field = "status";
    } else if (header.includes("value") || header.includes("amount") || header.includes("deal") || header.includes("revenue")) {
      field = "value";
    } else if (header.includes("note") || header.includes("comment") || header.includes("description")) {
      field = "notes";
    }

    mappings.push({ csvColumn: headers[i], leadField: field });
  }

  return mappings;
}

export default function CSVImportModal({ isOpen, onClose, onSuccess, onImportComplete }: CSVImportModalProps) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "importing" | "complete">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] }>({ headers: [], rows: [] });
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, errors: [] as string[] });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);
      setMappings(autoMapFields(parsed.headers));
      setStep("map");
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const updateMapping = (index: number, field: string) => {
    setMappings((prev) => prev.map((m, i) => (i === index ? { ...m, leadField: field } : m)));
  };

  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, errors: [] });

    const total = csvData.rows.length;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      const leadData: Record<string, any> = {};

      // Map CSV columns to lead fields
      mappings.forEach((mapping, colIndex) => {
        if (mapping.leadField && row[colIndex]) {
          if (mapping.leadField === "value") {
            leadData[mapping.leadField] = parseFloat(row[colIndex].replace(/[^0-9.-]/g, "")) || 0;
          } else {
            leadData[mapping.leadField] = row[colIndex];
          }
        }
      });

      // Skip if no email and no name
      if (!leadData.name && !leadData.email) {
        failed++;
        errors.push(`Row ${i + 2}: Missing name and email`);
        continue;
      }

      // Set defaults
      if (!leadData.source) leadData.source = "CSV Import";
      if (!leadData.status) leadData.status = "new";

      try {
        await createLead(leadData as Parameters<typeof createLead>[0]);
        success++;
      } catch (e: any) {
        failed++;
        errors.push(`Row ${i + 2}: ${e.message || "Import failed"}`);
      }

      setImportProgress(Math.round(((i + 1) / total) * 100));
      setImportResults({ success, failed, errors: errors.slice(-5) }); // Keep last 5 errors
    }

    setStep("complete");
    if (onSuccess && success > 0) {
      onSuccess(success);
    }
    if (onImportComplete && success > 0) {
      onImportComplete();
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setCsvData({ headers: [], rows: [] });
    setMappings([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, errors: [] });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-500 to-purple-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Import Leads from CSV</h2>
                  <p className="text-sm text-white/70">
                    {step === "upload" && "Upload your CSV file"}
                    {step === "map" && "Map columns to lead fields"}
                    {step === "preview" && "Review before importing"}
                    {step === "importing" && "Importing leads..."}
                    {step === "complete" && "Import complete"}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-4">
              {["upload", "map", "preview", "complete"].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step === s ? "bg-white text-indigo-600" :
                    ["map", "preview", "importing", "complete"].indexOf(step) >= i ? "bg-white/30 text-white" : "bg-white/10 text-white/50"
                  }`}>
                    {["map", "preview", "importing", "complete"].indexOf(step) > i ? "✓" : i + 1}
                  </div>
                  {i < 3 && <div className={`w-8 h-1 mx-1 rounded ${["map", "preview", "importing", "complete"].indexOf(step) > i ? "bg-white/50" : "bg-white/20"}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Upload Step */}
            {step === "upload" && (
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                  dragActive ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-gray-700"
                }`}
                onDrop={handleDrop}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Drop your CSV file here</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">or click to browse</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                >
                  Select File
                </button>
                <p className="text-xs text-gray-400 mt-4">Supports CSV files with headers. Max 1000 rows.</p>
              </div>
            )}

            {/* Map Step */}
            {step === "map" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Found <span className="font-bold text-gray-900 dark:text-white">{csvData.rows.length}</span> rows and{" "}
                    <span className="font-bold text-gray-900 dark:text-white">{csvData.headers.length}</span> columns in {file?.name}
                  </p>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    Auto-mapped
                  </span>
                </div>

                <div className="space-y-3">
                  {mappings.map((mapping, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">CSV Column</div>
                        <code className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-mono">
                          {mapping.csvColumn}
                        </code>
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          Sample: {csvData.rows[0]?.[idx] || "—"}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Lead Field</div>
                        <select
                          value={mapping.leadField}
                          onChange={(e) => updateMapping(idx, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          {LEAD_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Step */}
            {step === "preview" && (
              <div>
                <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">Ready to import {csvData.rows.length} leads</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    This action cannot be undone. Duplicate emails may create duplicate leads.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        {mappings.filter((m) => m.leadField).map((m) => (
                          <th key={m.csvColumn} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                            {LEAD_FIELDS.find((f) => f.value === m.leadField)?.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.rows.slice(0, 5).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-gray-100 dark:border-gray-800">
                          {mappings.filter((m) => m.leadField).map((m, colIdx) => {
                            const originalIdx = mappings.findIndex((om) => om === m);
                            return (
                              <td key={colIdx} className="px-4 py-3 text-gray-900 dark:text-white">
                                {row[originalIdx] || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvData.rows.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    ... and {csvData.rows.length - 5} more rows
                  </p>
                )}
              </div>
            )}

            {/* Importing Step */}
            {step === "importing" && (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-6">
                  <motion.svg
                    className="w-10 h-10 text-indigo-600"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </motion.svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Importing Leads...</h3>
                <div className="w-full max-w-md mx-auto h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {importProgress}% complete • {importResults.success} imported • {importResults.failed} failed
                </p>
              </div>
            )}

            {/* Complete Step */}
            {step === "complete" && (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    importResults.success > 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                  }`}
                >
                  {importResults.success > 0 ? (
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {importResults.success > 0 ? "Import Complete!" : "Import Failed"}
                </h3>
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                    <div className="text-sm text-gray-500">Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                    <div className="text-sm text-gray-500">Failed</div>
                  </div>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="mt-4 text-left max-w-md mx-auto">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent errors:</div>
                    <div className="space-y-1">
                      {importResults.errors.map((err, i) => (
                        <div key={i} className="text-xs text-red-600 dark:text-red-400">{err}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            {step === "upload" && (
              <button onClick={handleClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Cancel
              </button>
            )}
            {step === "map" && (
              <>
                <button onClick={reset} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900">
                  ← Back
                </button>
                <button
                  onClick={() => setStep("preview")}
                  disabled={!mappings.some((m) => m.leadField)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Preview Import
                </button>
              </>
            )}
            {step === "preview" && (
              <>
                <button onClick={() => setStep("map")} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900">
                  ← Back
                </button>
                <button
                  onClick={handleImport}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors"
                >
                  Import {csvData.rows.length} Leads
                </button>
              </>
            )}
            {step === "importing" && (
              <div className="w-full text-center text-sm text-gray-500">Please wait...</div>
            )}
            {step === "complete" && (
              <div className="w-full flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
