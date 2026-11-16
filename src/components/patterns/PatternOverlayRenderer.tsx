import React from "react";
import { DetectedPattern } from "../../services/patternEngine/types/pattern";

interface PointCoordinate {
  x: number;
  y: number;
  label?: string;
  price?: number;
}

interface PatternOverlayRendererProps {
  patterns: DetectedPattern[];
  coordinateConverter: {
    timeToX: (time: number) => number | null;
    priceToY: (price: number) => number | null;
  };
  width: number;
  height: number;
}

export const PatternOverlayRenderer: React.FC<PatternOverlayRendererProps> = ({
  patterns,
  coordinateConverter,
  width,
  height,
}) => {
  if (patterns.length === 0 || width <= 0 || height <= 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        {/* Glow Filters */}
        <filter id="glow-bullish" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
        </filter>
        <filter id="glow-bearish" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.6" />
        </filter>
        <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.6" />
        </filter>

        <linearGradient id="harmonic-gradient-bullish" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="harmonic-gradient-bearish" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="harmonic-gradient-neutral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0.1" />
        </linearGradient>
        {/* Arrowhead Markers for Predicted Direction Path */}
        <marker id="arrow-target-bullish" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
        </marker>
        <marker id="arrow-target-bearish" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
        </marker>
      </defs>

      {patterns.map((pattern) => {
        const isBullish = pattern.direction === "BULLISH";
        const isBearish = pattern.direction === "BEARISH";
        const mainColor = isBullish ? "#10b981" : isBearish ? "#f43f5e" : "#f59e0b";
        const fillColor = isBullish
          ? "url(#harmonic-gradient-bullish)"
          : isBearish
          ? "url(#harmonic-gradient-bearish)"
          : "url(#harmonic-gradient-neutral)";

        // Convert key points to screen coordinates
        const points: PointCoordinate[] = [];
        for (const kp of pattern.keyPoints) {
          const x = coordinateConverter.timeToX(kp.timestamp);
          const y = coordinateConverter.priceToY(kp.price);
          if (x !== null && y !== null) {
            points.push({ x, y, label: kp.label, price: kp.price });
          }
        }

        return (
          <g key={pattern.id} className="transition-all duration-200">
            {/* 1. HARMONIC PATTERN GEOMETRY (X-A-B-C-D Polygons) */}
            {pattern.family === "HARMONIC" && points.length >= 4 && (
              <>
                {points.length === 5 && (
                  // Two triangles: X-A-B and B-C-D
                  <>
                    <polygon
                      points={`${points[0].x},${points[0].y} ${points[1].x},${points[1].y} ${points[2].x},${points[2].y}`}
                      fill={fillColor}
                      stroke={mainColor}
                      strokeWidth="2"
                      strokeDasharray={pattern.state === "DEVELOPING" ? "4,4" : "none"}
                    />
                    <polygon
                      points={`${points[2].x},${points[2].y} ${points[3].x},${points[3].y} ${points[4].x},${points[4].y}`}
                      fill={fillColor}
                      stroke={mainColor}
                      strokeWidth="2"
                      strokeDasharray={pattern.state === "DEVELOPING" ? "4,4" : "none"}
                    />
                  </>
                )}
                {points.length === 4 && (
                  // AB=CD path
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={mainColor}
                    strokeWidth="2.5"
                    strokeDasharray={pattern.state === "DEVELOPING" ? "4,4" : "none"}
                  />
                )}
              </>
            )}

            {/* 2. CLASSICAL CHART PATTERNS (H&S, Double Top/Bottom, Triangles, Wedges) */}
            {pattern.family === "CLASSICAL_CHART" && (
              <>
                {/* Connect key peaks & valleys */}
                {points.length >= 2 && (
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={mainColor}
                    strokeWidth="2"
                    strokeDasharray={pattern.state === "DEVELOPING" ? "5,4" : "none"}
                  />
                )}

                {/* Neckline or Horizontal Boundary */}
                {pattern.levels.neckline && (
                  (() => {
                    const yNeck = coordinateConverter.priceToY(pattern.levels.neckline);
                    if (yNeck === null) return null;
                    const xStart = points[0]?.x ?? 40;
                    const xEnd = Math.max(width - 80, points[points.length - 1]?.x ?? width);
                    return (
                      <g>
                        <line
                          x1={xStart}
                          y1={yNeck}
                          x2={xEnd}
                          y2={yNeck}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="6,4"
                        />
                        <rect x={xEnd - 75} y={yNeck - 12} width="70" height="18" rx="4" fill="#78350f" opacity="0.9" />
                        <text x={xEnd - 40} y={yNeck} fill="#fef3c7" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                          Neckline {pattern.levels.neckline.toFixed(1)}
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* Upper and Lower Boundaries (Triangles / Wedges) */}
                {pattern.levels.upperBoundary && pattern.levels.lowerBoundary && (
                  (() => {
                    const yUpper = coordinateConverter.priceToY(pattern.levels.upperBoundary);
                    const yLower = coordinateConverter.priceToY(pattern.levels.lowerBoundary);
                    if (yUpper === null || yLower === null) return null;
                    const xStart = points[0]?.x ?? 60;
                    const xEnd = Math.max(width - 60, points[points.length - 1]?.x ?? width);
                    return (
                      <g>
                        <line x1={xStart} y1={yUpper} x2={xEnd} y2={yUpper} stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="5,4" />
                        <line x1={xStart} y1={yLower} x2={xEnd} y2={yLower} stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="5,4" />
                      </g>
                    );
                  })()
                )}
              </>
            )}

            {/* 3. CANDLESTICK HIGHLIGHT (Box around constituent candle sequence) */}
            {pattern.family === "CANDLESTICK" && points.length > 0 && (
              (() => {
                const xs = points.map((p) => p.x);
                const ys = points.map((p) => p.y);
                const minX = Math.min(...xs) - 14;
                const maxX = Math.max(...xs) + 14;
                const minY = Math.min(...ys) - 18;
                const maxY = Math.max(...ys) + 18;
                const boxW = Math.max(28, maxX - minX);
                const boxH = Math.max(36, maxY - minY);

                return (
                  <g>
                    <rect
                      x={minX}
                      y={minY}
                      width={boxW}
                      height={boxH}
                      rx="6"
                      fill={mainColor}
                      fillOpacity="0.12"
                      stroke={mainColor}
                      strokeWidth="1.8"
                      strokeDasharray="4,3"
                    />
                    <rect x={minX} y={minY - 20} width={Math.max(80, pattern.name.length * 7)} height="18" rx="4" fill="#0f172a" opacity="0.9" />
                    <text x={minX + 6} y={minY - 9} fill={mainColor} fontSize="10" fontWeight="bold" dominantBaseline="middle">
                      {pattern.name}
                    </text>
                  </g>
                );
              })()
            )}

            {/* 4. MARKET STRUCTURE (BOS / CHoCH Lines & Swing Dots) */}
            {pattern.family === "MARKET_STRUCTURE" && (
              <>
                {pattern.levels.breakoutLevel && (
                  (() => {
                    const yLevel = coordinateConverter.priceToY(pattern.levels.breakoutLevel);
                    if (yLevel === null) return null;
                    const xStart = points[0]?.x ?? 40;
                    const xEnd = width - 80;
                    return (
                      <g>
                        <line x1={xStart} y1={yLevel} x2={xEnd} y2={yLevel} stroke={mainColor} strokeWidth="1.8" strokeDasharray="4,4" />
                        <rect x={xStart + 10} y={yLevel - 11} width="65" height="16" rx="4" fill={mainColor} />
                        <text x={xStart + 42} y={yLevel} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                          {pattern.pattern.includes("BOS") ? "BOS" : "CHoCH"} {pattern.levels.breakoutLevel.toFixed(1)}
                        </text>
                      </g>
                    );
                  })()
                )}
              </>
            )}

            {/* EXPECTED MOVE DIRECTION VECTOR & TARGET LEVELS */}
            {pattern.levels.target1 && (
              (() => {
                const yTarget = coordinateConverter.priceToY(pattern.levels.target1);
                if (yTarget === null) return null;
                const lastPt = points[points.length - 1];
                const startX = lastPt ? lastPt.x : width / 2;
                const startY = lastPt ? lastPt.y : yTarget;
                const targetX = Math.min(width - 40, startX + 90);

                return (
                  <g>
                    {/* Projected Trajectory Vector Path */}
                    <line
                      x1={startX}
                      y1={startY}
                      x2={targetX}
                      y2={yTarget}
                      stroke={isBullish ? "#10b981" : isBearish ? "#f43f5e" : "#f59e0b"}
                      strokeWidth="2.5"
                      strokeDasharray="5,4"
                      markerEnd={isBullish ? "url(#arrow-target-bullish)" : isBearish ? "url(#arrow-target-bearish)" : undefined}
                    />

                    {/* Target Horizontal Reference Line */}
                    <line x1={startX} y1={yTarget} x2={width - 20} y2={yTarget} stroke={isBullish ? "#10b981" : "#f43f5e"} strokeWidth="1.2" strokeDasharray="3,3" opacity="0.7" />

                    {/* Target Pill with Expected Direction */}
                    <g transform={`translate(${Math.max(20, targetX - 50)}, ${yTarget - 12})`}>
                      <rect width="135" height="22" rx="5" fill={isBullish ? "#064e3b" : "#881337"} stroke={isBullish ? "#10b981" : "#f43f5e"} strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))" />
                      <text x="67" y="11" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                        {isBullish ? "▲ Expected: $" : "▼ Expected: $"}{pattern.levels.target1.toFixed(1)}
                      </text>
                    </g>
                  </g>
                );
              })()
            )}

            {pattern.levels.stopLoss && (
              (() => {
                const ySl = coordinateConverter.priceToY(pattern.levels.stopLoss);
                if (ySl === null) return null;
                const lastPt = points[points.length - 1];
                const startX = lastPt ? lastPt.x : 40;

                return (
                  <g>
                    <line x1={startX} y1={ySl} x2={width - 20} y2={ySl} stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="4,4" opacity="0.6" />
                    <g transform={`translate(${width - 120}, ${ySl - 10})`}>
                      <rect width="95" height="18" rx="4" fill="#450a0a" stroke="#f43f5e" strokeWidth="0.8" opacity="0.9" />
                      <text x="47" y="9" fill="#fecdd3" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                        Stop Loss: ${pattern.levels.stopLoss.toFixed(1)}
                      </text>
                    </g>
                  </g>
                );
              })()
            )}

            {/* KEY POINT CIRCLES & LABELS */}
            {points.map((pt, idx) => (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#0f172a"
                  stroke={mainColor}
                  strokeWidth="2.5"
                />
                {pt.label && (
                  <g>
                    <rect
                      x={pt.x - 14}
                      y={pt.y - 24}
                      width="28"
                      height="16"
                      rx="4"
                      fill="#0f172a"
                      stroke={mainColor}
                      strokeWidth="1"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 15}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {pt.label}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
};
