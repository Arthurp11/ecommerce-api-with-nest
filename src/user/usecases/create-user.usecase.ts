import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user.service';
import { CreateUserDto } from '../dto/create-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(private readonly userService: UserService) {}

  async execute(createUserDto: CreateUserDto) {
    this.logger.log(`Creating user with email ${createUserDto.email}...`);

    const existingUser = await this.userService.findWithEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException(`User with email ${createUserDto.email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, SALT_ROUNDS);

    const userCreated = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
    }); 

    this.logger.log(`User with email ${createUserDto.email} created successfully`);
    
    return userCreated;
  }
}
