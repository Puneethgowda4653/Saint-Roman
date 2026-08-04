import { supabaseAdmin } from '../config/supabase.js';

// Internal-only barcode, same idea as Myntra/Flipkart's own SKU barcodes — NOT a retail
// EAN/UPC (those have to be licensed from GS1). Format: ELR + 10 digits, Code128-safe
// (digits only after the prefix keeps the barcode short and easy to scan at label size).
// Never exposed on the public API — see server/routes/public.js.
function randomDigits(length) {
    let out = '';
    for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
    return out;
}

function generateCandidate() {
    return `ELR${randomDigits(10)}`;
}

// Generates a barcode guaranteed unique against the products table. Retries on the rare
// collision (10 random digits = 1 in 10B, but the check costs nothing to be safe).
export async function generateUniqueBarcode() {
    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateCandidate();
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('barcode', candidate)
            .maybeSingle();

        if (error) throw new Error(`Barcode uniqueness check failed: ${error.message}`);
        if (!data) return candidate;
    }
    throw new Error('Could not generate a unique barcode after 5 attempts');
}