import {
  Controller,
  Request,
  Post,
  UseGuards,
  SerializeOptions,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserDto } from '@task-management-system/data';
import { AuthBodyDto, AuthResponseDto } from '@task-management-system/auth';
import { AuthService } from './auth.service';
import { Public } from '../../core/public.decorator';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @SerializeOptions({ type: AuthResponseDto })
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
  async login(@Request() req: AuthenticatedRequest): Promise<AuthResponseDto> {
    return this.authService.login(req.user);
  }
}
