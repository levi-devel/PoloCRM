import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, validateCredentials } from "./local-auth";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// Register authentication routes
export function registerAuthRoutes(app: Express): void {
    // Login endpoint
    app.post("/api/auth/login", async (req, res) => {
        try {
            const { email, password } = loginSchema.parse(req.body);

            const user = await validateCredentials(email, password);

            if (!user) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            if (!user.isActive) {
                return res.status(403).json({ message: "User account is inactive" });
            }

            // Create session
            (req.session as any).userId = user.id;

            res.json({
                message: "Login successful",
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid request data" });
            }
            console.error("Login error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Get current authenticated user
    app.get("/api/auth/user", isAuthenticated, async (req, res) => {
        try {
            const userId = (req.session as any).userId;
            const user = await storage.getUser(userId);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            res.json(user);
        } catch (error) {
            console.error("Error fetching user:", error);
            res.status(500).json({ message: "Failed to fetch user" });
        }
    });

    // Logout endpoint
    app.post("/api/auth/logout", (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error:", err);
                return res.status(500).json({ message: "Failed to logout" });
            }
            res.json({ message: "Logout successful" });
        });
    });
}
