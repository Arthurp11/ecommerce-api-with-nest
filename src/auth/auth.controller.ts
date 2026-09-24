import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { AuthenticatedUserDto } from "./dto/authenticated-user.dto";
import { IsPublic } from "./decorators/is-public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) {}

    @IsPublic()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('login')
    login(@Body() LoginDto: LoginDto) {
        return this.authService.login(LoginDto);
    }

    @IsPublic()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('refresh')
    refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refresh(refreshTokenDto.refreshToken);
    }

    @Post('logout')
    logout(@CurrentUser() user: AuthenticatedUserDto) {
        return this.authService.logout(user.userId);
    }

    @IsPublic()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('forgot-password')
    forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto.email);
    }

    @IsPublic()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @Post('reset-password')
    resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(
            resetPasswordDto.token,
            resetPasswordDto.newPassword,
        );
    }
}