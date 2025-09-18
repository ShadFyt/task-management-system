import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface AuthenticatedUser {
  id: string;
  email: string;
}

export const User = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext
  ): AuthenticatedUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user[data] : user;
  }
);
