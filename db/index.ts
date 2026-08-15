import { env } from "cloudflare:workers";
import {
  createMemberEmailIndex,
  createMembersTable,
  createMemberUserIndex,
  createPersonalOwnerIndex,
  createSpacesTable,
} from "./schema";

export function getD1() {
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("The finance database is not available.");
  return database;
}

let schemaReady: Promise<void> | null = null;

export function ensureFinanceSchema() {
  if (schemaReady) return schemaReady;
  const database = getD1();
  schemaReady = database.batch([
    database.prepare(createSpacesTable),
    database.prepare(createMembersTable),
    database.prepare(createPersonalOwnerIndex),
    database.prepare(createMemberUserIndex),
    database.prepare(createMemberEmailIndex),
  ]).then(() => undefined).catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}
