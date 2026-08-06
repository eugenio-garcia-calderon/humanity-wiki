import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

// Fail loudly here rather than letting drizzle-kit connect to whatever `pg`
// falls back to when a credential is missing.
if (!sqlHost) throw new Error("SQL_HOST must be set in environment variables.");
if (!sqlDbName) throw new Error("SQL_DB_NAME must be set in environment variables.");
if (!user) throw new Error("SQL_ADMIN_USER must be set in environment variables.");
if (!password) throw new Error("SQL_ADMIN_PASSWORD must be set in environment variables.");

console.log(`Using user: ${user} to connect to database.`);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  // PostGIS owns spatial_ref_sys. Without this filter drizzle-kit treats it as
  // an unmanaged table and offers to drop it on every generate.
  tablesFilter: ["!spatial_ref_sys"],
  dbCredentials: {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  },
  verbose: true,
});
