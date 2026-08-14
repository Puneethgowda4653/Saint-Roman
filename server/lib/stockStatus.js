// Single source of truth for "is this variant low on stock" — used by inventory.js, dashboard.js,
// and notifications.js, which each used to carry their own hand-duplicated LOW_STOCK_THRESHOLD
// constant. Now that a variant can carry its own low_stock_threshold (phase15_inventory_automation.sql
// — a fast-moving SKU and a slow one shouldn't share one global number), duplicating the comparison
// logic three times would have meant duplicating this fallback rule three times too.

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export function effectiveThreshold(variant) {
  return variant.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
}

export function computeStockStatus(variant) {
  const available = variant.stock_quantity - variant.reserved_quantity;
  if (available <= 0) return 'out_of_stock';
  if (variant.stock_quantity <= effectiveThreshold(variant)) return 'low_stock';
  return 'in_stock';
}
