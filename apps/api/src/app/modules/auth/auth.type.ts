import { Role } from '../roles/roles.entity';

export type AuthUser = {
  sub: string;
  email: string;
  organizationId: string;
  role: Role;
};
