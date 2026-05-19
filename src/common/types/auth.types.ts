export type Role = 'customer' | 'branch_admin' | 'super_admin';

export const ROLES = {
  customer: 'customer',
  branchAdmin: 'branch_admin',
  superAdmin: 'super_admin',
} as const satisfies Record<string, Role>;

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: Role;
  assignedBranch?: string;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
}

export interface AuthenticatedUser extends JwtAccessPayload {
  id: string;
}
