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
        <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.6" />
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

        {/* Projection zone pattern */}
        <pattern id="diagonal-stripe" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="1.5" opacity="0.3" />
        </pattern>
        <pattern id="diagonal-stripe-purple" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#a855f7" strokeWidth="1.5" opacity="0.35" />
        </pattern>

        {/* Arrowhead Markers for Predicted Direction Path */}
        <marker id="arrow-target-bullish" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
        </marker>
        <marker id="arrow-target-bearish" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
        </marker>
        <marker id="arrow-projected-gold" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
        </marker>
      </defs>

      {patterns.map((pattern) => {
        const isBullish = pattern.direction === "BULLISH";
        const isBearish = pattern.direction === "BEARISH";
        const isForming = pattern.state === "FORMING";
        const isDeveloping = pattern.state === "DEVELOPING";
        const isConfirmed = pattern.state === "CONFIRMED";

        const mainColor = isForming ? "#c084fc" : isDeveloping ? "#38bdf8" : isBullish ? "#10b981" : isBearish ? "#f43f5e" : "#f59e0b";
        const fillColor = isBullish
          ? "url(#harmonic-gradient-bullish)"
          : isBearish
          ? "url(#harmonic-gradient-bearish)"
          : "url(#harmonic-gradient-neutral)";

        // Convert key points (historical actual structure) to screen coordinates
        const points: PointCoordinate[] = [];
        for (const kp of pattern.keyPoints) {
          const x = coordinateConverter.timeToX(kp.timestamp);
          const y = coordinateConverter.priceToY(kp.price);
          if (x !== null && y !== null) {
            points.push({ x, y, label: kp.label, price: kp.price });
          }
        }

        const proj = pattern.projection;

        return (
          <g key={pattern.id} className="transition-all duration-200">
            {/* 1. HARMONIC PATTERN GEOMETRY (X-A-B-C-D Polygons) */}
            {pattern.family === "HARMONIC" && (
              <>
                {points.length === 5 && (
                  <>
                    <polygon
                      points={`${points[0].x},${points[0].y} ${points[1].x},${points[1].y} ${points[2].x},${points[2].y}`}
                      fill={fillColor}
                      stroke={mainColor}
                      strokeWidth="2"
                    />
                    <polygon
                      points={`${points[2].x},${points[2].y} ${points[3].x},${points[3].y} ${points[4].x},${points[4].y}`}
                      fill={fillColor}
                      stroke={mainColor}
                      strokeWidth="2"
                    />
                  </>
                )}
                {points.length === 4 && (
                  // Developing X-A-B-C (historical confirmed legs)
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={mainColor}
                    strokeWidth="2.5"
                    strokeDasharray="none"
                  />
                )}
              </>
            )}

            {/* 2. CLASSICAL CHART PATTERNS (H&S, Double Top/Bottom, Triangles, Wedges, Cup & Handle) */}
            {pattern.family === "CLASSICAL_CHART" && (
              <>
                {/* Connect actual historical key points with solid/distinguished lines */}
                {points.length >= 2 && (
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={mainColor}
                    strokeWidth="2.5"
                    strokeDasharray={isForming ? "4,3" : "none"}
                  />
                )}

                {/* Neckline / Rim Resistance Line - spans strictly across pattern candles */}
                {pattern.levels.neckline && (
                  (() => {
                    const yNeck = coordinateConverter.priceToY(pattern.levels.neckline);
                    if (yNeck === null || points.length === 0) return null;
                    const xStart = points[0].x;
                    const xEnd = points[points.length - 1].x;
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
                        <rect x={xEnd - 70} y={yNeck - 12} width="68" height="18" rx="4" fill="#78350f" opacity="0.9" />
                        <text x={xEnd - 36} y={yNeck} fill="#fef3c7" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                          Rim/Neck {pattern.levels.neckline.toFixed(1)}
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* Upper and Lower Boundaries (Triangles / Wedges) - spans strictly across pattern candles */}
                {pattern.levels.upperBoundary && pattern.levels.lowerBoundary && (
                  (() => {
                    const yUpper = coordinateConverter.priceToY(pattern.levels.upperBoundary);
                    const yLower = coordinateConverter.priceToY(pattern.levels.lowerBoundary);
                    if (yUpper === null || yLower === null || points.length === 0) return null;
                    const xStart = points[0].x;
                    const xEnd = points[points.length - 1].x;
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

            {/* 3. CANDLESTICK HIGHLIGHT */}
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

            {/* ================================================================= */}
            {/* FORWARD-LOOKING PROJECTIONS (Rendered in Future Space to Right)   */}
            {/* ================================================================= */}
            {proj && (
              <g className="projection-layer">
                {/* A. Completion Zone (Shaded Area in Future Chart Space) */}
                {proj.completionZone && (
                  (() => {
                    const xStart = coordinateConverter.timeToX(proj.completionZone.startTs);
                    const xEnd = coordinateConverter.timeToX(proj.completionZone.endTs);
                    const yTop = coordinateConverter.priceToY(proj.completionZone.max);
                    const yBottom = coordinateConverter.priceToY(proj.completionZone.min);

                    if (xStart === null || xEnd === null || yTop === null || yBottom === null) return null;
                    const zoneW = Math.max(30, xEnd - xStart);
                    const zoneH = Math.max(16, yBottom - yTop);

                    return (
                      <g>
                        <rect
                          x={xStart}
                          y={yTop}
                          width={zoneW}
                          height={zoneH}
                          rx="4"
                          fill="url(#diagonal-stripe)"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeDasharray="4,3"
                          opacity="0.8"
                        />
                        <rect x={xStart + 4} y={yTop - 16} width={Math.min(180, (proj.completionZone.label?.length || 15) * 6.5)} height="16" rx="3" fill="#0c4a6e" opacity="0.95" />
                        <text x={xStart + 8} y={yTop - 7} fill="#7dd3fc" fontSize="9" fontWeight="bold" dominantBaseline="middle">
                          {proj.completionZone.label || "Potential Completion Zone"}
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* B. Projected Trajectory Lines (Dashed/Dotted Lines Extending Forward) */}
                {proj.projectedLines &&
                  proj.projectedLines.map((line, lIdx) => {
                    const x1 = coordinateConverter.timeToX(line.from.timestamp);
                    const y1 = coordinateConverter.priceToY(line.from.price);
                    const x2 = coordinateConverter.timeToX(line.to.timestamp);
                    const y2 = coordinateConverter.priceToY(line.to.price);

                    if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

                    return (
                      <g key={`proj-line-${lIdx}`}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={line.color || (isBullish ? "#10b981" : isBearish ? "#f43f5e" : "#f59e0b")}
                          strokeWidth="2"
                          strokeDasharray={line.style === "dotted" ? "2,3" : "5,4"}
                          markerEnd={lIdx === proj.projectedLines!.length - 1 ? (isBullish ? "url(#arrow-target-bullish)" : "url(#arrow-target-bearish)") : undefined}
                        />
                        {line.label && (
                          <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 10})`}>
                            <rect x="-35" y="-7" width="70" height="14" rx="3" fill="#0f172a" opacity="0.85" />
                            <text x="0" y="0" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                              {line.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                {/* C. Projected Future Key Points (Distinct Hollow/Dashed Circles) */}
                {proj.projectedPoints &&
                  proj.projectedPoints.map((pt, pIdx) => {
                    const x = coordinateConverter.timeToX(pt.timestamp);
                    const y = coordinateConverter.priceToY(pt.price);
                    if (x === null || y === null) return null;

                    const ptColor = pt.type === "TARGET" ? (isBullish ? "#10b981" : "#f43f5e") : pt.type === "BREAKOUT" ? "#f59e0b" : "#38bdf8";

                    return (
                      <g key={`proj-pt-${pIdx}`}>
                        {/* Outer pulsating projected ring */}
                        <circle cx={x} cy={y} r="7" fill="none" stroke={ptColor} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.9" />
                        <circle cx={x} cy={y} r="3" fill={ptColor} />

                        {/* Label Badge */}
                        <g transform={`translate(${x}, ${y - 20})`}>
                          <rect
                            x={-Math.max(40, pt.label.length * 3.5)}
                            y="-9"
                            width={Math.max(80, pt.label.length * 7)}
                            height="18"
                            rx="4"
                            fill="#0b1329"
                            stroke={ptColor}
                            strokeWidth="1"
                          />
                          <text x="0" y="0" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                            {pt.label} (${pt.price.toFixed(1)})
                          </text>
                        </g>
                      </g>
                    );
                  })}

                {/* D. Lifecycle State & Completeness Banner */}
                {points.length > 0 && (
                  (() => {
                    const firstPt = points[0];
                    const bannerText = `${pattern.name} · ${pattern.state} (${pattern.completenessScore ?? pattern.progress?.percentage ?? 50}%)`;
                    const bannerBg = isForming ? "#581c87" : isDeveloping ? "#075985" : isConfirmed ? "#064e3b" : "#1e293b";
                    const bannerBorder = isForming ? "#c084fc" : isDeveloping ? "#38bdf8" : isConfirmed ? "#10b981" : "#64748b";

                    return (
                      <g transform={`translate(${Math.max(30, firstPt.x - 20)}, ${Math.max(25, firstPt.y - 35)})`}>
                        <rect width={bannerText.length * 6.5 + 16} height="20" rx="4" fill={bannerBg} stroke={bannerBorder} strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))" />
                        <text x={(bannerText.length * 6.5 + 16) / 2} y="10" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                          {bannerText}
                        </text>
                      </g>
                    );
                  })()
                )}
              </g>
            )}

            {/* TARGET LEVEL HORIZONTAL BAR - strictly bounded to pattern candle range */}
            {pattern.levels.target1 && !proj && (
              (() => {
                const yTarget = coordinateConverter.priceToY(pattern.levels.target1);
                if (yTarget === null || points.length === 0) return null;
                const lastPt = points[points.length - 1];
                const startX = points[0].x;
                const targetX = lastPt.x;

                return (
                  <g>
                    <line
                      x1={startX}
                      y1={yTarget}
                      x2={targetX}
                      y2={yTarget}
                      stroke={isBullish ? "#10b981" : "#f43f5e"}
                      strokeWidth="1.5"
                      strokeDasharray="5,4"
                    />
                    <g transform={`translate(${Math.max(10, targetX - 110)}, ${yTarget - 11})`}>
                      <rect width="110" height="20" rx="4" fill={isBullish ? "#064e3b" : "#881337"} stroke={isBullish ? "#10b981" : "#f43f5e"} strokeWidth="1" />
                      <text x="55" y="10" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                        {isBullish ? "▲ Target: $" : "▼ Target: $"}{pattern.levels.target1.toFixed(1)}
                      </text>
                    </g>
                  </g>
                );
              })()
            )}

            {/* ACTUAL CONFIRMED HISTORICAL KEY POINTS (Solid circles & labels) */}
            {points.map((pt, idx) => (
              <g key={`kp-${idx}`}>
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
                      x={pt.x - Math.max(16, pt.label.length * 3.2)}
                      y={pt.y - 24}
                      width={Math.max(32, pt.label.length * 6.4)}
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
