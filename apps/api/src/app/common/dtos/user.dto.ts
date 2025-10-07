import { createZodDto } from 'nestjs-zod';
import { userSchema, userBareSchema } from '@task-management-system/data';

export class UserDto extends createZodDto(userSchema) {}

export class UserBareDto extends createZodDto(userBareSchema) {}
