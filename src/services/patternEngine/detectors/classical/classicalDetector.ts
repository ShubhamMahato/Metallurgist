import { OHLCV, SupportedTimeframe } from "../../types/candle";
import { SwingPoint } from "../../core/swingDetector";
import { DetectedPattern, PatternLifecycleState } from "../../types/pattern";

export class ClassicalPatternDetector {
  public detect(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    timeframe: SupportedTimeframe,
    symbol: string = "XAUUSD",
    activeOnly: boolean = true
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    if (swings.length < 3 || candles.length < 10) return patterns;

    const currentPrice = candles[candles.length - 1].close;
    const currentHigh = candles[candles.length - 1].high;
    const currentLow = candles[candles.length - 1].low;

    // In live scanner (activeOnly = true), focus only on the current market structure (last 2 swings)
    const minSwingStart = activeOnly ? Math.max(0, swings.length - 6) : 0;

    // Scan through sliding windows of swings
    for (let i = minSwingStart; i <= swings.length - 5; i++) {
      const window = swings.slice(i, i + 7); // 5 to 7 swings
      if (activeOnly) {
        const lastInWindow = window[Math.min(4, window.length - 1)];
        // Must touch recent swing structure
        if (swings.indexOf(lastInWindow) < swings.length - 3) continue;
      }

      // 1. Head and Shoulders (High, Low, High, Low, High)
      const hs = this.checkHeadAndShoulders(window, currentPrice, currentHigh, currentLow, symbol, timeframe);
      if (hs) patterns.push(hs);

      // 2. Inverse Head and Shoulders (Low, High, Low, High, Low)
      const ihs = this.checkInverseHeadAndShoulders(window, currentPrice, currentHigh, currentLow, symbol, timeframe);
      if (ihs) patterns.push(ihs);

      // 3. Triangles & Wedges (Ascending, Descending, Symmetrical, Wedges)
      const triangle = this.checkTrianglesAndWedges(window, currentPrice, symbol, timeframe);
      if (triangle) patterns.push(triangle);

      // 4. Broadening Formation
      const broadening = this.checkBroadeningFormation(window, currentPrice, symbol, timeframe);
      if (broadening) patterns.push(broadening);
    }

    // Double & Triple Tops/Bottoms (using 3 to 5 swings)
    const minDoubleStart = activeOnly ? Math.max(0, swings.length - 4) : 0;
    for (let i = minDoubleStart; i <= swings.length - 3; i++) {
      const window = swings.slice(i, i + 5);
      if (activeOnly) {
        const lastInWindow = window[Math.min(2, window.length - 1)];
        if (swings.indexOf(lastInWindow) < swings.length - 3) continue;
      }
      const dt = this.checkDoubleTop(window, currentPrice, currentHigh, symbol, timeframe);
      if (dt) patterns.push(dt);

      const db = this.checkDoubleBottom(window, currentPrice, currentLow, symbol, timeframe);
      if (db) patterns.push(db);

      const tt = this.checkTripleTop(window, currentPrice, currentHigh, symbol, timeframe);
      if (tt) patterns.push(tt);

      const tb = this.checkTripleBottom(window, currentPrice, currentLow, symbol, timeframe);
      if (tb) patterns.push(tb);
    }

    // Flags, Pennants, and Cup & Handle
    const flag = this.checkFlagAndPennants(candles, swings, currentPrice, symbol, timeframe);
    if (flag) patterns.push(...flag);

    const cup = this.checkCupAndHandle(candles, swings, currentPrice, symbol, timeframe);
    if (cup) patterns.push(...cup);

    return patterns;
  }

