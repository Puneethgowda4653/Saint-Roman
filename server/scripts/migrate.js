import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const allFiles = [
  '../supabase/schema.sql',
  '../supabase/phase2_catalog.sql',
  '../supabase/phase3_inventory.sql',
  '../supabase/phase3_orders.sql',
  '../supabase/phase3_cms.sql',
  '../supabase/phase4_customers.sql',
  '../supabase/phase4_returns.sql',
];

// Pass specific file names as CLI args to re-run just those (earlier files use `create policy`/`create trigger`
// without `if not exists`, so re-running the full list after first setup will error on duplicates).
const files = process.argv.length > 2 ? process.argv.slice(2) : allFiles;

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  const sql = readFileSync(fullPath, 'utf8');
  console.log(`Running ${file}...`);
  await client.query(sql);
  console.log(`Done: ${file}`);
}

await client.end();
console.log('Migration complete.');
