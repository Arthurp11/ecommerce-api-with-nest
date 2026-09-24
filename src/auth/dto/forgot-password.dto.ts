import { NormalizeEmail } from 'src/common/transformers/normalize-email.transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
