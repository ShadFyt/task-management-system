import { SetMetadata } from '@nestjs/common';

/**
 * Public decorator to mark routes that should skip JWT authentication
 * Use this on endpoints that don't require authentication (like login, register, etc.)
 */
export const Public = () => SetMetadata('isPublic', true);
