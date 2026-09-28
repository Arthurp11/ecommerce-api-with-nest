import { Migration } from '@mikro-orm/migrations';

export class Migration20260928225755 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "orders" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" int not null, "status" text check ("status" in ('pending_payment', 'paid', 'shipped', 'delivered', 'cancelled')) not null default 'pending_payment', "subtotal_in_cents" int not null, "shipping_in_cents" int not null default 0, "total_in_cents" int not null, "shipping_address" jsonb not null);`);
    this.addSql(`create index "orders_status_index" on "orders" ("status");`);
    this.addSql(`create index "orders_user_id_created_at_index" on "orders" ("user_id", "created_at");`);

    this.addSql(`create table "payment" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "order_id" int not null, "provider" varchar(255) not null, "external_id" varchar(255) not null, "amount_in_cents" int not null, "status" text check ("status" in ('pending', 'approved', 'rejected', 'refunded')) not null default 'pending', "checkout_url" varchar(255) null);`);
    this.addSql(`create index "payment_order_id_index" on "payment" ("order_id");`);
    this.addSql(`alter table "payment" add constraint "payment_external_id_unique" unique ("external_id");`);

    this.addSql(`create table "order_item" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "order_id" int not null, "product_id" int null, "product_name" varchar(255) not null, "sku" varchar(255) not null, "unit_price_in_cents" int not null, "quantity" int not null, "line_total_in_cents" int not null);`);

    this.addSql(`alter table "orders" add constraint "orders_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "payment" add constraint "payment_order_id_foreign" foreign key ("order_id") references "orders" ("id") on update cascade;`);

    this.addSql(`alter table "order_item" add constraint "order_item_order_id_foreign" foreign key ("order_id") references "orders" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "order_item" add constraint "order_item_product_id_foreign" foreign key ("product_id") references "product" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "payment" drop constraint "payment_order_id_foreign";`);

    this.addSql(`alter table "order_item" drop constraint "order_item_order_id_foreign";`);

    this.addSql(`drop table if exists "orders" cascade;`);

    this.addSql(`drop table if exists "payment" cascade;`);

    this.addSql(`drop table if exists "order_item" cascade;`);
  }

}
