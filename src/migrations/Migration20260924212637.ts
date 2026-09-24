import { Migration } from '@mikro-orm/migrations';

export class Migration20260924212637 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "user" add column "role" text check ("role" in ('customer', 'admin')) not null default 'customer';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop column "role";`);
  }

}
