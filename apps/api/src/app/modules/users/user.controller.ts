import { UserService } from './user.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/rbac.decorators';
import { User } from '../../common/decorators/user.decorator';
import { User as AuthUser } from '@task-management-system/data';
import { OrgIdQueryDto, UserBareDto, UserDto } from '../../common/dtos';
import { ZodResponse } from 'nestjs-zod';

@UseGuards(PermissionGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermission('read:user:any')
  @ZodResponse({
    type: [UserBareDto],
    status: 200,
    description: 'List of users',
  })
  findAll(
    @User() user: AuthUser,
    @Query() query: OrgIdQueryDto
  ): Promise<UserDto[]> {
    return this.userService.findAll(user, query.orgId);
  }
}
