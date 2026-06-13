import { sql, type SQL } from "drizzle-orm";

export type DatabaseExecutor = {
  execute: (query: SQL) => Promise<unknown>;
};

export async function checkDatabaseConnection(
  database: DatabaseExecutor,
): Promise<boolean> {
  try {
    await database.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
