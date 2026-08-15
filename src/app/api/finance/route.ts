import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensureFinanceSchema, getD1 } from "../../../../db";
import type { FinanceData, SpaceId } from "@/lib/finance";

type SpaceRow = { id: string; type: SpaceId; data_json: string };
type MemberRow = { email: string; display_name: string; role: string; status: string };

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected database error";
  return Response.json({ error: message }, { status: 500 });
}

function parseSpace(row: SpaceRow | null) {
  if (!row?.data_json) return null;
  try { return JSON.parse(row.data_json) as Partial<FinanceData>; } catch { return null; }
}

async function findSpaces(userId: string, email: string) {
  const db = getD1();
  await db.prepare(`UPDATE finance_space_members SET user_id = ?, status = 'active' WHERE lower(email) = lower(?) AND (user_id IS NULL OR user_id = ?)`)
    .bind(userId, email, userId).run();
  const personal = await db.prepare(`SELECT id, type, data_json FROM finance_spaces WHERE type = 'personal' AND owner_user_id = ? LIMIT 1`)
    .bind(userId).first<SpaceRow>();
  const household = await db.prepare(`SELECT s.id, s.type, s.data_json FROM finance_spaces s JOIN finance_space_members m ON m.space_id = s.id WHERE s.type = 'household' AND m.user_id = ? AND m.status = 'active' ORDER BY s.updated_at DESC LIMIT 1`)
    .bind(userId).first<SpaceRow>();
  return { personal, household };
}

function mergeSpaces(personal: Partial<FinanceData> | null, household: Partial<FinanceData> | null): Partial<FinanceData> | null {
  if (!personal && !household) return null;
  const personalProfile = personal?.profile || {} as FinanceData["profile"];
  const householdProfile = household?.profile || {} as FinanceData["profile"];
  return {
    version: 3,
    profile: { ...personalProfile, ...householdProfile } as FinanceData["profile"],
    accounts: [...(personal?.accounts || []), ...(household?.accounts || [])],
    transactions: [...(personal?.transactions || []), ...(household?.transactions || [])],
    goals: [...(personal?.goals || []), ...(household?.goals || [])],
    recurring: [...(personal?.recurring || []), ...(household?.recurring || [])],
    spendingPlans: [...(personal?.spendingPlans || []), ...(household?.spendingPlans || [])],
    plannedEvents: [...(personal?.plannedEvents || []), ...(household?.plannedEvents || [])],
    inbox: [...(personal?.inbox || []), ...(household?.inbox || [])],
  };
}

function splitSpace(data: FinanceData, space: SpaceId) {
  const profile = space === "personal"
    ? { name: data.profile.name, voiceLocale: data.profile.voiceLocale, voiceLexicon: data.profile.voiceLexicon }
    : { partnerName: data.profile.partnerName, partnerEmail: data.profile.partnerEmail, householdName: data.profile.householdName, householdStartedAt: data.profile.householdStartedAt };
  return {
    version: 3,
    profile,
    accounts: data.accounts.filter((item) => item.space === space),
    transactions: data.transactions.filter((item) => item.space === space),
    goals: data.goals.filter((item) => item.space === space),
    recurring: data.recurring.filter((item) => item.space === space),
    spendingPlans: data.spendingPlans.filter((item) => item.space === space),
    plannedEvents: data.plannedEvents.filter((item) => item.space === space),
    inbox: data.inbox.filter((item) => item.space === space),
  };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    await ensureFinanceSchema();
    const { personal, household } = await findSpaces(user.userId, user.email);
    const members = household
      ? (await getD1().prepare(`SELECT email, display_name, role, status FROM finance_space_members WHERE space_id = ? ORDER BY role = 'owner' DESC, created_at ASC`).bind(household.id).all<MemberRow>()).results
      : [];
    return Response.json({ data: mergeSpaces(parseSpace(personal), parseSpace(household)), members });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    const data = await request.json() as FinanceData;
    if (data.version !== 3 || !Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
      return Response.json({ error: "Invalid finance workspace" }, { status: 400 });
    }
    const encoded = JSON.stringify(data);
    if (encoded.length > 2_000_000) return Response.json({ error: "Workspace is too large" }, { status: 413 });
    await ensureFinanceSchema();
    const db = getD1();
    let { personal, household } = await findSpaces(user.userId, user.email);
    if (!personal) {
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare(`INSERT INTO finance_spaces (id, type, owner_user_id, data_json) VALUES (?, 'personal', ?, ?)`)
          .bind(id, user.userId, JSON.stringify(splitSpace(data, "personal"))),
        db.prepare(`INSERT INTO finance_space_members (space_id, user_id, email, display_name, role, status) VALUES (?, ?, ?, ?, 'owner', 'active')`)
          .bind(id, user.userId, user.email, data.profile.name),
      ]);
      personal = { id, type: "personal", data_json: "" };
    }
    if (!household) {
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare(`INSERT INTO finance_spaces (id, type, owner_user_id, data_json) VALUES (?, 'household', ?, ?)`)
          .bind(id, user.userId, JSON.stringify(splitSpace(data, "household"))),
        db.prepare(`INSERT INTO finance_space_members (space_id, user_id, email, display_name, role, status) VALUES (?, ?, ?, ?, 'owner', 'active')`)
          .bind(id, user.userId, user.email, data.profile.name),
      ]);
      household = { id, type: "household", data_json: "" };
    }
    await db.batch([
      db.prepare(`UPDATE finance_spaces SET data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(JSON.stringify(splitSpace(data, "personal")), personal.id),
      db.prepare(`UPDATE finance_spaces SET data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(JSON.stringify(splitSpace(data, "household")), household.id),
    ]);
    const inviteEmail = data.profile.partnerEmail?.trim();
    if (inviteEmail && inviteEmail.toLowerCase() !== user.email.toLowerCase()) {
      await db.prepare(`INSERT INTO finance_space_members (space_id, email, display_name, role, status) VALUES (?, ?, ?, 'member', 'pending') ON CONFLICT(space_id, email) DO UPDATE SET display_name = excluded.display_name`)
        .bind(household.id, inviteEmail, data.profile.partnerName || "Partner").run();
    }
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
