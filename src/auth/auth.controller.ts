import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { AuthenticatedUserDto } from "./dto/authenticated-user.dto";
import { IsPublic } from "./decorators/is-public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) {}

    @IsPublic()
    @Post('login')
    login(@Body() LoginDto: LoginDto) {
        return this.authService.login(LoginDto);
    }

    @IsPublic()
    @Post('refresh')
    refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refresh(refreshTokenDto.refreshToken);
    }

    @Post('logout')
    logout(@CurrentUser() user: AuthenticatedUserDto) {
        return this.authService.logout(user.userId);
    }
}