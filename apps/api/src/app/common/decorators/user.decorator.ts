import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../modules/auth/auth.type';
import { Role } from '../../modules/roles/roles.entity';
import { User as UserDto } from '@task-management-system/data';

export const User = createParamDecorator(
  (
    data: keyof UserDto | undefined,
    ctx: ExecutionContext
  ): AuthUser | string | Role => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    return data ? user[data] : user;
  }
);
