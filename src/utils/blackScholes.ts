import { Greeks, OptionType } from '../types';

// Cumulative Standard Normal Distribution Approximation
export function normalCDF(x: number): number {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * Math.abs(x));
  const absX = Math.abs(x);
  const exponent = -0.5 * absX * absX;
  const term = (b1 * t + b2 * t * t + b3 * Math.pow(t, 3) + b4 * Math.pow(t, 4) + b5 * Math.pow(t, 5));
  const normalPDF = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(exponent);
  const q = 1 - normalPDF * term;

  return x >= 0 ? q : 1 - q;
}

// Probability Density Function (PDF) of Standard Normal Distribution
export function normalPDF(x: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculates absolute option price and Greeks using Black-Scholes.
 * @param S Stock Price
 * @param K Strike Price
 * @param T Time to Expiration in Years (Days / 365)
 * @param r Risk-free Interest Rate (as decimal, e.g., 0.05)
 * @param sigma Implied Volatility (as decimal, e.g., 0.30)
 * @param type 'CALL' or 'PUT'
 */
export function calculateBlackScholes(
  S: number,
  K: number,
  days: number,
  r: number,
  sigma: number,
  type: OptionType
): { price: number; greeks: Greeks } {
  // Guard conditions to avoid NaNs
  const T = Math.max(0.0001, days / 365);
  const v = Math.max(0.01, sigma);
  const stock = Math.max(0.01, S);
  const strike = Math.max(0.01, K);

  const d1 = (Math.log(stock / strike) + (r + (v * v) / 2) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);

  const nD1 = normalCDF(d1);
  const nD2 = normalCDF(d2);
  const pdfD1 = normalPDF(d1);

  let price = 0;
  let delta = 0;
  let theta = 0;

  if (type === 'CALL') {
    price = stock * nD1 - strike * Math.exp(-r * T) * nD2;
    delta = nD1;
    // Theta calculation (per day, hence divided by 365)
    theta = (-(stock * pdfD1 * v) / (2 * Math.sqrt(T)) - r * strike * Math.exp(-r * T) * nD2) / 365;
  } else {
    price = strike * Math.exp(-r * T) * normalCDF(-d2) - stock * normalCDF(-d1);
    delta = nD1 - 1;
    // Theta calculation (per day, hence divided by 365)
    theta = (-(stock * pdfD1 * v) / (2 * Math.sqrt(T)) + r * strike * Math.exp(-r * T) * normalCDF(-d2)) / 365;
  }

  // Gamma (per dollar change in spot)
  const gamma = pdfD1 / (stock * v * Math.sqrt(T));

  // Vega (change per 1% absolute IV change, divide by 100)
  const vega = (stock * Math.sqrt(T) * pdfD1) / 100;

  return {
    price: Math.max(0.01, price),
    greeks: {
      delta: Number(delta.toFixed(4)),
      gamma: Number(gamma.toFixed(5)),
      theta: Number(theta.toFixed(4)),
      vega: Number(vega.toFixed(4)),
    },
  };
}

/**
 * Custom payoff calculations for option strategy charts
 */
export interface PayoffDatapoint {
  strike: number;
  underlyingPrice: number;
  intrinsicValue: number;
  expirationPayoff: number;
  currentValue: number;
}

export function generatePayoffDetails(
  spotPrice: number,
  strike: number,
  premium: number,
  daysToExpiration: number,
  r: number,
  volatility: number,
  type: OptionType
): PayoffDatapoint[] {
  const points: PayoffDatapoint[] = [];
  const rangeMin = Math.round(strike * 0.7);
  const rangeMax = Math.round(strike * 1.3);
  const step = Math.max(1, Math.round((rangeMax - rangeMin) / 40));

  for (let s = rangeMin; s <= rangeMax; s += step) {
    let expirationPayoff = 0;
    if (type === 'CALL') {
      expirationPayoff = Math.max(0, s - strike) - premium;
    } else {
      expirationPayoff = Math.max(0, strike - s) - premium;
    }

    const { price: futurePrice } = calculateBlackScholes(s, strike, daysToExpiration, r, volatility, type);
    const currentValue = futurePrice - premium;

    points.push({
      strike,
      underlyingPrice: s,
      intrinsicValue: type === 'CALL' ? Math.max(0, s - strike) : Math.max(0, strike - s),
      expirationPayoff: Number(expirationPayoff.toFixed(2)),
      currentValue: Number(currentValue.toFixed(2)),
    });
  }

  return points;
}
