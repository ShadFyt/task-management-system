import { Organization } from './organizations.entity';

const mockOrganization = new Organization();

mockOrganization.id = 'organization-1';
mockOrganization.name = 'Test Organization';
mockOrganization.parentId = null;
mockOrganization.createdAt = new Date();
mockOrganization.updatedAt = new Date();
mockOrganization.children = [];
mockOrganization.tasks = [];

export default mockOrganization;
