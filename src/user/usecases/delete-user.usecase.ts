import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ForeignKeyConstraintViolationException } from '@mikro-orm/core';
import { UserService } from '../user.service';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(private readonly userService: UserService) {}

  async execute(id: number, userFromJwt: AuthenticatedUserDto) {
    this.logger.log(`Deleting user with ID ${id}...`);

    const user = await this.userService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.id !== userFromJwt.userId) {
      throw new ForbiddenException(`You can only delete your own account`);
    }

    try {
      await this.userService.remove(id);
    } catch (error) {
      if (error instanceof ForeignKeyConstraintViolationException) {
        throw new ConflictException('Accounts with order history cannot be deleted');
      }
      throw error;
    }

    this.logger.log(`User with ID ${id} deleted successfully`);
  }
}
