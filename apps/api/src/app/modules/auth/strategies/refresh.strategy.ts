import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

const cookieExtractor = (req: Request): string | null => {
  console.log('req.cookies', req.cookies);
  return req.cookies?.refresh_token || null;
};

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh'
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      secretOrKey: configService.get<string>(
        'REFRESH_SECRET',
        'a-string-secret-at-least-256-bits-long'
      ),
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: { sub: string; email: string }) {
    const refreshToken = cookieExtractor(req);
    return { ...payload, refreshToken };
  }
}
