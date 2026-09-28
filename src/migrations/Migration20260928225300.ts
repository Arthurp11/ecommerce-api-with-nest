import { Migration } from '@mikro-orm/migrations';

export class Migration20260928225300 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "address" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null, "recipient_name" varchar(255) not null, "zip_code" varchar(8) not null, "street" varchar(255) not null, "number" varchar(20) not null, "complement" varchar(255) null, "neighborhood" varchar(255) not null, "city" varchar(255) not null, "state" varchar(2) not null, "is_default" boolean not null default false);`);
    this.addSql(`create index "address_user_id_index" on "address" ("user_id");`);

    this.addSql(`alter table "address" add constraint "address_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "address" cascade;`);
  }

}
