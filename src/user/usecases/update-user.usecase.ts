import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user.service';
import { UpdateUserDto } from '../dto/update-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(private readonly userService: UserService) {}

  async execute(id: number, updateUserDto: UpdateUserDto) {
    this.logger.log(`Updating user with ID ${id}...`);

    const data = { ...updateUserDto };

    const user = await this.userService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const userUpdated = await this.userService.update(id, data);

    this.logger.log(`User with ID ${id} updated successfully`);
    
    return userUpdated;
  }
}
