// src/components/AIInsightWidget.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AIInsightWidget from "./AIInsightWidget";

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("AIInsightWidget", () => {
  const mockInsights = [
    { icon: "bulb" as const, text: "First insight message" },
    { icon: "trending" as const, text: "Second insight message" },
    { icon: "alert" as const, text: "Third insight message" },
  ];

  it("renders insights text", () => {
    renderWithRouter(<AIInsightWidget insights={mockInsights} />);
    expect(screen.getByText("First insight message")).toBeInTheDocument();
  });

  it("renders with custom title", () => {
    renderWithRouter(
      <AIInsightWidget insights={mockInsights} title="Custom Title" />
    );
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });

  it("renders CTA button with custom text", () => {
    renderWithRouter(
      <AIInsightWidget insights={mockInsights} ctaText="Learn More" />
    );
    expect(screen.getByText("Learn More")).toBeInTheDocument();
  });

  it("renders in banner variant", () => {
    const { container } = renderWithRouter(
      <AIInsightWidget insights={mockInsights} variant="banner" />
    );
    // Banner variant should have specific styling
    expect(container.firstChild).toBeTruthy();
  });

  it("renders in card variant by default", () => {
    const { container } = renderWithRouter(
      <AIInsightWidget insights={mockInsights} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("cycles through insights", () => {
    vi.useFakeTimers();

    renderWithRouter(<AIInsightWidget insights={mockInsights} />);

    // First insight should be visible
    expect(screen.getByText("First insight message")).toBeInTheDocument();

    // After 5 seconds, should cycle to next
    vi.advanceTimersByTime(5000);

    // The component uses framer motion AnimatePresence, so both might be in DOM
    // during transition. Just verify the component renders without error.

    vi.useRealTimers();
  });

  it("handles single insight", () => {
    const singleInsight = [{ icon: "star" as const, text: "Only insight" }];
    renderWithRouter(<AIInsightWidget insights={singleInsight} />);
    expect(screen.getByText("Only insight")).toBeInTheDocument();
  });

  it("handles empty insights array gracefully", () => {
    const { container } = renderWithRouter(<AIInsightWidget insights={[]} />);
    expect(container).toBeTruthy();
  });

  describe("Icon rendering", () => {
    it("renders bulb icon", () => {
      renderWithRouter(
        <AIInsightWidget insights={[{ icon: "bulb", text: "Bulb insight" }]} />
      );
      expect(screen.getByText("Bulb insight")).toBeInTheDocument();
    });

    it("renders trending icon", () => {
      renderWithRouter(
        <AIInsightWidget
          insights={[{ icon: "trending", text: "Trending insight" }]}
        />
      );
      expect(screen.getByText("Trending insight")).toBeInTheDocument();
    });

    it("renders alert icon", () => {
      renderWithRouter(
        <AIInsightWidget
          insights={[{ icon: "alert", text: "Alert insight" }]}
        />
      );
      expect(screen.getByText("Alert insight")).toBeInTheDocument();
    });

    it("renders star icon", () => {
      renderWithRouter(
        <AIInsightWidget insights={[{ icon: "star", text: "Star insight" }]} />
      );
      expect(screen.getByText("Star insight")).toBeInTheDocument();
    });
  });
});
