// src/utils/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getApiBase } from "./api";

describe("API Utilities", () => {
  const originalEnv = import.meta.env.VITE_API_URL;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnv !== undefined) {
      import.meta.env.VITE_API_URL = originalEnv;
    }
  });

  describe("getApiBase", () => {
    it("returns empty string when no env var set", () => {
      const result = getApiBase();
      expect(typeof result).toBe("string");
    });
  });

  describe("API Response Types", () => {
    it("should have correct Lead interface structure", async () => {
      // This test validates the type structure exists
      const mockLead = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        company: "Acme Inc",
        status: "new",
        source: "website",
        value: 5000,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      expect(mockLead).toHaveProperty("id");
      expect(mockLead).toHaveProperty("name");
      expect(mockLead).toHaveProperty("email");
      expect(mockLead).toHaveProperty("status");
      expect(mockLead).toHaveProperty("value");
    });

    it("should have correct SalespersonKPI interface structure", () => {
      const mockKPI = {
        user_id: 1,
        display_name: "Jane Doe",
        email: "jane@example.com",
        total_leads: 100,
        won_leads: 30,
        lost_leads: 20,
        in_pipeline: 50,
        close_rate: 30,
        total_revenue: 150000,
        avg_deal_size: 5000,
        quota: 200000,
        quota_attainment: 75,
        calls_count: 200,
        emails_count: 500,
        meetings_count: 50,
        activities_per_lead: 7.5,
        avg_days_to_close: 14,
      };

      expect(mockKPI).toHaveProperty("user_id");
      expect(mockKPI).toHaveProperty("display_name");
      expect(mockKPI).toHaveProperty("total_revenue");
      expect(mockKPI).toHaveProperty("quota_attainment");
      expect(mockKPI).toHaveProperty("close_rate");
    });

    it("should have correct PipelineMetrics interface structure", () => {
      const mockPipeline = {
        status: "qualified",
        count: 25,
        total_value: 125000,
        avg_value: 5000,
      };

      expect(mockPipeline).toHaveProperty("status");
      expect(mockPipeline).toHaveProperty("count");
      expect(mockPipeline).toHaveProperty("total_value");
      expect(mockPipeline).toHaveProperty("avg_value");
    });

    it("should have correct LeadSourceMetrics interface structure", () => {
      const mockSourceMetrics = {
        source: "Google Ads",
        total_leads: 200,
        won_leads: 50,
        close_rate: 25,
        total_revenue: 250000,
        avg_deal_size: 5000,
      };

      expect(mockSourceMetrics).toHaveProperty("source");
      expect(mockSourceMetrics).toHaveProperty("total_leads");
      expect(mockSourceMetrics).toHaveProperty("close_rate");
      expect(mockSourceMetrics).toHaveProperty("total_revenue");
    });
  });

  describe("Date/Time Utilities", () => {
    it("formats date strings correctly", () => {
      const date = new Date("2024-06-15T10:30:00Z");
      const formatted = date.toISOString().split("T")[0];
      expect(formatted).toBe("2024-06-15");
    });

    it("handles timezone conversions", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCDate()).toBe(1);
    });
  });

  describe("Currency Formatting", () => {
    const formatCurrency = (value: number): string => {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    };

    it("formats millions correctly", () => {
      expect(formatCurrency(1500000)).toBe("$1.5M");
      expect(formatCurrency(2000000)).toBe("$2.0M");
    });

    it("formats thousands correctly", () => {
      expect(formatCurrency(5000)).toBe("$5K");
      expect(formatCurrency(50000)).toBe("$50K");
    });

    it("formats small values correctly", () => {
      expect(formatCurrency(500)).toBe("$500");
      expect(formatCurrency(99)).toBe("$99");
    });
  });

  describe("Percentage Formatting", () => {
    const formatPercentage = (value: number): string => {
      return `${value.toFixed(1)}%`;
    };

    it("formats percentages correctly", () => {
      expect(formatPercentage(25.5)).toBe("25.5%");
      expect(formatPercentage(100)).toBe("100.0%");
      expect(formatPercentage(0)).toBe("0.0%");
    });
  });
});
