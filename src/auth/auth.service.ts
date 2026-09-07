import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import * as bcrypt from 'bcrypt';
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UserService } from "src/user/user.service";

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user = await this.userService.findMinimalForJwt(email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = this.jwtService.sign({
            userId: user.id,
            email: user.email
        });

        const refreshToken = this.jwtService.sign(
            {
                userId: user.id,
                email: user.email
            },
            {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN')
            }
        );

        const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
        await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

        this.logger.log(`User ${user.email} logged in successfully`);

        return {
            message: 'Login successful',
            accessToken,
            refreshToken
        };
    }

    async refresh(refreshToken: string) {
        let payload: { userId: number; email: string };

        try {
            payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET')
            });
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.userService.findForRefreshToken(payload.userId);

        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

        if (!isMatch) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const accessToken = this.jwtService.sign({
            userId: user.id,
            email: user.email
        });

        const newRefreshToken = this.jwtService.sign(
            {
                userId: user.id,
                email: user.email
            },
            {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN')
            }
        );

        const hashedRefreshToken = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);
        await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

        return {
            message: 'Token refreshed successfully',
            accessToken,
            refreshToken: newRefreshToken
        };
    }

    async logout(userId: number) {
        await this.userService.updateRefreshToken(userId, null);
        return { message: 'Logout successful' };
    }
}