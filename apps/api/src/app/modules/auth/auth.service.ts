import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../users/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from './token.entity';
import { AuthBody, AuthResponse } from '@task-management-system/auth';
import { userSchema, User } from '@task-management-system/data';
import { User as UserEntity } from '../users/users.entity';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });

  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>
  ) {}

  async validateUser(dto: AuthBody): Promise<User | null> {
    const { email, password } = dto;
    this.logger.log(`Validating user: ${email}`);
    const user = await this.userService.findOneByEmail(email);
    if (user && (await this.comparePassword(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async generateAuthResponse(userId: string): Promise<AuthResponse> {
    const foundUser = await this.userService.findOneByIdOrThrow(userId);

    const {
      accessToken,
      refreshToken,
      user: userData,
      jti,
    } = await this.signTokens(foundUser);

    await this.saveRefreshToken(refreshToken, foundUser.id, jti);

    const { success, data } = userSchema.safeParse(userData);
    if (!success) {
      throw new InternalServerErrorException('Failed to parse user data');
    }

    return {
      accessToken,
      refreshToken,
      user: data,
    };
  }

  async logout(userId: string) {
    try {
      const result = await this.tokenRepository.delete({ userId });
      this.logger.log(`Deleted ${result.affected} tokens for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete tokens for user ${userId}:`, error);
      throw new BadRequestException(
        `Failed to delete tokens for user ${userId}`
      );
    }
  }

  /**
   * Generates JWT access and refresh tokens for the specified user.
   * Maps the user's organization and sub-organizations into the JWT payload.
   * Signs both tokens asynchronously with different expiration times.
   * @param user - The user entity for which to generate the tokens.
   * @returns An object containing the signed access token, refresh token, and sanitized user data.
   */
  async signTokens(user: UserEntity) {
    const jti = randomUUID();

    const { organization, ...rest } = user;

    const subOrganizations = organization.children.map((org) => ({
      id: org.id,
      name: org.name,
    }));
    const mappedOrganization = {
      id: organization.id,
      name: organization.name,
    };

    // TODO: implement cache-based permissions instead of including them in the JWT payload
    const jwtPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      organization: mappedOrganization,
      subOrganizations,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(
        { sub: user.id, email: user.email, jti },
        {
          expiresIn: '7d',
        }
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { ...rest, organization: mappedOrganization, subOrganizations },
      jti,
    };
  }

  /**
   * Validates a refresh token and ensures it has not been used before.
   * Throws an UnauthorizedException if the token is invalid or has been used.
   * @param jti - The JWT ID of the refresh token to validate.
   * @returns The validated token.
   */
  async validateRefreshToken(jti: string) {
    const foundToken = await this.tokenRepository.findOneBy({
      id: jti,
    });
    if (!foundToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (foundToken.isUsed) {
      await this.tokenRepository.delete(foundToken.id);
      throw new UnauthorizedException('Refresh token already used');
    }
    foundToken.isUsed = true;
    await this.tokenRepository.save(foundToken);
    return foundToken;
  }

  /**
   * Save a refresh token for a user
   * @param refreshToken - The refresh token to save
   * @param userId - The ID of the user
   * @param jti - The JTI of the refresh token
   */
  private async saveRefreshToken(
    refreshToken: string,
    userId: string,
    jti: string
  ): Promise<void> {
    const hashedRefreshToken = await this.hashPassword(refreshToken);
    const refreshTokenEntity = this.tokenRepository.create({
      id: jti,
      type: 'refresh',
      jwtToken: hashedRefreshToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await this.tokenRepository.save(refreshTokenEntity);
  }

  /**
   * Hash a plain text password using bcrypt
   * @param password - Plain text password to hash
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   * @param password - Plain text password
   * @param hashedPassword - Hashed password to compare against
   * @returns True if passwords match, false otherwise
   */
  async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
