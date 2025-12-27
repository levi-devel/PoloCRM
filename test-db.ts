import { db } from "./server/db";
import { users } from "./shared/models/auth";

async function test() {
    try {
        console.log("Testing database connection...");
        const result = await db.select().from(users).limit(1);
        console.log("✅ Database connection successful!");
        console.log("Users found:", result.length);
        process.exit(0);
    } catch (error) {
        console.error("❌ Database connection failed:");
        console.error(error);
        process.exit(1);
    }
}

test();
