import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUserDto } from "../dto/authenticated-user.dto";

export const CurrentUser = createParamDecorator(
    (_data: unknown, context: ExecutionContext): AuthenticatedUserDto => {
        const request = context.switchToHttp().getRequest();
        return request.user;
    },
);
