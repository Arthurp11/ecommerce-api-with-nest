import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserUseCase } from './create-user.usecase';
import { UserService } from '../user.service';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userService: jest.Mocked<UserService>;

  beforeEach(() => {
    userService = {
      findWithEmail: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    useCase = new CreateUserUseCase(userService);
  });

  it('throws ConflictException when the email is already in use', async () => {
    userService.findWithEmail.mockResolvedValue({ id: 1, email: 'jane@doe.com' } as any);

    await expect(
      useCase.execute({ name: 'Jane', email: 'jane@doe.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(userService.create).not.toHaveBeenCalled();
  });

  it('hashes the password before persisting the user', async () => {
    userService.findWithEmail.mockResolvedValue(null);
    userService.create.mockImplementation(async (dto) => ({ id: 1, ...dto }) as any);

    await useCase.execute({ name: 'Jane', email: 'jane@doe.com', password: 'password123' });

    const [createArg] = userService.create.mock.calls[0];
    expect(createArg.password).not.toBe('password123');
    expect(await bcrypt.compare('password123', createArg.password)).toBe(true);
  });
});
