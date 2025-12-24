/**
 * User Permission Utilities
 * 
 * This module provides helper functions to manage user permissions
 * based on their role in the system.
 */

export type UserRole = "Admin" | "Gerente Comercial" | "Gerente Supervisor" | "Técnico";

/**
 * Check if a user role has permission to delete items
 */
export function canDelete(role: UserRole | undefined): boolean {
    if (!role) return false;
    return role === "Admin" || role === "Gerente Comercial" || role === "Gerente Supervisor";
}

/**
 * Check if a user role has permission to edit items
 */
export function canEdit(role: UserRole | undefined): boolean {
    if (!role) return false;
    return true; // All roles can edit
}

/**
 * Check if a user role has permission to create items
 */
export function canCreate(role: UserRole | undefined): boolean {
    if (!role) return false;
    return true; // All roles can create
}

/**
 * Menu visibility configuration by role
 */
const menuVisibility: Record<string, UserRole[]> = {
    "Dashboard": ["Admin", "Gerente Comercial", "Gerente Supervisor", "Técnico"],
    "Projetos": ["Admin", "Gerente Comercial", "Gerente Supervisor", "Técnico"],
    "Polo Project": ["Admin", "Gerente Comercial", "Gerente Supervisor", "Técnico"],
    "Funil de Vendas": ["Admin", "Gerente Comercial"],
    "Clientes": ["Admin", "Gerente Comercial", "Gerente Supervisor", "Técnico"],
    "Usuários": ["Admin", "Gerente Comercial", "Gerente Supervisor"],
    "Modelos de Formulário": ["Admin", "Gerente Comercial", "Gerente Supervisor"],
    "Alertas": ["Admin", "Gerente Comercial", "Gerente Supervisor", "Técnico"],
};

/**
 * Check if a user role can view a specific menu
 */
export function canViewMenu(role: UserRole | undefined, menuName: string): boolean {
    if (!role) return false;
    const allowedRoles = menuVisibility[menuName];
    if (!allowedRoles) return true; // If not configured, allow all
    return allowedRoles.includes(role);
}
