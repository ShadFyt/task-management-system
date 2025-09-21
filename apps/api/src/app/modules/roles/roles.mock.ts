import { Role } from './roles.entity';

const mockRole = new Role();

mockRole.id = 'role-1';
mockRole.name = 'viewer';
mockRole.description = 'Viewer role with limited access';
mockRole.permissions = []; // Can be populated with permission mocks if needed

export default mockRole;
