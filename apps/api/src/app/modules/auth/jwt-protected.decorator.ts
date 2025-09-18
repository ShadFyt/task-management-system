import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Custom decorator that combines JWT authentication guard and Swagger bearer auth
 */
export function JwtProtected() {
  return applyDecorators(UseGuards(JwtAuthGuard), ApiBearerAuth('JWT-auth'));
}
