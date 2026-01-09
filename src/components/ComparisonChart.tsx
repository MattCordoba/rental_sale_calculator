import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

type ChartPoint = {
  age: number;
  currentValue: number;
  newValue: number;
};

const formatCompactUSD = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const format = (num: number, suffix: string) => {
    const rounded = Math.round(num * 100) / 100;
    return `${sign}$${rounded.toFixed(2)}${suffix}`;
  };
  if (abs >= 1_000_000_000) return format(abs / 1_000_000_000, "B");
  if (abs >= 1_000_000) return format(abs / 1_000_000, "M");
  if (abs >= 1_000) return format(abs / 1_000, "K");
  return `${sign}$${Math.round(abs)}`;
};

const buildTicks = (min: number, max: number, count: number) => {
  if (count <= 1) return [min, max];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
};

declare global {
  interface Window {
    echarts?: {
      init: (el: HTMLDivElement) => { setOption: (option: unknown) => void; dispose: () => void };
    };
  }
}

export default function ComparisonChart({
  data,
  tone = "dark",
}: {
  data: ChartPoint[];
  tone?: "dark" | "light";
}) {
  const { points, minY, maxY, minX, maxX } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], minY: 0, maxY: 1, minX: 0, maxX: 1 };
    }

    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    let minAge = data[0].age;
    let maxAge = data[data.length - 1].age;

    data.forEach((point) => {
      minValue = Math.min(minValue, point.currentValue, point.newValue);
      maxValue = Math.max(maxValue, point.currentValue, point.newValue);
      minAge = Math.min(minAge, point.age);
      maxAge = Math.max(maxAge, point.age);
    });

    const padding = (maxValue - minValue) * 0.08 || 1;
    return {
      points: data,
      minY: minValue - padding,
      maxY: maxValue + padding,
      minX: minAge,
      maxX: maxAge,
    };
  }, [data]);

  const width = 680;
  const height = 360;
  const padding = { top: 24, right: 24, bottom: 40, left: 64 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const scaleX = (age: number) =>
    padding.left + ((age - minX) / (maxX - minX || 1)) * innerWidth;
  const scaleY = (value: number) =>
    padding.top + (1 - (value - minY) / (maxY - minY || 1)) * innerHeight;

  const pathFor = (key: "currentValue" | "newValue") =>
    points
      .map((point, index) => {
        const x = scaleX(point.age);
        const y = scaleY(point[key]);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  const yTicks = buildTicks(minY, maxY, 5);
  const xTicks = buildTicks(minX, maxX, Math.min(6, points.length));

  const textClass = tone === "light" ? "text-slate-800/70" : "text-white/40";
  const titleClass = tone === "light" ? "text-slate-900" : "text-white";
  const legendTextClass = tone === "light" ? "text-slate-700" : "text-white/60";
  const gridColor = tone === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255,0.06)";
  const axisText = tone === "light" ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.5)";

  const chartRef = useRef<HTMLDivElement | null>(null);
  const [echartsReady, setEchartsReady] = useState(false);

  useEffect(() => {
    if (tone === "light") return;
    if (!echartsReady || !chartRef.current || !window.echarts) return;
    const chart = window.echarts.init(chartRef.current);
    const option = {
      backgroundColor: "transparent",
      color: ["#7dd3fc", "#fcd34d"],
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        borderColor: "rgba(255,255,255,0.1)",
        textStyle: { color: "#fff" },
        formatter: (params: { axisValue: number; value: number; seriesName: string }[]) => {
          const lines = params.map(
            (item) =>
              `${item.seriesName}: ${formatCompactUSD(item.value)}`
          );
          return `Age ${params[0]?.axisValue}<br/>${lines.join("<br/>")}`;
        },
      },
      grid: { left: 56, right: 24, top: 36, bottom: 48 },
      xAxis: {
        type: "category",
        data: points.map((point) => point.age),
        axisLabel: { color: "rgba(255,255,255,0.6)" },
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "rgba(255,255,255,0.6)",
          formatter: (value: number) => formatCompactUSD(value),
        },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
      },
      series: [
        {
          name: "Current estate value",
          type: "line",
          smooth: true,
          data: points.map((point) => point.currentValue),
        },
        {
          name: "New property net value",
          type: "line",
          smooth: true,
          data: points.map((point) => point.newValue),
        },
      ],
    };
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.setOption(option));
    observer.observe(chartRef.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [echartsReady, points, tone]);

  if (tone !== "light") {
    return (
      <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6">
        <Script
          src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"
          strategy="afterInteractive"
          onLoad={() => setEchartsReady(true)}
        />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Comparison of Options</p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Estate value vs new property strategy
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/60">
            <span className="flex items-center gap-2">
              <span className="h-2 w-6 rounded-full bg-sky-300" /> Current estate value
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-6 rounded-full bg-amber-300" /> New property net value
            </span>
          </div>
        </div>
        <div ref={chartRef} className="mt-6 h-[360px] w-full" />
        {!echartsReady ? (
          <p className="mt-2 text-xs text-white/50">Loading chart…</p>
        ) : null}
        <p className="mt-2 text-xs text-white/40">Age along the horizontal axis.</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-3xl border p-6 ${
        tone === "light" ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs uppercase tracking-[0.3em] ${textClass}`}>
            Comparison of Options
          </p>
          <h3 className={`mt-2 text-lg font-semibold ${titleClass}`}>
            Estate value vs new property strategy
          </h3>
        </div>
        <div className={`flex items-center gap-4 text-xs ${legendTextClass}`}>
          <span className="flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-sky-300" /> Current estate value
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-amber-300" /> New property net value
          </span>
        </div>
      </div>

      <svg className="mt-6 h-[360px] w-full" viewBox={`0 0 ${width} ${height}`}>
        <rect
          x={padding.left}
          y={padding.top}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          stroke={gridColor}
        />
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={scaleY(tick)}
              y2={scaleY(tick)}
              stroke={gridColor}
            />
            <text
              x={padding.left - 12}
              y={scaleY(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fill={axisText}
              fontSize="11"
            >
              {formatCompactUSD(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={scaleX(tick)}
              x2={scaleX(tick)}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke={gridColor}
            />
            <text
              x={scaleX(tick)}
              y={height - padding.bottom + 18}
              textAnchor="middle"
              fill={axisText}
              fontSize="11"
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}
        <path d={pathFor("currentValue")} fill="none" stroke="#7dd3fc" strokeWidth="3" />
        <path d={pathFor("newValue")} fill="none" stroke="#fcd34d" strokeWidth="3" />
      </svg>
      <p className={`mt-2 text-xs ${textClass}`}>Age along the horizontal axis.</p>
    </div>
  );
}
