import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenGuard } from './auth-token.guard';

describe('AuthTokenGuard', () => {
  let guard: AuthTokenGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;

  const createContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request: any = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new AuthTokenGuard(jwtService, reflector);
  });

  it('allows public routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a protected route with no token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a malformed Authorization header', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(
      guard.canActivate(createContext({ authorization: 'NotBearer sometoken' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired token with "Token expired"', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const expiredError = new Error('jwt expired');
    expiredError.name = 'TokenExpiredError';
    jwtService.verifyAsync.mockRejectedValue(expiredError);

    await expect(
      guard.canActivate(createContext({ authorization: 'Bearer sometoken' })),
    ).rejects.toThrow('Token expired');
  });

  it('attaches the decoded payload to the request when the token is valid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const payload = { userId: 1, email: 'jane@doe.com' };
    jwtService.verifyAsync.mockResolvedValue(payload);

    const request: any = { headers: { authorization: 'Bearer sometoken' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });
});
