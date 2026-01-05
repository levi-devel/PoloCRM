import type { Express, RequestHandler } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import type { User } from "../../shared/models/auth";

const SALT_ROUNDS = 10;

// Predefined users - these will be initialized on server start
// Admin credentials are loaded from environment variables for security
export const PREDEFINED_USERS = [
    {
        id: "user-admin",
        email: process.env.ADMIN_EMAIL || "admin@polo.com",
        password: process.env.ADMIN_PASSWORD || "changeme123",
        firstName: "Admin",
        lastName: "System",
        role: "Admin",
    },
];

// Session configuration
export function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    return session({
        secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false, // Set to true in production with HTTPS
            maxAge: sessionTtl,
        },
    });
}

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

// Initialize predefined users in storage
export async function initializePredefinedUsers() {
    console.log("🔐 Initializing predefined users...");

    for (const userData of PREDEFINED_USERS) {
        // Check if user already exists
        const existing = await storage.getUser(userData.id);
        if (existing) {
            // console.log(`Skipping update for existing user: ${userData.email}`);
            continue;
        }

        // Hash the password before storing
        const hashedPassword = await hashPassword(userData.password);

        await storage.upsertUser({
            ...userData,
            password: hashedPassword,
            isActive: true,
            profileImageUrl: undefined,
        });
    }

    console.log(`✅ Predefined users check completed`);
}

// Validate user credentials
export async function validateCredentials(
    email: string,
    password: string
): Promise<User | null> {
    // Get all users from storage
    const users = await storage.getUsers();

    // Find user by email
    const user = users.find((u) => u.email === email);

    if (!user || !user.password) {
        return null;
    }

    // Compare provided password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return null;
    }

    return user;
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
    if (req.session && (req.session as any).userId) {
        return next();
    }

    res.status(401).json({ message: "Unauthorized" });
};

// Extended session type
declare module "express-session" {
    interface SessionData {
        userId: string;
    }
}
