import {
  createMemberEmailIndex,
  createMembersTable,
  createMemberUserIndex,
  createPersonalOwnerIndex,
  createSpacesTable,
} from "./schema";

async function getCloudflareEnvironment() {
  // Keep the special Cloudflare module out of Node/Netlify build-time analysis.
  // It is resolved only when the D1-backed route actually runs on Cloudflare.
  const cloudflareModule = `cloudflare:${"workers"}`;
  const runtime = await import(/* webpackIgnore: true */ cloudflareModule) as { env?: Record<string, unknown> };
  return runtime.env || {};
}

export async function getD1() {
  const runtimeEnv = await getCloudflareEnvironment();
  const database = (runtimeEnv as { DB?: D1Database }).DB;
  if (!database) throw new Error("The finance database is not available.");
  return database;
}

let schemaReady: Promise<void> | null = null;

export async function ensureFinanceSchema() {
  if (schemaReady) return schemaReady;
  const database = await getD1();
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
