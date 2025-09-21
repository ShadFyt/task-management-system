import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../core/public.decorator';
import { UserDto } from '../users/users.dto';
import { AuthBodyDto, AuthResponseDto } from './auth.dto';
import { userSchema, User } from '@task-management-system/data';
import { AuthResponse } from '@task-management-system/auth';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: AuthBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Request() req: AuthenticatedRequest): Promise<AuthResponse> {
    return this.authService.login(req.user);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  async logout(@Request() req: AuthenticatedRequest): Promise<void> {
    const user = req.user;
    await this.authService.logout(user.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('self')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user info', type: UserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async self(@Request() req: AuthenticatedRequest): Promise<User> {
    const { success, data } = userSchema.safeParse(req.user);
    if (!success)
      throw new InternalServerErrorException('Failed to parse user data');
    return data;
  }
}
