import postgres from 'postgres';

// Direct PostgreSQL connection used ONLY for operations that need real
// transactions via `sql.begin()`. Single-table reads/writes continue to go
// through the Supabase client in ./supabase.
//
// SUPABASE_DB_URL is the Postgres connection string from the Supabase
// dashboard (Project Settings → Database → Connection string).
export const sql = postgres(process.env.SUPABASE_DB_URL!, {
  // Supabase requires TLS for direct database connections.
  ssl: 'require',
  // Supabase's transaction pooler does not support prepared statements.
  prepare: false,
});
