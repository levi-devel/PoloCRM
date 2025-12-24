import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "../storage";
import type { User } from "../../shared/models/auth";

// Predefined users - these will be initialized on server start
export const PREDEFINED_USERS = [
    {
        id: "user-admin",
        email: "admin@polo.com",
        password: "senha123",
        firstName: "Admin",
        lastName: "Polo",
        role: "Gerente",
    },
    {
        id: "user-1",
        email: "carlos@polotelecom.com.br",
        password: "Mudar@123",
        firstName: "Carlos",
        lastName: "Levi",
        role: "Admin",
    },
    {
        id: "user-2",
        email: "ryan.silva@polotelecom.com.br",
        password: "Mudar@123",
        firstName: "Ryan",
        lastName: "Silva",
        role: "Técnico",
    },
    {
        id: "user-3",
        email: "celio@polotelecom.com.br",
        password: "Mudar@123",
        firstName: "Célio",
        lastName: "Carvalho",
        role: "Admin",
    },
    {
        id: "user-4",
        email: "bruno@polotelecom.com.br",
        password: "Mudar@123",
        firstName: "Bruno",
        lastName: "Gomes",
        role: "Técnico",
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

// Initialize predefined users in storage
export async function initializePredefinedUsers() {
    console.log("🔐 Initializing predefined users...");

    for (const userData of PREDEFINED_USERS) {
        await storage.upsertUser({
            ...userData,
            isActive: true,
            profileImageUrl: undefined,
        });
    }

    console.log(`✅ Initialized ${PREDEFINED_USERS.length} users`);
}

// Validate user credentials
export async function validateCredentials(
    email: string,
    password: string
): Promise<User | null> {
    // Get all users from storage
    const users = await storage.getUsers();

    // Find user by email and password
    const user = users.find(
        (u) => u.email === email && u.password === password
    );

    return user || null;
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
