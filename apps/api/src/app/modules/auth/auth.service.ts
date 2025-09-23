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
    const payload = { sub: user.id, email: user.email };
    const foundUser = await this.userService.findOneByIdOrThrow(user.id);

    const { organization, ...rest } = foundUser;

    const subOrganizations = organization.children.map((org) => ({
      id: org.id,
      name: org.name,
    }));
    const mappedOrganization = {
      id: foundUser.organizationId,
      name: foundUser.organization.name,
    };
    const jwtPayload = {
      sub: foundUser.id,
      id: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
      name: foundUser.name,
      organization: mappedOrganization,
      subOrganizations,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    const hashedRefreshToken = await this.hashPassword(refreshToken);
    const refreshTokenEntity = this.tokenRepository.create({
      type: 'refresh',
      jwtToken: hashedRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await this.tokenRepository.save(refreshTokenEntity);

    this.logger.log(`Generated tokens for user: ${user.email}`);

    const { success, data } = userSchema.safeParse({
      ...rest,
      subOrganizations,
      organization: mappedOrganization,
    });
    if (!success) {
      throw new InternalServerErrorException('Failed to parse user data');
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
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
