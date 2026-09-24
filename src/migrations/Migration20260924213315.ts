import { Migration } from '@mikro-orm/migrations';

export class Migration20260924213315 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "category" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "slug" varchar(255) not null, "description" text null);`);
    this.addSql(`alter table "category" add constraint "category_name_unique" unique ("name");`);
    this.addSql(`alter table "category" add constraint "category_slug_unique" unique ("slug");`);

    this.addSql(`create table "product" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "slug" varchar(255) not null, "description" text not null, "price_in_cents" int not null, "stock" int not null, "sku" varchar(255) not null, "images" text[] not null, "is_active" boolean not null default true, "category_id" int not null);`);
    this.addSql(`alter table "product" add constraint "product_slug_unique" unique ("slug");`);
    this.addSql(`alter table "product" add constraint "product_sku_unique" unique ("sku");`);
    this.addSql(`create index "product_category_id_is_active_index" on "product" ("category_id", "is_active");`);

    this.addSql(`alter table "product" add constraint "product_category_id_foreign" foreign key ("category_id") references "category" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product" drop constraint "product_category_id_foreign";`);

    this.addSql(`drop table if exists "category" cascade;`);

    this.addSql(`drop table if exists "product" cascade;`);
  }

}
