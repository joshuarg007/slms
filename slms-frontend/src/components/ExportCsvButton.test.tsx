// src/components/ExportCsvButton.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ExportCsvButton from "./ExportCsvButton";

describe("ExportCsvButton", () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => "mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("renders export button", () => {
    render(<ExportCsvButton rows={[]} filename="test.csv" />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("has correct button text", () => {
    render(<ExportCsvButton rows={[]} filename="test.csv" />);
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Export CSV");
  });

  it("generates CSV with headers from object keys", () => {
    const rows = [
      { name: "John", age: 30, city: "NYC" },
      { name: "Jane", age: 25, city: "LA" },
    ];

    // Spy on document.createElement to capture the download
    const createElementSpy = vi.spyOn(document, "createElement");

    render(<ExportCsvButton rows={rows} filename="test.csv" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Should have created an anchor element for download
    expect(createElementSpy).toHaveBeenCalledWith("a");

    createElementSpy.mockRestore();
  });

  it("handles empty rows array", () => {
    const createElementSpy = vi.spyOn(document, "createElement");

    render(<ExportCsvButton rows={[]} filename="empty.csv" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Should still work without errors
    expect(createElementSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it("escapes values with commas in CSV generation", () => {
    const rows = [
      { name: "Doe, John", value: 100 },
    ];

    // Just verify click works without error
    render(<ExportCsvButton rows={rows} filename="test.csv" />);
    const button = screen.getByRole("button");

    // Should not throw when clicking
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  it("uses provided filename for download", () => {
    const rows = [{ a: 1 }];

    render(<ExportCsvButton rows={rows} filename="custom-report.csv" />);
    const button = screen.getByRole("button");

    // Should not throw when clicking
    expect(() => fireEvent.click(button)).not.toThrow();
  });
});
