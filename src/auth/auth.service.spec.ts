import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { MailService } from 'src/mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/user/enums/user-role.enum';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let authService: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(() => {
    userService = {
      findMinimalForJwt: jest.fn(),
      findForRefreshToken: jest.fn(),
      updateRefreshToken: jest.fn(),
      findWithEmail: jest.fn(),
      setPasswordResetToken: jest.fn(),
      findByPasswordResetTokenHash: jest.fn(),
      resetPassword: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mailService = {
      sendPasswordResetEmail: jest.fn(),
    } as unknown as jest.Mocked<MailService>;

    authService = new AuthService(userService, jwtService, configService, mailService);
  });

  describe('login', () => {
    it('throws UnauthorizedException when the user does not exist', async () => {
      userService.findMinimalForJwt.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'jane@doe.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      userService.findMinimalForJwt.mockResolvedValue({
        id: 1,
        email: 'jane@doe.com',
        password: hashedPassword,
      } as any);

      await expect(
        authService.login({ email: 'jane@doe.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns access and refresh tokens and stores the hashed refresh token', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      userService.findMinimalForJwt.mockResolvedValue({
        id: 1,
        email: 'jane@doe.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
      } as any);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await authService.login({
        email: 'jane@doe.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(1, sha256('refresh-token'));
      expect(jwtService.sign).toHaveBeenNthCalledWith(1, {
        userId: 1,
        email: 'jane@doe.com',
        role: UserRole.CUSTOMER,
      });
    });

    it('puts a unique jti in every refresh token', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      userService.findMinimalForJwt.mockResolvedValue({
        id: 1,
        email: 'jane@doe.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
      } as any);
      jwtService.sign.mockReturnValue('token');

      await authService.login({ email: 'jane@doe.com', password: 'correct-password' });
      await authService.login({ email: 'jane@doe.com', password: 'correct-password' });

      const firstJti = (jwtService.sign.mock.calls[1][0] as any).jti;
      const secondJti = (jwtService.sign.mock.calls[3][0] as any).jti;
      expect(firstJti).toEqual(expect.any(String));
      expect(firstJti).not.toBe(secondJti);
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when the refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.refresh('bad-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the user has no stored refresh token', async () => {
      jwtService.verify.mockReturnValue({ userId: 1, email: 'jane@doe.com' });
      userService.findForRefreshToken.mockResolvedValue({ id: 1, refreshToken: null } as any);

      await expect(authService.refresh('some-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the token does not match the stored hash', async () => {
      const storedHash = sha256('a-different-refresh-token');
      jwtService.verify.mockReturnValue({ userId: 1, email: 'jane@doe.com' });
      userService.findForRefreshToken.mockResolvedValue({
        id: 1,
        refreshToken: storedHash,
      } as any);

      await expect(authService.refresh('some-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues a new token pair when the refresh token is valid', async () => {
      const storedHash = sha256('valid-refresh-token');
      jwtService.verify.mockReturnValue({ userId: 1, email: 'jane@doe.com' });
      userService.findForRefreshToken.mockResolvedValue({
        id: 1,
        email: 'jane@doe.com',
        refreshToken: storedHash,
      } as any);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(1, sha256('new-refresh-token'));
    });

    it('rejects a refresh token that was already rotated out', async () => {
      const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImp0aSI6ImFhYSJ9.old';
      const currentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImp0aSI6ImFhYSJ9.new';
      jwtService.verify.mockReturnValue({ userId: 1 });
      userService.findForRefreshToken.mockResolvedValue({
        id: 1,
        email: 'jane@doe.com',
        refreshToken: sha256(currentToken),
      } as any);

      await expect(authService.refresh(oldToken)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(userService.updateRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token', async () => {
      await authService.logout(1);

      expect(userService.updateRefreshToken).toHaveBeenCalledWith(1, null);
    });
  });

  describe('forgotPassword', () => {
    it('generates and stores a reset token when the user exists', async () => {
      userService.findWithEmail.mockResolvedValue({ id: 1, email: 'jane@doe.com' } as any);

      await authService.forgotPassword('jane@doe.com');

      expect(userService.setPasswordResetToken).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.any(Date),
      );
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'jane@doe.com',
        expect.any(String),
      );
    });

    it('does not leak whether the email exists', async () => {
      userService.findWithEmail.mockResolvedValue(null);

      const result = await authService.forgotPassword('unknown@doe.com');

      expect(userService.setPasswordResetToken).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toMatch(/if an account/i);
    });
  });

  describe('resetPassword', () => {
    it('throws UnauthorizedException when the token does not match any user', async () => {
      userService.findByPasswordResetTokenHash.mockResolvedValue(null);

      await expect(authService.resetPassword('bad-token', 'newpassword123')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the token has expired', async () => {
      userService.findByPasswordResetTokenHash.mockResolvedValue({
        id: 1,
        passwordResetExpiresAt: new Date(Date.now() - 1000),
      } as any);

      await expect(
        authService.resetPassword('expired-token', 'newpassword123'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(userService.resetPassword).not.toHaveBeenCalled();
    });

    it('updates the password when the token is valid', async () => {
      userService.findByPasswordResetTokenHash.mockResolvedValue({
        id: 1,
        passwordResetExpiresAt: new Date(Date.now() + 60_000),
      } as any);

      await authService.resetPassword('valid-token', 'newpassword123');

      const [id, hashedPassword] = userService.resetPassword.mock.calls[0];
      expect(id).toBe(1);
      expect(await bcrypt.compare('newpassword123', hashedPassword as string)).toBe(true);
    });
  });
});
