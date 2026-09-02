import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { AuthenticatedUserDto } from "../dto/authenticated-user.dto";
import { IS_PUBLIC_KEY } from "../decorators/is-public.decorator";

@Injectable()
export class AuthTokenGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(
        context: ExecutionContext
    ): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request.headers['authorization']);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const payload: AuthenticatedUserDto = await this.jwtService.verifyAsync(token);
            request.user = payload;
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Token expired');
            }

            throw new UnauthorizedException('Failed to authenticate token');
        }

        return true;
    }

    private extractTokenFromHeader(header: string | undefined): string | null {
        if (!header) {
            return null;
        }
        const parts = header.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        return parts[1];
    }
}