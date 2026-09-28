import { Migration } from '@mikro-orm/migrations';

export class Migration20260928225407 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "cart" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null);`);
    this.addSql(`alter table "cart" add constraint "cart_user_id_unique" unique ("user_id");`);

    this.addSql(`create table "cart_item" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "cart_id" int not null, "product_id" int not null, "quantity" int not null);`);
    this.addSql(`alter table "cart_item" add constraint "cart_item_cart_id_product_id_unique" unique ("cart_id", "product_id");`);

    this.addSql(`alter table "cart" add constraint "cart_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "cart_item" add constraint "cart_item_cart_id_foreign" foreign key ("cart_id") references "cart" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "cart_item" add constraint "cart_item_product_id_foreign" foreign key ("product_id") references "product" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "cart_item" drop constraint "cart_item_cart_id_foreign";`);

    this.addSql(`drop table if exists "cart" cascade;`);

    this.addSql(`drop table if exists "cart_item" cascade;`);
  }

}
