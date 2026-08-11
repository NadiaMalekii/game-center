import { Pool } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

export function getPool() {
  const databaseUrl = process.env.DATABASE_URL;
  const postgresHost = process.env.POSTGRES_HOST;
  const postgresPort = process.env.POSTGRES_PORT;
  const postgresDb = process.env.POSTGRES_DB;
  const postgresUser = process.env.POSTGRES_USER;
  const postgresPassword = process.env.POSTGRES_PASSWORD;

  if (!databaseUrl && (!postgresHost || !postgresPort || !postgresDb || !postgresUser || !postgresPassword)) {
    throw new Error(
      "PostgreSQL configuration is required: set DATABASE_URL or POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD.",
    );
  }

  globalForPg.pgPool ??= databaseUrl
    ? new Pool({ connectionString: databaseUrl })
    : new Pool({
        host: postgresHost,
        port: Number(postgresPort),
        database: postgresDb,
        user: postgresUser,
        password: postgresPassword,
      });

  return globalForPg.pgPool;
}
