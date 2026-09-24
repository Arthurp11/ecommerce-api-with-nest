import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdateUserUseCase } from './update-user.usecase';
import { UserService } from '../user.service';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userService: jest.Mocked<UserService>;

  const currentUser: AuthenticatedUserDto = { userId: 1, email: 'jane@doe.com' };

  beforeEach(() => {
    userService = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    useCase = new UpdateUserUseCase(userService);
  });

  it('throws NotFoundException when the user does not exist', async () => {
    userService.findOne.mockResolvedValue(null);

    await expect(useCase.execute(1, { name: 'New name' }, currentUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when updating another account', async () => {
    userService.findOne.mockResolvedValue({ id: 2 } as any);

    await expect(useCase.execute(2, { name: 'New name' }, currentUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(userService.update).not.toHaveBeenCalled();
  });

  it('hashes the password when it is part of the update', async () => {
    userService.findOne.mockResolvedValue({ id: 1 } as any);
    userService.update.mockResolvedValue(undefined as any);

    await useCase.execute(1, { password: 'newpassword123' }, currentUser);

    const [, updateArg] = userService.update.mock.calls[0];
    expect(updateArg.password).not.toBe('newpassword123');
    expect(await bcrypt.compare('newpassword123', updateArg.password as string)).toBe(true);
  });

  it('does not touch the password field when it is not being updated', async () => {
    userService.findOne.mockResolvedValue({ id: 1 } as any);
    userService.update.mockResolvedValue(undefined as any);

    await useCase.execute(1, { name: 'New name' }, currentUser);

    const [, updateArg] = userService.update.mock.calls[0];
    expect(updateArg.password).toBeUndefined();
  });
});
