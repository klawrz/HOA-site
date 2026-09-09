import { Currency } from "@/generated/prisma"

// rate is always MXN per 1 USD, by convention, regardless of which
// currency is the org's base.
export function convertToSecondary(amountInBase: number, rate: number, baseCurrency: Currency): number {
  return baseCurrency === "USD" ? amountInBase * rate : amountInBase / rate
}

export function secondaryCurrency(base: Currency): Currency {
  return base === "USD" ? "MXN" : "USD"
}

// Whole units only - HOA budgets and financial summaries are discussed to
// the nearest peso / dollar, not the cent. USD keeps the "$" prefix; MXN
// is a bare number (columns/labels carry the currency).
export function formatMoney(amount: number, currency: Currency): string {
  const formatted = Math.round(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })
  return currency === "USD" ? `$${formatted}` : formatted
}
