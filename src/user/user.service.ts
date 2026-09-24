import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/knex';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) 
    private readonly userRepository: EntityRepository<User>
  ) {}

  async create(createUserDto: CreateUserDto) {
    const user = this.userRepository.create(createUserDto);
    await this.userRepository.getEntityManager().persist(user).flush();
    return user;
  }

  findAll() {
    return this.userRepository.findAll();
  }

  findOne(id: number) {
    return this.userRepository.findOne({ id });
  }

  findWithEmail(email: string) {
    return this.userRepository.findOne({ email });
  }

  findMinimalForJwt(email: string) {
    return this.userRepository.findOne(
      { email },
      { fields: ['email', 'password'] },
    );
  }

  findForRefreshToken(id: number) {
    return this.userRepository.findOne(
      { id },
      { fields: ['id', 'email', 'refreshToken'] },
    );
  }

  updateRefreshToken(id: number, refreshToken: string | null) {
    return this.userRepository.nativeUpdate({ id }, { refreshToken });
  }

  setPasswordResetToken(id: number, tokenHash: string, expiresAt: Date) {
    return this.userRepository.nativeUpdate(
      { id },
      { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
    );
  }

  findByPasswordResetTokenHash(tokenHash: string) {
    return this.userRepository.findOne(
      { passwordResetTokenHash: tokenHash },
      { fields: ['id', 'passwordResetTokenHash', 'passwordResetExpiresAt'] },
    );
  }

  async resetPassword(id: number, hashedPassword: string) {
    await this.userRepository.nativeUpdate(
      { id },
      {
        password: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        refreshToken: null,
      },
    );
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.userRepository.nativeUpdate({ id }, updateUserDto);  
  }

  remove(id: number) {
    return this.userRepository.nativeDelete({ id });
  }
}
