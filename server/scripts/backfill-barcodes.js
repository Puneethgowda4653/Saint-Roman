import 'dotenv/config';
import { supabaseAdmin } from '../config/supabase.js';
import { generateUniqueBarcode } from '../lib/barcode.js';

// One-time backfill for products created before the barcode feature existed.
// Run: node server/scripts/backfill-barcodes.js
// Safe to re-run — only touches rows where barcode is null.

const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .is('barcode', null);

if (error) {
    console.error('Failed to fetch products:', error.message);
    process.exit(1);
}

if (!products || products.length === 0) {
    console.log('No products missing a barcode. Nothing to do.');
    process.exit(0);
}

console.log(`Backfilling barcodes for ${products.length} product(s)...`);

for (const product of products) {
    const barcode = await generateUniqueBarcode();
    const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ barcode })
        .eq('id', product.id);

    if (updateError) {
        console.error(`  ✗ ${product.name} (${product.id}): ${updateError.message}`);
        continue;
    }
    console.log(`  ✓ ${product.name} → ${barcode}`);
}

console.log('Backfill complete.');