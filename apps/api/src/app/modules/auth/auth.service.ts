import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserService } from '../users/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from './token.entity';
import { UserDto } from '../users/users.dto';
import { User, userSchema } from '@task-management-system/data';
import { AuthBody, AuthResponse } from '@task-management-system/auth';
import { User as UserEntity } from '../users/users.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name, { timestamp: true });

  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>
  ) {}

  async validateUser(dto: AuthBody): Promise<UserDto | null> {
    const { email, password } = dto;
    this.logger.log(`Validating user: ${email}`);
    const user = await this.userService.findOneByEmail(email);
    if (user && (await this.comparePassword(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User): Promise<AuthResponse> {
    const foundUser = await this.userService.findOneByIdOrThrow(user.id);

    const {
      accessToken,
      refreshToken,
      user: userData,
    } = await this.signTokens(foundUser);

    await this.saveRefreshToken(refreshToken, user.id);

    this.logger.log(`Generated tokens for user: ${user.email}`);

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
    const { organization, ...rest } = user;

    const subOrganizations = organization.children.map((org) => ({
      id: org.id,
      name: org.name,
    }));
    const mappedOrganization = {
      id: organization.id,
      name: organization.name,
    };
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
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(jwtPayload, {
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { ...rest, organization: mappedOrganization, subOrganizations },
    };
  }

  /**
   * Save a refresh token for a user
   * @param refreshToken - The refresh token to save
   * @param userId - The ID of the user
   */
  private async saveRefreshToken(
    refreshToken: string,
    userId: string
  ): Promise<void> {
    const hashedRefreshToken = await this.hashPassword(refreshToken);
    const refreshTokenEntity = this.tokenRepository.create({
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
