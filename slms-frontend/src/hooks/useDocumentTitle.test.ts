// src/hooks/useDocumentTitle.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it("sets document title with suffix", () => {
    renderHook(() => useDocumentTitle("Dashboard"));
    expect(document.title).toBe("Dashboard | Site2CRM");
  });

  it("updates title when value changes", () => {
    const { rerender } = renderHook(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: "Page 1" } }
    );

    expect(document.title).toBe("Page 1 | Site2CRM");

    rerender({ title: "Page 2" });
    expect(document.title).toBe("Page 2 | Site2CRM");
  });

  it("handles empty string - falls back to base title", () => {
    renderHook(() => useDocumentTitle(""));
    // Empty string is falsy, so it defaults to just the base title
    expect(document.title).toBe("Site2CRM");
  });

  it("handles special characters", () => {
    renderHook(() => useDocumentTitle("Settings & Preferences"));
    expect(document.title).toBe("Settings & Preferences | Site2CRM");
  });
});
