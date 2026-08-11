// Single shared price formatter for the admin panel (₹, en-IN thousands separators, no forced
// decimals) — mirrors html/js/currency.js on the storefront side. Was previously duplicated
// identically in DashboardPage.tsx and FinancePage.tsx.
export function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
