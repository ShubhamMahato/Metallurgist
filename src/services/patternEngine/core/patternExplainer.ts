import { DetectedPattern, PatternDirection } from "../types/pattern";

export interface PatternExplanation {
  meaning: string;
  expectedDirection: "UP" | "DOWN" | "SIDEWAYS";
  expectedSummary: string;
  whereItWillGo: string;
  howToTrade: string;
  targetPrice?: number;
  stopPrice?: number;
  movePct?: number;
}

export function explainPattern(pattern: DetectedPattern, currentPrice?: number): PatternExplanation {
  const isBull = pattern.direction === "BULLISH";
  const isBear = pattern.direction === "BEARISH";
  const refPrice = currentPrice || pattern.levels.entry || pattern.keyPoints[pattern.keyPoints.length - 1]?.price || 3880;

  let target = pattern.levels.target1;
  let stop = pattern.levels.stopLoss;

  if (!target) {
    target = isBull ? refPrice * 1.008 : isBear ? refPrice * 0.992 : refPrice;
  }
  if (!stop) {
    stop = isBull ? refPrice * 0.995 : isBear ? refPrice * 1.005 : refPrice;
  }

  const moveDiff = target - refPrice;
  const movePct = refPrice > 0 ? (moveDiff / refPrice) * 100 : 0;
  const expectedDirection = isBull ? "UP" : isBear ? "DOWN" : "SIDEWAYS";

  const expectedSummary = isBull
    ? `▲ Predicted to RISE to $${target.toFixed(2)} (${movePct >= 0 ? "+" : ""}${movePct.toFixed(2)}%)`
    : isBear
    ? `▼ Predicted to FALL to $${target.toFixed(2)} (${movePct.toFixed(2)}%)`
    : `▶ Range-bound consolidation near $${refPrice.toFixed(2)}`;

  let meaning = "";
  let whereItWillGo = "";
  let howToTrade = "";

  switch (pattern.pattern) {
    // CANDLESTICKS
    case "BULLISH_ENGULFING":
      meaning = "Strong buyer surge that completely swallows the previous selling candle. Signifies buyers took total control of the market.";
      whereItWillGo = `Price is expected to rally UPWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Look for continued buying momentum. Place protective stop loss below $${stop.toFixed(2)}.`;
      break;

    case "BEARISH_ENGULFING":
      meaning = "Aggressive seller wave that completely engulfs the previous green candle. Indicates buyers ran out of power and bears took over.";
      whereItWillGo = `Price is expected to decline DOWNWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Watch for selling follow-through. Invalidate if price pushes back above $${stop.toFixed(2)}.`;
      break;

    case "HAMMER":
      meaning = "Bullish rejection of lower prices. Sellers pushed down hard, but buyers surged back to close near the highs, leaving a long lower shadow.";
      whereItWillGo = `Price is expected to bounce UPWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Enter on strength with stop placed right below the hammer's bottom wick at $${stop.toFixed(2)}.`;
      break;

    case "SHOOTING_STAR":
      meaning = "Bearish rejection of higher prices. Buyers attempted a rally, but sellers rejected it violently, leaving a tall upper shadow.";
      whereItWillGo = `Price is expected to drop DOWNWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Expect downward pressure. Invalidation level is at the star's upper wick at $${stop.toFixed(2)}.`;
      break;

    case "MORNING_STAR":
      meaning = "High-probability 3-candle bullish reversal: a strong drop, an indecision star, followed by an aggressive green breakout candle.";
      whereItWillGo = `Price has formed a local bottom and is predicted to climb UPWARD to $${target.toFixed(2)}.`;
      howToTrade = `Confirmed reversal. Maintain protective stop below the morning star valley at $${stop.toFixed(2)}.`;
      break;

    case "EVENING_STAR":
      meaning = "High-probability 3-candle bearish reversal: strong rally, exhaustion star, followed by a sharp red drop.";
      whereItWillGo = `Price has reached a local top and is predicted to drop DOWNWARD to $${target.toFixed(2)}.`;
      howToTrade = `Expect sellers to drive price down. Place stop above the star peak at $${stop.toFixed(2)}.`;
      break;

    case "THREE_WHITE_SOLDIERS":
      meaning = "Triple consecutive strong green candles with higher closes. Indicates sustained institutional buying demand.";
      whereItWillGo = `Strong bullish continuation. Price is predicted to advance UPWARD to $${target.toFixed(2)}.`;
      howToTrade = `Ride the bullish trend. Trailing stop can be kept below the first soldier's base at $${stop.toFixed(2)}.`;
      break;

    case "THREE_BLACK_CROWS":
      meaning = "Triple consecutive heavy red candles with lower closes. Indicates unrelenting institutional selling pressure.";
      whereItWillGo = `Strong bearish continuation. Price is predicted to slide DOWNWARD to $${target.toFixed(2)}.`;
      howToTrade = `Avoid buying dips while crows are active. Stop loss above the pattern high at $${stop.toFixed(2)}.`;
      break;

    case "TWEEZER_BOTTOM":
      meaning = "Double rejection at identical support floor across 2 candles. Confirms a firm support base where buyers step in.";
      whereItWillGo = `Price found solid floor and is expected to reverse UPWARD to $${target.toFixed(2)}.`;
      howToTrade = `Buy near the tweezers with tight stop below $${stop.toFixed(2)}.`;
      break;

    case "TWEEZER_TOP":
      meaning = "Double rejection at identical resistance ceiling across 2 candles. Sellers heavily defended this ceiling.";
      whereItWillGo = `Price rejected the ceiling and is predicted to fall DOWNWARD to $${target.toFixed(2)}.`;
      howToTrade = `Expect resistance to hold. Invalidation is above the tweezers at $${stop.toFixed(2)}.`;
      break;

    // CLASSICAL PATTERNS
    case "DOUBLE_BOTTOM":
      meaning = "W-shaped bullish reversal. Price tested the floor twice, failed to go lower, and formed an upward reversal.";
      whereItWillGo = `Price is predicted to climb UPWARD towards measured target $${target.toFixed(2)}.`;
      howToTrade = `Confirmed when price closes above the neckline at $${(pattern.levels.neckline || refPrice).toFixed(2)}.`;
      break;

    case "DOUBLE_TOP":
      meaning = "M-shaped bearish reversal. Price tested the high twice, failed to break out, and formed a downward reversal.";
      whereItWillGo = `Price is predicted to decline DOWNWARD towards measured target $${target.toFixed(2)}.`;
      howToTrade = `Confirmed when price breaks beneath neckline at $${(pattern.levels.neckline || refPrice).toFixed(2)}.`;
      break;

    case "HEAD_AND_SHOULDERS":
      meaning = "Classic bearish reversal. Buyers formed a Left Shoulder and a higher Head, but the Right Shoulder failed, showing buyer exhaustion.";
      whereItWillGo = `Once the neckline breaks, price is expected to tumble DOWNWARD to $${target.toFixed(2)}.`;
      howToTrade = `Sell on neckline breakdown at $${(pattern.levels.neckline || refPrice).toFixed(2)}. Stop is the Head at $${stop.toFixed(2)}.`;
      break;

    case "INVERSE_HEAD_AND_SHOULDERS":
      meaning = "Classic bullish reversal. Sellers formed three valleys, but the right valley is higher, signaling sellers are exhausted.";
      whereItWillGo = `Price is expected to surge UPWARD to $${target.toFixed(2)} after clearing the neckline.`;
      howToTrade = `Buy on neckline breakout at $${(pattern.levels.neckline || refPrice).toFixed(2)}. Stop loss at $${stop.toFixed(2)}.`;
      break;

    case "ASCENDING_TRIANGLE":
      meaning = "Bullish accumulation. Buyers keep creating higher lows into flat horizontal resistance, building pressure for an upside breakout.";
      whereItWillGo = `Price is coiling to explode UPWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Watch for breakout above $${(pattern.levels.upperBoundary || refPrice).toFixed(2)}.`;
      break;

    case "DESCENDING_TRIANGLE":
      meaning = "Bearish distribution. Sellers keep creating lower highs against flat horizontal support, putting heavy pressure on the floor.";
      whereItWillGo = `Price is coiling to break DOWNWARD through the floor towards $${target.toFixed(2)}.`;
      howToTrade = `Watch for breakdown below support at $${(pattern.levels.lowerBoundary || refPrice).toFixed(2)}.`;
      break;

    case "BULLISH_FLAG":
      meaning = "Bullish trend continuation. A steep upward flagpole followed by a slight downward drift (consolidation) before the next leg up.";
      whereItWillGo = `Price is predicted to resume the rally UPWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Enter as price breaks out of the flag channel. Stop below the flag floor at $${stop.toFixed(2)}.`;
      break;

    case "BEARISH_FLAG":
      meaning = "Bearish trend continuation. A steep drop followed by a weak upward consolidation before the next drop.";
      whereItWillGo = `Price is predicted to resume the slide DOWNWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Enter as price breaks down from flag channel. Stop above the flag top at $${stop.toFixed(2)}.`;
      break;

    // HARMONICS
    case "GARTLEY":
    case "BAT":
    case "BUTTERFLY":
    case "CRAB":
    case "AB_CD":
      meaning = `${isBull ? "Bullish" : "Bearish"} Harmonic pattern. Precise geometric Fibonacci structure reaching the Potential Reversal Zone (PRZ).`;
      whereItWillGo = isBull
        ? `Price is expected to bounce UPWARD from the PRZ towards $${target.toFixed(2)}.`
        : `Price is expected to drop DOWNWARD from the PRZ towards $${target.toFixed(2)}.`;
      howToTrade = `Trade the reversal out of point D. Strict stop loss at $${stop.toFixed(2)}.`;
      break;

    // MARKET STRUCTURE
    case "BULLISH_BOS":
      meaning = "Bullish Break of Structure. Price broke and closed above the previous major swing high, establishing a sustained uptrend.";
      whereItWillGo = `Trend is firmly bullish. Price is predicted to continue UPWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Look to buy pullbacks to the broken high level at $${(pattern.levels.breakoutLevel || refPrice).toFixed(2)}.`;
      break;

    case "BEARISH_BOS":
      meaning = "Bearish Break of Structure. Price closed below the previous major swing low, confirming a sustained downtrend.";
      whereItWillGo = `Trend is firmly bearish. Price is predicted to slide DOWNWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Look to sell rallies into the broken low level at $${(pattern.levels.breakoutLevel || refPrice).toFixed(2)}.`;
      break;

    case "BULLISH_LIQUIDITY_SWEEP":
      meaning = "Smart Money Liquidity Sweep. Price briefly dove below a swing low to trigger stops, then immediately snapped back inside the range.";
      whereItWillGo = `Trapped short-sellers are forced to cover. Price is predicted to snap UPWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Buy the rejection. Stop placed at the extreme sweep low at $${stop.toFixed(2)}.`;
      break;

    case "BEARISH_LIQUIDITY_SWEEP":
      meaning = "Smart Money Liquidity Sweep. Price poked above a swing high to grab buy-side liquidity, then immediately reversed downward.";
      whereItWillGo = `Trapped breakout buyers are liquidated. Price is predicted to sink DOWNWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Sell the rejection. Stop placed at the extreme sweep high at $${stop.toFixed(2)}.`;
      break;

    // STATISTICAL
    case "BOLLINGER_BAND_SQUEEZE":
    case "BULLISH_CHANNEL_BREAKOUT":
    case "BEARISH_CHANNEL_BREAKOUT":
      meaning = isBull
        ? "Volatility Squeeze Breakout: Market was intensely compressed and has just exploded upward with heavy momentum."
        : isBear
        ? "Volatility Squeeze Breakdown: Market volatility was compressed and has just exploded downward."
        : "Volatility Compression: Bands are squeezed tight. A massive directional expansion move is imminent.";
      whereItWillGo = isBull
        ? `Strong momentum pushing UPWARD towards $${target.toFixed(2)}.`
        : isBear
        ? `Strong momentum pushing DOWNWARD towards $${target.toFixed(2)}.`
        : `Wait for breakout direction; expect a large $20-$40 gold expansion move.`;
      howToTrade = isBull
        ? `Ride the upward expansion with stop at the 20-period midline.`
        : isBear
        ? `Ride the downward expansion with stop at the 20-period midline.`
        : `Do not trade inside the squeeze; place stop orders above/below the bands.`;
      break;

    case "BULLISH_RSI_DIVERGENCE":
      meaning = "Bullish Momentum Divergence. Price made a lower low, but the RSI oscillator made a higher low, proving sellers are losing steam.";
      whereItWillGo = `Seller exhaustion: price is predicted to reverse UPWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Anticipate an upward reversal. Stop placed below the recent low at $${stop.toFixed(2)}.`;
      break;

    case "BEARISH_RSI_DIVERGENCE":
      meaning = "Bearish Momentum Divergence. Price made a higher high, but the RSI oscillator made a lower high, proving buyer exhaustion.";
      whereItWillGo = `Buyer exhaustion: price is predicted to reverse DOWNWARD towards $${target.toFixed(2)}.`;
      howToTrade = `Anticipate a downward correction. Stop placed above the recent high at $${stop.toFixed(2)}.`;
      break;

    // TECHNICAL INDICATOR STRATEGIES
    case "EMA_9_21_CROSS":
      meaning = isBull
        ? "EMA 9 crossed above EMA 21: High-speed dynamic moving average momentum flip indicating bulls taking near-term dominance."
        : "EMA 9 crossed below EMA 21: High-speed dynamic moving average momentum flip indicating bears taking near-term dominance.";
      whereItWillGo = isBull
        ? `Momentum push UPWARD targeting $${target.toFixed(2)}.`
        : `Momentum push DOWNWARD targeting $${target.toFixed(2)}.`;
      howToTrade = isBull
        ? `Enter on 9/21 cross or first retest of 21 EMA. Stop at $${stop.toFixed(2)}.`
        : `Short on 9/21 cross or first retest of 21 EMA. Stop at $${stop.toFixed(2)}.`;
      break;

    case "GOLDEN_CROSS":
      meaning = "Major 50 EMA crossed above 200 EMA: Legendary institutional Golden Cross signaling the start of a multi-week macroeconomic macro bull trend.";
      whereItWillGo = `Sustained macro expansion UPWARD targeting $${target.toFixed(2)}.`;
      howToTrade = `Ride trend with trailing stops along the 50 EMA. Invalidation below 200 EMA at $${stop.toFixed(2)}.`;
      break;

    case "DEATH_CROSS":
      meaning = "Major 50 EMA crossed below 200 EMA: Major macro Death Cross signaling institutional distribution and prolonged macro downtrend.";
      whereItWillGo = `Sustained macro decline DOWNWARD targeting $${target.toFixed(2)}.`;
      howToTrade = `Look for short rallies into the 50/200 EMA resistance. Invalidation above 200 EMA at $${stop.toFixed(2)}.`;
      break;

    case "MACD_CROSSOVER":
      meaning = isBull
        ? "MACD Line crossed above Signal Line with expanding bullish histogram bars: Momentum acceleration to the upside."
        : "MACD Line crossed below Signal Line with expanding bearish histogram bars: Momentum acceleration to the downside.";
      whereItWillGo = isBull
        ? `Upward momentum expansion towards $${target.toFixed(2)}.`
        : `Downward momentum acceleration towards $${target.toFixed(2)}.`;
      howToTrade = isBull
        ? `Buy the MACD signal line crossover. Stop loss at $${stop.toFixed(2)}.`
        : `Short the MACD signal line cross under. Stop loss at $${stop.toFixed(2)}.`;
      break;

    case "RSI_REVERSAL":
      meaning = isBull
        ? "RSI Oversold Dip-Bounce: RSI fell below 30 into deep oversold territory and is now rebounding back upward."
        : "RSI Overbought Rejection: RSI spiked above 70 into overextended territory and is now rolling back downward.";
      whereItWillGo = isBull
        ? `Mean reversion bounce UPWARD towards $${target.toFixed(2)}.`
        : `Mean reversion pullback DOWNWARD towards $${target.toFixed(2)}.`;
      howToTrade = isBull
        ? `Buy the oversold reversal confirmation. Stop at swing low $${stop.toFixed(2)}.`
        : `Sell the overbought exhaustion rollover. Stop at swing high $${stop.toFixed(2)}.`;
      break;

    case "SUPERTREND_FLIP":
      meaning = isBull
        ? "Supertrend Trend Flip (Green): Price broke cleanly above ATR volatility resistance band, flipping the algorithmic trend to Bullish."
        : "Supertrend Trend Flip (Red): Price broke cleanly below ATR volatility support band, flipping the algorithmic trend to Bearish.";
      whereItWillGo = isBull
        ? `Algorithmic trend continuation UPWARD towards $${target.toFixed(2)}.`
        : `Algorithmic trend continuation DOWNWARD towards $${target.toFixed(2)}.`;
      howToTrade = isBull
        ? `Hold long positions with dynamic trailing stop on the green Supertrend line at $${stop.toFixed(2)}.`
        : `Hold short positions with dynamic trailing stop on the red Supertrend line at $${stop.toFixed(2)}.`;
      break;

    case "BB_RSI_CONFLUENCE":
      meaning = isBull
        ? "Bollinger Band Lower Touch + RSI Oversold Confluence: High-probability 2-sigma statistical mean reversion buy setup."
        : "Bollinger Band Upper Rejection + RSI Overbought Confluence: High-probability 2-sigma statistical mean reversion sell setup.";
      whereItWillGo = isBull
        ? `Price predicted to revert UPWARD back to the 20 SMA midline at $${target.toFixed(2)}.`
        : `Price predicted to revert DOWNWARD back to the 20 SMA midline at $${target.toFixed(2)}.`;
      howToTrade = isBull
        ? `Take long mean-reversion trade targeting the BB midline. Stop loss below the lower band at $${stop.toFixed(2)}.`
        : `Take short mean-reversion trade targeting the BB midline. Stop loss above the upper band at $${stop.toFixed(2)}.`;
      break;

    default:
      meaning = `${pattern.name}: ${isBull ? "Bullish" : isBear ? "Bearish" : "Neutral"} technical pattern formation.`;
      whereItWillGo = isBull
        ? `Price is expected to trend UPWARD towards $${target.toFixed(2)}.`
        : isBear
        ? `Price is expected to decline DOWNWARD towards $${target.toFixed(2)}.`
        : `Price is expected to trade near $${refPrice.toFixed(2)}.`;
      howToTrade = `Trade with the trend. Invalidation at $${stop.toFixed(2)}.`;
  }

  return {
    meaning,
    expectedDirection,
    expectedSummary,
    whereItWillGo,
    howToTrade,
    targetPrice: target,
    stopPrice: stop,
    movePct: Number(movePct.toFixed(2)),
  };
}
