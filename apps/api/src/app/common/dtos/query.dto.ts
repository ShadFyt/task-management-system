import { createZodDto } from 'nestjs-zod';
import { orgIdQuerySchema } from '@task-management-system/data';

export class OrgIdQueryDto extends createZodDto(orgIdQuerySchema) {}
