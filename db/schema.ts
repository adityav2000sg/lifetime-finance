export const createSpacesTable = `
CREATE TABLE IF NOT EXISTS finance_spaces (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('personal', 'household')),
  owner_user_id TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const createMembersTable = `
CREATE TABLE IF NOT EXISTS finance_space_members (
  space_id TEXT NOT NULL,
  user_id TEXT,
  email TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (space_id, email),
  FOREIGN KEY (space_id) REFERENCES finance_spaces(id) ON DELETE CASCADE
)`;

export const createPersonalOwnerIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_spaces_personal_owner
ON finance_spaces(owner_user_id)
WHERE type = 'personal'`;

export const createMemberUserIndex = `
CREATE INDEX IF NOT EXISTS idx_finance_space_members_user
ON finance_space_members(user_id, status)`;

export const createMemberEmailIndex = `
CREATE INDEX IF NOT EXISTS idx_finance_space_members_email
ON finance_space_members(email, status)`;
