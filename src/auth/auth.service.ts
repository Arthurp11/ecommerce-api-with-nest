import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UserService } from "src/user/user.service";
import { MailService } from "src/mail/mail.service";

const SALT_ROUNDS = 10;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
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

    async forgotPassword(email: string) {
        const user = await this.userService.findWithEmail(email);

        if (user) {
            const resetToken = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
            const tokenHash = this.hashResetToken(resetToken);
            const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MS);

            await this.userService.setPasswordResetToken(user.id, tokenHash, expiresAt);
            await this.mailService.sendPasswordResetEmail(user.email, resetToken);
        }

        this.logger.log(`Password reset requested for ${email}`);

        return {
            message: 'If an account with that email exists, a password reset link has been sent',
        };
    }

    async resetPassword(token: string, newPassword: string) {
        const tokenHash = this.hashResetToken(token);
        const user = await this.userService.findByPasswordResetTokenHash(tokenHash);

        if (
            !user ||
            !user.passwordResetExpiresAt ||
            user.passwordResetExpiresAt.getTime() < Date.now()
        ) {
            throw new UnauthorizedException('Invalid or expired password reset token');
        }

        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await this.userService.resetPassword(user.id, hashedPassword);

        this.logger.log(`Password reset successfully for user ${user.id}`);

        return { message: 'Password reset successfully' };
    }

    private hashResetToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}