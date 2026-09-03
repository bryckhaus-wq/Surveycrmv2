export const ROLES = {
  ADMIN: "ADMIN",
  CSR: "CSR",
  DRAFTER: "DRAFTER",
  FIELD_WORKER: "FIELD_WORKER",
  SIGNING_SURVEYOR: "SIGNING_SURVEYOR",
  MARKETER: "MARKETER",
  RESEARCHER: "RESEARCHER",
} as const;

export const ADMIN = ROLES.ADMIN;
export const CSR = ROLES.CSR;
export const DRAFTER = ROLES.DRAFTER;
export const FIELD_WORKER = ROLES.FIELD_WORKER;
export const SIGNING_SURVEYOR = ROLES.SIGNING_SURVEYOR;
export const MARKETER = ROLES.MARKETER;
export const RESEARCHER = ROLES.RESEARCHER;

export function hasFinancialAccess(role?: string | null): boolean {
  if (!role) return false;
  return role === ROLES.ADMIN || role === ROLES.CSR || role === ROLES.SIGNING_SURVEYOR;
}

export function hasAdminAccess(role?: string | null): boolean {
  if (!role) return false;
  return role === ROLES.ADMIN;
}

export function hasClientAccess(role?: string | null): boolean {
  if (!role) return false;
  return role === ROLES.ADMIN || role === ROLES.CSR || role === ROLES.SIGNING_SURVEYOR || role === ROLES.MARKETER;
}
