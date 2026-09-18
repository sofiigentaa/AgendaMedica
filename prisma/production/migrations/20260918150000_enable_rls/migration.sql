-- Enable Row Level Security on every table. The app talks to Postgres only
-- through the Express server (Prisma, connecting as the table-owner role,
-- which bypasses RLS). With RLS on and no policies, Supabase's public Data
-- API (anon / authenticated keys) can read or write nothing.
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_closures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "backup_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "backup_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
