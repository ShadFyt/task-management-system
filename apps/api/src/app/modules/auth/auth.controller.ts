import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
  InternalServerErrorException,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../core/public.decorator';
import {
  userSchema,
  User,
  AuthenticatedUser,
} from '@task-management-system/data';
import {
  authBodySchema,
  authResponseSchema,
} from '@task-management-system/auth';
import { createZodDto } from 'nestjs-zod';
import { RefreshAuthGuard } from './jwt-auth.guard';
import { UserDto } from '../../common/dtos';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

interface AuthenticatedRefreshRequest extends Request {
  user: { sub: string; email: string };
}

class AuthResponseDto extends createZodDto(authResponseSchema) {}
class AuthBodyDto extends createZodDto(authBodySchema) {}

const REFRESH_TOKEN_COOKIE_KEY = 'refresh_token';

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
  async login(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response
  ) {
    const authResponse = await this.authService.generateAuthResponse(
      req.user.id
    );
    this.setRefreshTokenCookie(res, authResponse.refreshToken);
    return authResponse;
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  async logout(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    const user = req.user;
    await this.authService.logout(user.id);
    res.clearCookie(REFRESH_TOKEN_COOKIE_KEY, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
    });
  }

  @ApiBearerAuth('JWT-auth')
  @Get('self')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Current user info',
    type: UserDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async self(@Request() req: AuthenticatedRequest): Promise<User> {
    const { success, data } = userSchema.safeParse(req.user);
    if (!success)
      throw new InternalServerErrorException('Failed to parse user data');
    return data;
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Get('refresh')
  async refreshTokens(
    @Req() req: AuthenticatedRefreshRequest,
    @Res({ passthrough: true }) res: Response
  ) {
    const authResponse = await this.authService.generateAuthResponse(
      req.user.sub
    );
    this.setRefreshTokenCookie(res, authResponse.refreshToken);
    return authResponse;
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      // domain: '127.0.0.1',
    });
  }
}
