import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { SALT_ROUNDS } from 'src/common/constants';

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(private readonly userService: UserService) {}

  async execute(id: number, updateUserDto: UpdateUserDto, userFromJwt: AuthenticatedUserDto) {
    this.logger.log(`Updating user with ID ${id}...`);

    const data: UpdateUserDto & { refreshToken?: string | null } = { ...updateUserDto };

    const user = await this.userService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.id !== userFromJwt.userId) {
      throw new ForbiddenException(`You can only update your own account`);
    }

    if (data.email && data.email !== user.email) {
      const emailOwner = await this.userService.findWithEmail(data.email);

      if (emailOwner) {
        throw new ConflictException(`User with email ${data.email} already exists`);
      }
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
      data.refreshToken = null;
    }

    const userUpdated = await this.userService.update(id, data);

    this.logger.log(`User with ID ${id} updated successfully`);

    return userUpdated;
  }
}
