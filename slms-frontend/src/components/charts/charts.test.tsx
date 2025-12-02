// src/components/charts/charts.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  AnimatedAreaChart,
  AnimatedBarChart,
  RadialGauge,
  Sparkline,
  DonutChart,
  FunnelChart,
  AnimatedMetric,
  ProgressRing,
  ComparisonBar,
  StatTrend,
  CHART_COLORS,
  GRADIENTS,
} from "./index";

describe("Chart Components", () => {
  describe("CHART_COLORS", () => {
    it("should have all required color palettes", () => {
      expect(CHART_COLORS).toHaveProperty("primary");
      expect(CHART_COLORS).toHaveProperty("success");
      expect(CHART_COLORS).toHaveProperty("warning");
      expect(CHART_COLORS).toHaveProperty("danger");
      expect(CHART_COLORS).toHaveProperty("rainbow");
      expect(CHART_COLORS.primary).toHaveLength(4);
      expect(CHART_COLORS.rainbow).toHaveLength(6);
    });
  });

  describe("GRADIENTS", () => {
    it("should have all gradient definitions", () => {
      expect(GRADIENTS).toHaveProperty("indigo");
      expect(GRADIENTS).toHaveProperty("purple");
      expect(GRADIENTS).toHaveProperty("emerald");
      expect(GRADIENTS.indigo).toHaveProperty("start");
      expect(GRADIENTS.indigo).toHaveProperty("end");
    });
  });

  describe("AnimatedAreaChart", () => {
    const mockData = [
      { name: "Jan", value: 100 },
      { name: "Feb", value: 200 },
      { name: "Mar", value: 150 },
    ];

    it("renders without crashing", () => {
      const { container } = render(<AnimatedAreaChart data={mockData} />);
      expect(container).toBeTruthy();
    });

    it("renders with custom height", () => {
      const { container } = render(
        <AnimatedAreaChart data={mockData} height={400} />
      );
      expect(container.firstChild).toHaveStyle({ height: "400px" });
    });

    it("renders with secondary data key", () => {
      const dataWithSecondary = mockData.map((d) => ({
        ...d,
        secondary: d.value * 0.5,
      }));
      const { container } = render(
        <AnimatedAreaChart data={dataWithSecondary} secondaryDataKey="secondary" />
      );
      expect(container).toBeTruthy();
    });
  });

  describe("AnimatedBarChart", () => {
    const mockData = [
      { name: "A", value: 100 },
      { name: "B", value: 200 },
      { name: "C", value: 150 },
    ];

    it("renders without crashing", () => {
      const { container } = render(<AnimatedBarChart data={mockData} />);
      expect(container).toBeTruthy();
    });

    it("renders horizontal bars", () => {
      const { container } = render(
        <AnimatedBarChart data={mockData} horizontal />
      );
      expect(container).toBeTruthy();
    });

    it("renders stacked bars", () => {
      const stackedData = [
        { name: "A", calls: 10, emails: 20, meetings: 5 },
        { name: "B", calls: 15, emails: 25, meetings: 10 },
      ];
      const { container } = render(
        <AnimatedBarChart
          data={stackedData}
          stacked
          stackedKeys={["calls", "emails", "meetings"]}
        />
      );
      expect(container).toBeTruthy();
    });
  });

  describe("RadialGauge", () => {
    it("renders without crashing", () => {
      const { container } = render(<RadialGauge value={75} />);
      expect(container).toBeTruthy();
    });

    it("initially shows 0% before animation", () => {
      render(<RadialGauge value={75} />);
      // Animation starts at 0
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("renders with label and sublabel", () => {
      render(
        <RadialGauge value={60} label="Progress" sublabel="of goal" />
      );
      expect(screen.getByText("Progress")).toBeInTheDocument();
      expect(screen.getByText("of goal")).toBeInTheDocument();
    });

    it("renders with custom size", () => {
      const { container } = render(<RadialGauge value={50} size={150} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: "150px", height: "150px" });
    });
  });

  describe("Sparkline", () => {
    const mockData = [10, 20, 15, 25, 30, 20];

    it("renders without crashing", () => {
      const { container } = render(<Sparkline data={mockData} />);
      expect(container).toBeTruthy();
    });

    it("renders with custom dimensions", () => {
      const { container } = render(
        <Sparkline data={mockData} width={150} height={50} />
      );
      expect(container.firstChild).toHaveStyle({ width: "150px", height: "50px" });
    });

    it("renders filled variant", () => {
      const { container } = render(<Sparkline data={mockData} filled />);
      expect(container).toBeTruthy();
    });
  });

  describe("DonutChart", () => {
    const mockData = [
      { name: "A", value: 30 },
      { name: "B", value: 50 },
      { name: "C", value: 20 },
    ];

    it("renders without crashing", () => {
      const { container } = render(<DonutChart data={mockData} />);
      expect(container).toBeTruthy();
    });

    it("renders with center label", () => {
      render(
        <DonutChart
          data={mockData}
          centerLabel="Total"
          centerValue="100"
        />
      );
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("renders legend items", () => {
      render(<DonutChart data={mockData} showLegend />);
      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument();
    });
  });

  describe("FunnelChart", () => {
    const mockData = [
      { name: "Visitors", value: 1000 },
      { name: "Leads", value: 500 },
      { name: "Qualified", value: 200 },
      { name: "Won", value: 50 },
    ];

    it("renders without crashing", () => {
      const { container } = render(<FunnelChart data={mockData} />);
      expect(container).toBeTruthy();
    });

    it("renders labels", () => {
      render(<FunnelChart data={mockData} showLabels />);
      expect(screen.getByText("Visitors")).toBeInTheDocument();
      expect(screen.getByText("Leads")).toBeInTheDocument();
      expect(screen.getByText("Won")).toBeInTheDocument();
    });

    it("renders values", () => {
      render(<FunnelChart data={mockData} showValues />);
      expect(screen.getByText("1,000")).toBeInTheDocument();
      expect(screen.getByText("500")).toBeInTheDocument();
    });
  });

  describe("AnimatedMetric", () => {
    it("renders label and formatted value", () => {
      render(<AnimatedMetric value={1500} label="Total Sales" />);
      expect(screen.getByText("Total Sales")).toBeInTheDocument();
    });

    it("renders with positive change indicator", () => {
      render(
        <AnimatedMetric value={100} label="Revenue" change={15} changeLabel="vs last month" />
      );
      expect(screen.getByText("15%")).toBeInTheDocument();
      expect(screen.getByText("vs last month")).toBeInTheDocument();
    });

    it("renders with prefix and suffix", () => {
      render(
        <AnimatedMetric value={50} label="Score" prefix="$" suffix="K" />
      );
      expect(screen.getByText("Score")).toBeInTheDocument();
    });
  });

  describe("ProgressRing", () => {
    it("renders without crashing", () => {
      const { container } = render(<ProgressRing progress={65} />);
      expect(container).toBeTruthy();
    });

    it("initially shows 0% before animation", () => {
      render(<ProgressRing progress={65} />);
      // Animation starts at 0
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("renders with label", () => {
      render(<ProgressRing progress={80} label="Complete" />);
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("can hide value", () => {
      render(<ProgressRing progress={50} showValue={false} />);
      // When showValue is false, no percentage should be shown
      expect(screen.queryByText("0%")).not.toBeInTheDocument();
    });
  });

  describe("ComparisonBar", () => {
    it("renders label and formatted value", () => {
      render(
        <ComparisonBar label="Sales" value={750} maxValue={1000} />
      );
      expect(screen.getByText("Sales")).toBeInTheDocument();
      expect(screen.getByText("750")).toBeInTheDocument();
    });

    it("renders with custom format", () => {
      render(
        <ComparisonBar
          label="Revenue"
          value={50000}
          maxValue={100000}
          formatValue={(v) => `$${(v / 1000).toFixed(0)}K`}
        />
      );
      expect(screen.getByText("$50K")).toBeInTheDocument();
    });

    it("can hide value", () => {
      render(
        <ComparisonBar label="Test" value={100} maxValue={200} showValue={false} />
      );
      expect(screen.queryByText("100")).not.toBeInTheDocument();
    });
  });

  describe("StatTrend", () => {
    it("renders label and value", () => {
      render(<StatTrend label="Users" value="1,234" trend={5} />);
      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("shows positive trend indicator", () => {
      render(<StatTrend label="Growth" value="100" trend={12} />);
      expect(screen.getByText("12%")).toBeInTheDocument();
    });

    it("shows negative trend indicator", () => {
      render(<StatTrend label="Churn" value="5%" trend={-3} />);
      expect(screen.getByText("3%")).toBeInTheDocument();
    });

    it("renders trend label", () => {
      render(
        <StatTrend label="Revenue" value="$50K" trend={8} trendLabel="vs Q1" />
      );
      expect(screen.getByText("vs Q1")).toBeInTheDocument();
    });
  });
});
