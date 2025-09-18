import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserDto } from '@task-management-system/data';
import { AuthBodyDto } from '@task-management-system/auth';
import { AuthService } from './auth.service';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: AuthBodyDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: UserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Request() req: AuthenticatedRequest): Promise<UserDto> {
    return req.user;
  }
}
