import { User } from './users.entity';
import mockRole from '../roles/roles.mock';
import mockOrganization from '../organizations/organizations.mock';
const mockUser = new User();

mockUser.name = 'user';
mockUser.id = 'user-1';
mockUser.createdAt = new Date();
mockUser.updatedAt = new Date();
mockUser.email = 'user@example.com';
mockUser.password = 'password';
mockUser.organizationId = mockOrganization.id;
mockUser.organization = mockOrganization;
mockUser.role = mockRole;

export default mockUser;
