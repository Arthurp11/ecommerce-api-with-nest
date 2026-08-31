import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
      throw new NotFoundException(`You can only delete your own account`);
    }

    const userRemoved = await this.userService.remove(id);

    this.logger.log(`User with ID ${id} deleted successfully`);

    return userRemoved;
  }
}
