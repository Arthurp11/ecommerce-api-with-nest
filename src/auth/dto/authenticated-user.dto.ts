import { UserRole } from "src/user/enums/user-role.enum";

export class AuthenticatedUserDto {
    userId: number;
    email: string;
    role: UserRole;
}
