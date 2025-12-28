import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with extended configuration
// We extend the connection string with additional options
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Increase timeout to prevent ECONNRESET on long operations
  connectTimeout: 60000, // 60 seconds
});
export const db = drizzle(pool, { schema, mode: "default" });
