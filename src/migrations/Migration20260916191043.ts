import { Migration } from '@mikro-orm/migrations';

export class Migration20260916191043 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "user" add column "password_reset_token_hash" varchar(255) null, add column "password_reset_expires_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop column "password_reset_token_hash", drop column "password_reset_expires_at";`);
  }

}