  // --- Head and Shoulders ---
  private checkHeadAndShoulders(
    w: SwingPoint[],
    currentPrice: number,
    currentHigh: number,
    currentLow: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern | null {
    if (w.length < 5) return null;
    const [p1, p2, p3, p4, p5] = w; // Expected: High, Low, High, Low, High

    if (p1.type !== "HIGH" || p2.type !== "LOW" || p3.type !== "HIGH" || p4.type !== "LOW" || p5.type !== "HIGH") {
      return null;
    }

    const leftShoulder = p1.price;
    const head = p3.price;
    const rightShoulder = p5.price;
    const trough1 = p2.price;
    const trough2 = p4.price;

    // Head must be strictly higher than both shoulders
    if (head <= leftShoulder || head <= rightShoulder) return null;

    // Shoulders should be roughly comparable (within 4% of each other)
    const shoulderDiff = Math.abs(leftShoulder - rightShoulder) / leftShoulder;
    if (shoulderDiff > 0.05) return null;

    // Neckline slope
    const necklinePrice = (trough1 + trough2) / 2;

    // Lifecycle state determination
    let state: PatternLifecycleState = "COMPLETED";
    let progressPct = 80;
    let progressDesc = "Right shoulder formed, awaiting neckline break";

    if (p5.isProvisional) {
      state = "DEVELOPING";
      progressPct = 65;
      progressDesc = "Right shoulder still developing";
    } else if (currentPrice < necklinePrice) {
      state = "CONFIRMED";
      progressPct = 100;
      progressDesc = "Confirmed: Price broke below the neckline";
    }

    if (currentHigh > head) {
      state = "INVALIDATED";
      progressPct = 0;
      progressDesc = "Invalidated: Price broke above the Head peak";
    }

    const patternHeight = head - necklinePrice;
    const targetPrice = necklinePrice - patternHeight;

    return {
      id: `${symbol}-${timeframe}-HS-${p1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "HEAD_AND_SHOULDERS",
      name: "Head and Shoulders",
      direction: "BEARISH",
      state,
      firstDetectedAt: p1.isoTime,
      lastUpdatedAt: p5.isoTime,
      startTime: p1.timestamp,
      endTime: p5.timestamp,
      keyPoints: [
        { label: "Left Shoulder", timestamp: p1.timestamp, price: p1.price },
        { label: "Neckline 1", timestamp: p2.timestamp, price: p2.price },
        { label: "Head", timestamp: p3.timestamp, price: p3.price },
        { label: "Neckline 2", timestamp: p4.timestamp, price: p4.price },
        { label: "Right Shoulder", timestamp: p5.timestamp, price: p5.price, isProvisional: p5.isProvisional },
      ],
      levels: {
        entry: necklinePrice,
        neckline: necklinePrice,
        target1: targetPrice,
        stopLoss: head,
        invalidationLevel: head,
      },
      progress: {
        percentage: progressPct,
        description: progressDesc,
      },
      confirmationCondition: {
        description: `Break below neckline level of ${necklinePrice.toFixed(2)}`,
        priceLevel: necklinePrice,
        operator: "<",
        isMet: currentPrice < necklinePrice,
      },
      invalidationCondition: {
        description: `Price exceeds Head peak at ${head.toFixed(2)}`,
        priceLevel: head,
        operator: ">",
        isMet: currentHigh > head,
      },
    };
  }

  // --- Inverse Head and Shoulders ---
  private checkInverseHeadAndShoulders(
    w: SwingPoint[],
    currentPrice: number,
    currentHigh: number,
    currentLow: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern | null {
    if (w.length < 5) return null;
    const [p1, p2, p3, p4, p5] = w; // Expected: Low, High, Low, High, Low

    if (p1.type !== "LOW" || p2.type !== "HIGH" || p3.type !== "LOW" || p4.type !== "HIGH" || p5.type !== "LOW") {
      return null;
    }

    const leftShoulder = p1.price;
    const head = p3.price;
    const rightShoulder = p5.price;
    const peak1 = p2.price;
    const peak2 = p4.price;

    if (head >= leftShoulder || head >= rightShoulder) return null;
    if (Math.abs(leftShoulder - rightShoulder) / leftShoulder > 0.05) return null;

    const necklinePrice = (peak1 + peak2) / 2;
    let state: PatternLifecycleState = "COMPLETED";
    let progressPct = 80;
    let progressDesc = "Right shoulder formed, awaiting neckline breakout";

    if (p5.isProvisional) {
      state = "DEVELOPING";
      progressPct = 65;
      progressDesc = "Right shoulder trough developing";
    } else if (currentPrice > necklinePrice) {
      state = "CONFIRMED";
      progressPct = 100;
      progressDesc = "Confirmed: Price broke above the neckline";
    }

    if (currentLow < head) {
      state = "INVALIDATED";
      progressPct = 0;
      progressDesc = "Invalidated: Price fell below the Head trough";
    }

    const patternHeight = necklinePrice - head;
    const targetPrice = necklinePrice + patternHeight;

    return {
      id: `${symbol}-${timeframe}-INVERSE_HS-${p1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "INVERSE_HEAD_AND_SHOULDERS",
      name: "Inverse Head and Shoulders",
      direction: "BULLISH",
      state,
      firstDetectedAt: p1.isoTime,
      lastUpdatedAt: p5.isoTime,
      startTime: p1.timestamp,
      endTime: p5.timestamp,
      keyPoints: [
        { label: "Left Shoulder", timestamp: p1.timestamp, price: p1.price },
        { label: "Neckline 1", timestamp: p2.timestamp, price: p2.price },
        { label: "Head", timestamp: p3.timestamp, price: p3.price },
        { label: "Neckline 2", timestamp: p4.timestamp, price: p4.price },
        { label: "Right Shoulder", timestamp: p5.timestamp, price: p5.price, isProvisional: p5.isProvisional },
      ],
      levels: {
        entry: necklinePrice,
        neckline: necklinePrice,
        target1: targetPrice,
        stopLoss: head,
        invalidationLevel: head,
      },
      progress: {
        percentage: progressPct,
        description: progressDesc,
      },
      confirmationCondition: {
        description: `Break above neckline level of ${necklinePrice.toFixed(2)}`,
        priceLevel: necklinePrice,
        operator: ">",
        isMet: currentPrice > necklinePrice,
      },
      invalidationCondition: {
        description: `Price breaks below Head trough at ${head.toFixed(2)}`,
        priceLevel: head,
        operator: "<",
        isMet: currentLow < head,
      },
    };
  }

  // --- Double Top ---
  private checkDoubleTop(
    w: SwingPoint[],
    currentPrice: number,
    currentHigh: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern | null {
    if (w.length < 3) return null;
    const [p1, p2, p3] = w; // High 1, Trough, High 2
    if (p1.type !== "HIGH" || p2.type !== "LOW" || p3.type !== "HIGH") return null;

    const topDiff = Math.abs(p1.price - p3.price) / p1.price;
    if (topDiff > 0.02) return null; // within 2%

    const neckline = p2.price;
    const peakPrice = Math.max(p1.price, p3.price);

    let state: PatternLifecycleState = "COMPLETED";
    let progressPct = 80;
    let progressDesc = "Second peak completed, testing neckline";

    if (p3.isProvisional) {
      state = "DEVELOPING";
      progressPct = 60;
      progressDesc = "Second peak currently developing";
    } else if (currentPrice < neckline) {
      state = "CONFIRMED";
      progressPct = 100;
      progressDesc = "Confirmed: Breakout below the neckline";
    }

    if (currentHigh > peakPrice * 1.008) {
      state = "INVALIDATED";
      progressPct = 0;
      progressDesc = "Invalidated: Price exceeded peak resistance";
    }

    const height = peakPrice - neckline;

    return {
      id: `${symbol}-${timeframe}-DOUBLE_TOP-${p1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "DOUBLE_TOP",
      name: "Double Top",
      direction: "BEARISH",
      state,
      firstDetectedAt: p1.isoTime,
      lastUpdatedAt: p3.isoTime,
      startTime: p1.timestamp,
      endTime: p3.timestamp,
      keyPoints: [
        { label: "Peak 1", timestamp: p1.timestamp, price: p1.price },
        { label: "Neckline", timestamp: p2.timestamp, price: p2.price },
        { label: "Peak 2", timestamp: p3.timestamp, price: p3.price, isProvisional: p3.isProvisional },
      ],
      levels: {
        entry: neckline,
        neckline,
        target1: neckline - height,
        stopLoss: peakPrice,
        invalidationLevel: peakPrice,
      },
      progress: {
        percentage: progressPct,
        description: progressDesc,
      },
      confirmationCondition: {
        description: `Break below neckline level of ${neckline.toFixed(2)}`,
        priceLevel: neckline,
        operator: "<",
        isMet: currentPrice < neckline,
      },
      invalidationCondition: {
        description: `Price exceeds peak level ${peakPrice.toFixed(2)}`,
        priceLevel: peakPrice,
        operator: ">",
        isMet: currentHigh > peakPrice,
      },
    };
  }

  // --- Double Bottom ---
  private checkDoubleBottom(
    w: SwingPoint[],
    currentPrice: number,
    currentLow: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern | null {
    if (w.length < 3) return null;
    const [p1, p2, p3] = w; // Low 1, Peak, Low 2
    if (p1.type !== "LOW" || p2.type !== "HIGH" || p3.type !== "LOW") return null;

    const bottomDiff = Math.abs(p1.price - p3.price) / p1.price;
    if (bottomDiff > 0.02) return null;

    const neckline = p2.price;
    const troughPrice = Math.min(p1.price, p3.price);

    let state: PatternLifecycleState = "COMPLETED";
    let progressPct = 80;
    let progressDesc = "Second trough completed, testing neckline";

    if (p3.isProvisional) {
      state = "DEVELOPING";
      progressPct = 60;
      progressDesc = "Second bottom trough developing";
    } else if (currentPrice > neckline) {
      state = "CONFIRMED";
      progressPct = 100;
      progressDesc = "Confirmed: Breakout above the neckline";
    }

    if (currentLow < troughPrice * 0.992) {
      state = "INVALIDATED";
      progressPct = 0;
      progressDesc = "Invalidated: Price fell below double bottom floor";
    }

    const height = neckline - troughPrice;

    return {
      id: `${symbol}-${timeframe}-DOUBLE_BOTTOM-${p1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "DOUBLE_BOTTOM",
      name: "Double Bottom",
      direction: "BULLISH",
      state,
      firstDetectedAt: p1.isoTime,
      lastUpdatedAt: p3.isoTime,
      startTime: p1.timestamp,
      endTime: p3.timestamp,
      keyPoints: [
        { label: "Trough 1", timestamp: p1.timestamp, price: p1.price },
        { label: "Neckline", timestamp: p2.timestamp, price: p2.price },
        { label: "Trough 2", timestamp: p3.timestamp, price: p3.price, isProvisional: p3.isProvisional },
      ],
      levels: {
        entry: neckline,
        neckline,
        target1: neckline + height,
        stopLoss: troughPrice,
        invalidationLevel: troughPrice,
      },
      progress: {
        percentage: progressPct,
        description: progressDesc,
      },
      confirmationCondition: {
        description: `Break above neckline level of ${neckline.toFixed(2)}`,
        priceLevel: neckline,
        operator: ">",
        isMet: currentPrice > neckline,
      },
      invalidationCondition: {
        description: `Price falls below trough level ${troughPrice.toFixed(2)}`,
        priceLevel: troughPrice,
        operator: "<",
        isMet: currentLow < troughPrice,
      },
    };
  }

  // --- Triple Top & Triple Bottom ---
  private checkTripleTop(
    w: SwingPoint[],
    currentPrice: number,
    currentHigh: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern | null {
    if (w.length < 5) return null;
    const [p1, p2, p3, p4, p5] = w; // High, Low, High, Low, High
    if (p1.type !== "HIGH" || p2.type !== "LOW" || p3.type !== "HIGH" || p4.type !== "LOW" || p5.type !== "HIGH") return null;

    const diff1 = Math.abs(p1.price - p3.price) / p1.price;
    const diff2 = Math.abs(p3.price - p5.price) / p3.price;
    if (diff1 > 0.02 || diff2 > 0.02) return null;

    const neckline = Math.min(p2.price, p4.price);
    const peak = Math.max(p1.price, p3.price, p5.price);

    let state: PatternLifecycleState = p5.isProvisional ? "DEVELOPING" : "COMPLETED";
    if (currentPrice < neckline) state = "CONFIRMED";
    if (currentHigh > peak * 1.01) state = "INVALIDATED";

    return {
      id: `${symbol}-${timeframe}-TRIPLE_TOP-${p1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "TRIPLE_TOP",
      name: "Triple Top",
      direction: "BEARISH",
      state,
      firstDetectedAt: p1.isoTime,
      lastUpdatedAt: p5.isoTime,
      startTime: p1.timestamp,
      endTime: p5.timestamp,
      keyPoints: [
        { label: "Peak 1", timestamp: p1.timestamp, price: p1.price },
        { label: "Valley 1", timestamp: p2.timestamp, price: p2.price },
        { label: "Peak 2", timestamp: p3.timestamp, price: p3.price },
        { label: "Valley 2", timestamp: p4.timestamp, price: p4.price },
        { label: "Peak 3", timestamp: p5.timestamp, price: p5.price, isProvisional: p5.isProvisional },
      ],
      levels: { entry: neckline, neckline, target1: neckline - (peak - neckline), stopLoss: peak },
      progress: {
        percentage: state === "CONFIRMED" ? 100 : state === "COMPLETED" ? 85 : 65,
        description: state === "CONFIRMED" ? "Confirmed: Breakout below baseline" : "Third peak testing resistance",
      },
    };
  }

  private checkTripleBottom(
    w: SwingPoint[],
    currentPrice: number,
    currentLow: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern | null {
    if (w.length < 5) return null;
    const [p1, p2, p3, p4, p5] = w; // Low, High, Low, High, Low
    if (p1.type !== "LOW" || p2.type !== "HIGH" || p3.type !== "LOW" || p4.type !== "HIGH" || p5.type !== "LOW") return null;

    const diff1 = Math.abs(p1.price - p3.price) / p1.price;
    const diff2 = Math.abs(p3.price - p5.price) / p3.price;
    if (diff1 > 0.02 || diff2 > 0.02) return null;

    const neckline = Math.max(p2.price, p4.price);
    const floor = Math.min(p1.price, p3.price, p5.price);

    let state: PatternLifecycleState = p5.isProvisional ? "DEVELOPING" : "COMPLETED";
    if (currentPrice > neckline) state = "CONFIRMED";
    if (currentLow < floor * 0.99) state = "INVALIDATED";

    return {
      id: `${symbol}-${timeframe}-TRIPLE_BOTTOM-${p1.timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: "TRIPLE_BOTTOM",
      name: "Triple Bottom",
      direction: "BULLISH",
      state,
      firstDetectedAt: p1.isoTime,
      lastUpdatedAt: p5.isoTime,
      startTime: p1.timestamp,
      endTime: p5.timestamp,
      keyPoints: [
        { label: "Trough 1", timestamp: p1.timestamp, price: p1.price },
        { label: "Peak 1", timestamp: p2.timestamp, price: p2.price },
        { label: "Trough 2", timestamp: p3.timestamp, price: p3.price },
        { label: "Peak 2", timestamp: p4.timestamp, price: p4.price },
        { label: "Trough 3", timestamp: p5.timestamp, price: p5.price, isProvisional: p5.isProvisional },
      ],
      levels: { entry: neckline, neckline, target1: neckline + (neckline - floor), stopLoss: floor },
      progress: {
        percentage: state === "CONFIRMED" ? 100 : state === "COMPLETED" ? 85 : 65,
        description: state === "CONFIRMED" ? "Confirmed: Breakout above resistance" : "Third bottom testing support",
      },
    };
  }

  // --- Triangles & Wedges ---
  private checkTrianglesAndWedges(
    w: SwingPoint[],
    currentPrice: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern | null {
    if (w.length < 4) return null;
    const highs = w.filter((p) => p.type === "HIGH");
    const lows = w.filter((p) => p.type === "LOW");

    if (highs.length < 2 || lows.length < 2) return null;

    const [h1, h2] = highs.slice(-2);
    const [l1, l2] = lows.slice(-2);

    const highSlope = (h2.price - h1.price) / (h2.timestamp - h1.timestamp);
    const lowSlope = (l2.price - l1.price) / (l2.timestamp - l1.timestamp);

    const flatThreshold = 0.008; // 0.8% price flat
    const isHighFlat = Math.abs(h2.price - h1.price) / h1.price < flatThreshold;
    const isLowFlat = Math.abs(l2.price - l1.price) / l1.price < flatThreshold;

    let patternCode = "";
    let name = "";
    let direction: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";

    if (isHighFlat && lowSlope > 0) {
      patternCode = "ASCENDING_TRIANGLE";
      name = "Ascending Triangle";
      direction = "BULLISH";
    } else if (isLowFlat && highSlope < 0) {
      patternCode = "DESCENDING_TRIANGLE";
      name = "Descending Triangle";
      direction = "BEARISH";
    } else if (highSlope < 0 && lowSlope > 0) {
      patternCode = "SYMMETRICAL_TRIANGLE";
      name = "Symmetrical Triangle";
      direction = "NEUTRAL";
    } else if (highSlope > 0 && lowSlope > 0 && highSlope < lowSlope) {
      patternCode = "RISING_WEDGE";
      name = "Rising Wedge";
      direction = "BEARISH";
    } else if (highSlope < 0 && lowSlope < 0 && Math.abs(highSlope) > Math.abs(lowSlope)) {
      patternCode = "FALLING_WEDGE";
      name = "Falling Wedge";
      direction = "BULLISH";
    } else {
      return null;
    }

    const lastPoint = w[w.length - 1];
    let state: PatternLifecycleState = lastPoint.isProvisional ? "DEVELOPING" : "COMPLETED";

    // Breakout check
    if (direction === "BULLISH" && currentPrice > h2.price) {
      state = "CONFIRMED";
    } else if (direction === "BEARISH" && currentPrice < l2.price) {
      state = "CONFIRMED";
    }

    const height = Math.abs(h1.price - l1.price);
    const target1 = direction === "BULLISH" ? h2.price + height : l2.price - height;

    return {
      id: `${symbol}-${timeframe}-${patternCode}-${w[0].timestamp}`,
      instrument: symbol,
      timeframe,
      family: "CLASSICAL_CHART",
      pattern: patternCode,
      name,
      direction,
      state,
      firstDetectedAt: w[0].isoTime,
      lastUpdatedAt: lastPoint.isoTime,
      startTime: w[0].timestamp,
      endTime: lastPoint.timestamp,
      keyPoints: [
        { label: "Upper 1", timestamp: h1.timestamp, price: h1.price },
        { label: "Lower 1", timestamp: l1.timestamp, price: l1.price },
        { label: "Upper 2", timestamp: h2.timestamp, price: h2.price, isProvisional: h2.isProvisional },
        { label: "Lower 2", timestamp: l2.timestamp, price: l2.price, isProvisional: l2.isProvisional },
      ],
      levels: {
        upperBoundary: h2.price,
        lowerBoundary: l2.price,
        target1,
        stopLoss: direction === "BULLISH" ? l2.price : h2.price,
      },
      progress: {
        percentage: state === "CONFIRMED" ? 100 : 75,
        description: state === "CONFIRMED" ? "Confirmed: Breakout from apex" : "Consolidating inside pattern boundaries",
      },
    };
  }

  // --- Broadening Formation ---
  private checkBroadeningFormation(
    w: SwingPoint[],
    currentPrice: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern | null {
    if (w.length < 4) return null;
    const highs = w.filter((p) => p.type === "HIGH");
    const lows = w.filter((p) => p.type === "LOW");
    if (highs.length < 2 || lows.length < 2) return null;

    const [h1, h2] = highs.slice(-2);
    const [l1, l2] = lows.slice(-2);

    // Higher high and lower low -> broadening
    if (h2.price > h1.price && l2.price < l1.price) {
      const lastPoint = w[w.length - 1];
      return {
        id: `${symbol}-${timeframe}-BROADENING-${w[0].timestamp}`,
        instrument: symbol,
        timeframe,
        family: "CLASSICAL_CHART",
        pattern: "BROADENING_FORMATION",
        name: "Broadening Formation",
        direction: "NEUTRAL",
        state: lastPoint.isProvisional ? "DEVELOPING" : "COMPLETED",
        firstDetectedAt: w[0].isoTime,
        lastUpdatedAt: lastPoint.isoTime,
        startTime: w[0].timestamp,
        endTime: lastPoint.timestamp,
        keyPoints: [
          { label: "High 1", timestamp: h1.timestamp, price: h1.price },
          { label: "Low 1", timestamp: l1.timestamp, price: l1.price },
          { label: "High 2", timestamp: h2.timestamp, price: h2.price },
          { label: "Low 2", timestamp: l2.timestamp, price: l2.price },
        ],
        levels: {
          upperBoundary: h2.price,
          lowerBoundary: l2.price,
        },
        progress: {
          percentage: 70,
          description: "Expanding volatility with divergent highs and lows",
        },
      };
    }
    return null;
  }

  // --- Flags & Pennants ---
  private checkFlagAndPennants(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    currentPrice: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern[] {
    const list: DetectedPattern[] = [];
    if (candles.length < 25 || swings.length < 3) return list;

    // Check last 20 candles for a sharp impulse pole followed by small consolidation
    const poleLength = 8;
    const flagLength = 8;
    const startIdx = candles.length - (poleLength + flagLength);
    if (startIdx < 0) return list;

    const poleStart = candles[startIdx];
    const poleEnd = candles[startIdx + poleLength];
    const flagEnd = candles[candles.length - 1];

    const poleHeight = poleEnd.close - poleStart.open;
    const polePct = Math.abs(poleHeight) / poleStart.open;

    // Need significant pole (e.g. >= 0.8% move in gold)
    if (polePct >= 0.008) {
      const isBull = poleHeight > 0;
      // Consolidation should retrace no more than 50% of the pole
      const consolidationDiff = isBull
        ? poleEnd.high - flagEnd.low
        : flagEnd.high - poleEnd.low;

      if (consolidationDiff <= 0.5 * Math.abs(poleHeight)) {
        const patternCode = isBull ? "BULLISH_FLAG" : "BEARISH_FLAG";
        const name = isBull ? "Bullish Flag" : "Bearish Flag";
        const state: PatternLifecycleState = isBull
          ? currentPrice > poleEnd.high
            ? "CONFIRMED"
            : "DEVELOPING"
          : currentPrice < poleEnd.low
          ? "CONFIRMED"
          : "DEVELOPING";

        list.push({
          id: `${symbol}-${timeframe}-${patternCode}-${poleStart.timestamp}`,
          instrument: symbol,
          timeframe,
          family: "CLASSICAL_CHART",
          pattern: patternCode,
          name,
          direction: isBull ? "BULLISH" : "BEARISH",
          state,
          firstDetectedAt: poleStart.isoTime,
          lastUpdatedAt: flagEnd.isoTime,
          startTime: poleStart.timestamp,
          endTime: flagEnd.timestamp,
          keyPoints: [
            { label: "Flagpole Base", timestamp: poleStart.timestamp, price: poleStart.open },
            { label: "Flagpole Top", timestamp: poleEnd.timestamp, price: poleEnd.high },
            { label: "Consolidation End", timestamp: flagEnd.timestamp, price: flagEnd.close },
          ],
          levels: {
            entry: isBull ? poleEnd.high : poleEnd.low,
            target1: isBull ? poleEnd.high + Math.abs(poleHeight) : poleEnd.low - Math.abs(poleHeight),
            stopLoss: isBull ? flagEnd.low : flagEnd.high,
          },
          progress: {
            percentage: state === "CONFIRMED" ? 100 : 70,
            description: state === "CONFIRMED" ? "Confirmed: Breakout from flag consolidation" : "Flag consolidation forming after impulse",
          },
        });
      }
    }

    return list;
  }

  // --- Cup and Handle ---
  private checkCupAndHandle(
    candles: readonly OHLCV[],
    swings: SwingPoint[],
    currentPrice: number,
    symbol: string,
    timeframe: SupportedTimeframe
  ): DetectedPattern[] {
    const list: DetectedPattern[] = [];
    if (swings.length < 4) return list;

    // Look for Rim Left (High), Bottom (Low), Rim Right (High), Handle (Low)
    for (let i = 0; i <= swings.length - 4; i++) {
      const [s1, s2, s3, s4] = swings.slice(i, i + 4);
      if (s1.type === "HIGH" && s2.type === "LOW" && s3.type === "HIGH" && s4.type === "LOW") {
        const rimDiff = Math.abs(s1.price - s3.price) / s1.price;
        if (rimDiff <= 0.02) {
          // Both rims comparable
          const cupDepth = s1.price - s2.price;
          const handleDepth = s3.price - s4.price;
          // Handle must be shallow (less than half cup depth)
          if (handleDepth > 0 && handleDepth <= 0.5 * cupDepth) {
            const rim = Math.max(s1.price, s3.price);
            const state: PatternLifecycleState = currentPrice > rim ? "CONFIRMED" : "DEVELOPING";

            list.push({
              id: `${symbol}-${timeframe}-CUP_AND_HANDLE-${s1.timestamp}`,
              instrument: symbol,
              timeframe,
              family: "CLASSICAL_CHART",
              pattern: "CUP_AND_HANDLE",
              name: "Cup and Handle",
              direction: "BULLISH",
              state,
              firstDetectedAt: s1.isoTime,
              lastUpdatedAt: s4.isoTime,
              startTime: s1.timestamp,
              endTime: s4.timestamp,
              keyPoints: [
                { label: "Left Rim", timestamp: s1.timestamp, price: s1.price },
                { label: "Cup Bottom", timestamp: s2.timestamp, price: s2.price },
                { label: "Right Rim", timestamp: s3.timestamp, price: s3.price },
                { label: "Handle Trough", timestamp: s4.timestamp, price: s4.price, isProvisional: s4.isProvisional },
              ],
              levels: {
                entry: rim,
                neckline: rim,
                target1: rim + cupDepth,
                stopLoss: s4.price,
              },
              progress: {
                percentage: state === "CONFIRMED" ? 100 : 80,
                description: state === "CONFIRMED" ? "Confirmed: Breakout above cup rim" : "Handle consolidation formed, testing rim resistance",
              },
            });
          }
        }
      }
    }
    return list;
  }
}
