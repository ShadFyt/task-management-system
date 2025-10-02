import { createZodDto } from 'nestjs-zod';
import { userSchema } from '@task-management-system/data';

export class UserDto extends createZodDto(userSchema) {}
