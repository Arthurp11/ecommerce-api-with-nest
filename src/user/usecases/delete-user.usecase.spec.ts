import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteUserUseCase } from './delete-user.usecase';
import { UserService } from '../user.service';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { UserRole } from 'src/user/enums/user-role.enum';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let userService: jest.Mocked<UserService>;

  const currentUser: AuthenticatedUserDto = {
    userId: 1,
    email: 'jane@doe.com',
    role: UserRole.CUSTOMER,
  };

  beforeEach(() => {
    userService = {
      findOne: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    useCase = new DeleteUserUseCase(userService);
  });

  it('throws NotFoundException when the user does not exist', async () => {
    userService.findOne.mockResolvedValue(null);

    await expect(useCase.execute(1, currentUser)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException when deleting another account', async () => {
    userService.findOne.mockResolvedValue({ id: 2 } as any);

    await expect(useCase.execute(2, currentUser)).rejects.toBeInstanceOf(ForbiddenException);

    expect(userService.remove).not.toHaveBeenCalled();
  });

  it('removes the user when it is the owner', async () => {
    userService.findOne.mockResolvedValue({ id: 1 } as any);
    userService.remove.mockResolvedValue(undefined as any);

    await useCase.execute(1, currentUser);

    expect(userService.remove).toHaveBeenCalledWith(1);
  });
});
