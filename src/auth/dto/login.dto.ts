import { NormalizeEmail } from "src/common/transformers/normalize-email.transformer";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
    @NormalizeEmail()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}