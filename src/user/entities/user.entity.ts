import { Entity, Enum, PrimaryKey, Property } from "@mikro-orm/core";
import { ApiHideProperty } from "@nestjs/swagger";
import { UserRole } from "../enums/user-role.enum";

@Entity()
export class User {
    @PrimaryKey()
    id!: number;

    @Property()
    name!: string;

    @Property({ unique: true })
    email!: string;

    @ApiHideProperty()
    @Property({hidden: true, lazy: true})
    password!: string;

    @Enum({ items: () => UserRole, default: UserRole.CUSTOMER })
    role: UserRole = UserRole.CUSTOMER;

    @ApiHideProperty()
    @Property({nullable: true, hidden: true, lazy: true})
    refreshToken?: string;

    @ApiHideProperty()
    @Property({nullable: true, hidden: true, lazy: true})
    passwordResetTokenHash?: string;

    @ApiHideProperty()
    @Property({nullable: true, hidden: true, lazy: true})
    passwordResetExpiresAt?: Date;
}
