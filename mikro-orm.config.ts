import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import { config } from "dotenv";
import { User } from "./src/user/entities/user.entity";
import { BaseEntity } from "./src/common/entities/base.entity";
import { Category } from "./src/category/entities/category.entity";
import { Product } from "./src/product/entities/product.entity";

config();

const mikroOrmConfig = defineConfig({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    entities: [BaseEntity, User, Category, Product],
    extensions: [Migrator],
    migrations: {
        path: './dist/src/migrations',
        pathTs: './src/migrations',
    },
    debug: process.env.NODE_ENV !== 'production',
});

export default mikroOrmConfig;