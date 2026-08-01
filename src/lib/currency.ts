import { Currency } from "@/generated/prisma"

// rate is always MXN per 1 USD, by convention, regardless of which
// currency is the org's base.
export function convertToSecondary(amountInBase: number, rate: number, baseCurrency: Currency): number {
  return baseCurrency === "USD" ? amountInBase * rate : amountInBase / rate
}

export function secondaryCurrency(base: Currency): Currency {
  return base === "USD" ? "MXN" : "USD"
}

export function formatMoney(amount: number, currency: Currency): string {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currency === "USD" ? `$${formatted}` : `${formatted} MXN`
}
