import { TestBed, Mocked } from '@suites/unit';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { Token } from './token.entity';
import { AuthBody } from '@task-management-system/auth';
import { User } from '../users/users.entity';
import mockUser from '../users/user.mock';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const expectedJwtPayload = {
  id: mockUser.id,
  sub: mockUser.id,
  email: mockUser.email,
  name: mockUser.name,
  organization: {
    id: mockUser.organizationId,
    name: mockUser.organization.name,
  },
  role: mockUser.role,
  subOrganizations: [],
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: Mocked<UserService>;
  let jwtService: Mocked<JwtService>;
  let tokenRepository: Mocked<Repository<Token>>;
  let bcryptHashMock: jest.MockedFunction<typeof bcrypt.hash>;
  let bcryptCompareMock: jest.MockedFunction<typeof bcrypt.compare>;

  const mockAuthBody: AuthBody = {
    email: 'test@example.com',
    password: 'plainPassword123',
  };

  const mockToken = {
    id: 'token-123',
    type: 'refresh' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isUsed: false,
    jwtToken: 'hashedRefreshToken',
    userId: 'user-123',
    user: mockUser,
  };

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(AuthService).compile();

    service = unit;
    userService = unitRef.get<UserService>(UserService);
    jwtService = unitRef.get<JwtService>(JwtService);
    tokenRepository = unitRef.get<Repository<Token>>(
      `${getRepositoryToken(Token)}`
    );
    bcryptHashMock = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
    bcryptCompareMock = bcrypt.compare as jest.MockedFunction<
      typeof bcrypt.compare
    >;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      userService.findOneByEmail.mockResolvedValue(mockUser);
      bcryptCompareMock.mockImplementation(() => true);

      const result = await service.validateUser(mockAuthBody);

      const { password, ...rest } = mockUser;
      expect(result).toEqual(rest);
      expect(userService.findOneByEmail).toHaveBeenCalledWith(
        mockAuthBody.email
      );
      expect(bcryptCompareMock).toHaveBeenCalledWith(
        mockAuthBody.password,
        mockUser.password
      );
    });

    it('should return null when user is not found', async () => {
      userService.findOneByEmail.mockResolvedValue(null);

      const result = await service.validateUser(mockAuthBody);

      expect(result).toBeNull();
      expect(userService.findOneByEmail).toHaveBeenCalledWith(
        mockAuthBody.email
      );
      expect(bcryptCompareMock).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      userService.findOneByEmail.mockResolvedValue(mockUser);
      bcryptCompareMock.mockImplementation(() => false);

      const result = await service.validateUser(mockAuthBody);

      expect(result).toBeNull();
      expect(userService.findOneByEmail).toHaveBeenCalledWith(
        mockAuthBody.email
      );
      expect(bcryptCompareMock).toHaveBeenCalledWith(
        mockAuthBody.password,
        mockUser.password
      );
    });

    it('should handle service errors gracefully', async () => {
      userService.findOneByEmail.mockRejectedValue(new Error('Database error'));

      await expect(service.validateUser(mockAuthBody)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('login', () => {
    const mockAccessToken = 'mock.access.token';
    const mockRefreshToken = 'mock.refresh.token';
    const mockHashedRefreshToken = 'hashedRefreshToken';

    beforeEach(() => {
      jwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
      tokenRepository.create.mockReturnValue(mockToken as any);
      tokenRepository.save.mockResolvedValue(mockToken as any);
      userService.findOneByIdOrThrow.mockResolvedValue(mockUser);
    });

    it('should generate tokens and return auth response', async () => {
      jest
        .spyOn(service, 'hashPassword')
        .mockResolvedValue(mockHashedRefreshToken);
      jest.spyOn(service, 'signTokens').mockResolvedValue({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: {
          ...mockUser,
          organization: {
            id: mockUser.organizationId,
            name: mockUser.organization.name,
          },
          subOrganizations: [],
        },
      });

      const result = await service.login(mockUser as User);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          organization: {
            id: mockUser.organizationId,
            name: mockUser.organization.name,
          },
          role: mockUser.role,
          subOrganizations: [],
        }),
      });

      // Verify refresh token was stored
      expect(tokenRepository.create).toHaveBeenCalledWith({
        type: 'refresh',
        jwtToken: expect.any(String),
        userId: mockUser.id,
        expiresAt: expect.any(Date),
      });
      expect(tokenRepository.save).toHaveBeenCalledWith(mockToken);
    });

    it('should handle user service errors', async () => {
      userService.findOneByIdOrThrow.mockRejectedValue(
        new Error('User not found')
      );

      await expect(service.login(mockUser as User)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('logout', () => {
    it('should delete user tokens successfully', async () => {
      const userId = 'user-123';
      const deleteResult = { affected: 2, raw: {} };
      tokenRepository.delete.mockResolvedValue(deleteResult);

      await service.logout(userId);

      expect(tokenRepository.delete).toHaveBeenCalledWith({ userId });
    });

    it('should handle case when no tokens are found', async () => {
      const userId = 'user-123';
      const deleteResult = { affected: 0, raw: {} };
      tokenRepository.delete.mockResolvedValue(deleteResult);
      await service.logout(userId);
      expect(tokenRepository.delete).toHaveBeenCalledWith({ userId });
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const plainPassword = 'testPassword123';
      const hashedPassword = 'hashedPassword123';
      bcryptHashMock.mockImplementationOnce(() =>
        Promise.resolve(hashedPassword)
      );

      const result = await service.hashPassword(plainPassword);

      expect(result).toBe(hashedPassword);
      expect(bcryptHashMock).toHaveBeenCalledWith(plainPassword, 12);
    });

    it('should handle bcrypt errors', async () => {
      const plainPassword = 'testPassword123';
      bcryptHashMock.mockImplementationOnce(() =>
        Promise.reject(new Error('Hashing failed'))
      );

      await expect(service.hashPassword(plainPassword)).rejects.toThrow(
        'Hashing failed'
      );
    });
  });

  describe('comparePassword', () => {
    it('should return true when passwords match', async () => {
      const plainPassword = 'testPassword123';
      const hashedPassword = 'hashedPassword123';
      bcryptCompareMock.mockImplementation(() => Promise.resolve(true));

      const result = await service.comparePassword(
        plainPassword,
        hashedPassword
      );

      expect(result).toBe(true);
      expect(bcryptCompareMock).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword
      );
    });

    it('should return false when passwords do not match', async () => {
      const plainPassword = 'testPassword123';
      const hashedPassword = 'differentHashedPassword';
      bcryptCompareMock.mockImplementation(() => Promise.resolve(false));

      const result = await service.comparePassword(
        plainPassword,
        hashedPassword
      );

      expect(result).toBe(false);
      expect(bcryptCompareMock).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword
      );
    });
  });

  describe('signTokens', () => {
    it('should be defined', () => {
      expect(service.signTokens).toBeDefined();
    });

    it('should sign tokens and return access token, refresh token, and user data', async () => {
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      const result = await service.signTokens(mockUser);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: {
          ...mockUser,
          organization: {
            id: mockUser.organizationId,
            name: mockUser.organization.name,
          },
          subOrganizations: [],
        },
      });
    });

    it('should call jwtService.signAsync with correct parameters for access token', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.signTokens(mockUser);

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expectedJwtPayload,
        {
          expiresIn: '1h',
        }
      );
    });
  });
});
