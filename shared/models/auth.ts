import { sql } from "drizzle-orm";
import { index, json, mysqlTable, timestamp, varchar, boolean, text } from "drizzle-orm/mysql-core";

export const sessions = mysqlTable(
  "sessoes",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expira_em: timestamp("expira_em").notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_sessoes_expiracao").on(table.expira_em),
  })
);

export const users = mysqlTable("usuarios", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("primeiro_nome", { length: 255 }),
  lastName: varchar("ultimo_nome", { length: 255 }),
  password: varchar("senha", { length: 255 }), // Hashed password
  profileImageUrl: varchar("url_imagem_perfil", { length: 500 }),
  role: varchar("funcao", { length: 255 }).default("Técnico").notNull(), // Admin, Gerente Comercial, Gerente Supervisor, Técnico
  isActive: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("criado_em").defaultNow(),
  updatedAt: timestamp("atualizado_em").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
