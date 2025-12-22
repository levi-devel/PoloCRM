export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  contact: text("contact"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientDocs = pgTable("client_docs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  type: text("type").notNull(), // Senha, URL, Acesso, Observação
  title: text("title").notNull(),
  url: text("url"),
  login: text("login"),
  password: text("password"), // Sensitive
  notes: text("notes"),
  visibility: text("visibility").default("Admin"), // Admin, Gestor, Atribuídos
  allowedUsers: jsonb("allowed_users").$type<string[]>(), // Array of user IDs
  attachments: jsonb("attachments").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  version: text("version").default("1.0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formFields = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => formTemplates.id).notNull(),
  order: integer("order").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(), // text, long_text, number, date, list, checkbox, file
  required: boolean("required").default(false).notNull(),
  options: jsonb("options").$type<string[]>(), // For lists
  placeholder: text("placeholder"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("Ativo").notNull(), // Ativo, Concluído, Pausado, Cancelado
  techLeadId: varchar("tech_lead_id").references(() => users.id).notNull(),
  team: jsonb("team").$type<string[]>(), // Array of user IDs
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"), // Prazo
  completionDate: timestamp("completion_date"),
  priority: text("priority").default("Média"), // Baixa, Média, Alta
  defaultTemplateId: integer("default_template_id").references(() => formTemplates.id).notNull(),
  overdueAlertActive: boolean("overdue_alert_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectColumns = pgTable("project_columns", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
});

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  columnId: integer("column_id").references(() => projectColumns.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTechId: varchar("assigned_tech_id").references(() => users.id),
  priority: text("priority").default("Média"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completionDate: timestamp("completion_date"),
  tags: jsonb("tags").$type<string[]>(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cardFormResponses = pgTable("card_form_responses", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").references(() => cards.id).notNull(),
  templateId: integer("template_id").references(() => formTemplates.id).notNull(),
  status: text("status").default("Não iniciado"), // Não iniciado, Em preenchimento, Completo
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cardFormAnswers = pgTable("card_form_answers", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").references(() => cardFormResponses.id).notNull(),
  fieldId: integer("field_id").references(() => formFields.id).notNull(),
  valueText: text("value_text"),
  valueNum: integer("value_num"),
  valueDate: timestamp("value_date"),
  valueBool: boolean("value_bool"),
  valueList: text("value_list"),
  attachments: jsonb("attachments").$type<string[]>(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  cardId: integer("card_id").references(() => cards.id),
  message: text("message").notNull(),
  severity: text("severity").default("Info"), // Info, Aviso, Crítico
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  recipients: jsonb("recipients").$type<string[]>(), // User IDs
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects, { relationName: "techLead" }),
  cards: many(cards, { relationName: "assignedTech" }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
  docs: many(clientDocs),
}));

export const clientDocsRelations = relations(clientDocs, ({ one }) => ({
  client: one(clients, {
    fields: [clientDocs.clientId],
    references: [clients.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  techLead: one(users, {
    fields: [projects.techLeadId],
    references: [users.id],
    relationName: "techLead",
  }),
  template: one(formTemplates, {
    fields: [projects.defaultTemplateId],
    references: [formTemplates.id],
  }),
  columns: many(projectColumns),
  cards: many(cards),
  alerts: many(alerts),
}));

export const projectColumnsRelations = relations(projectColumns, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectColumns.projectId],
    references: [projects.id],
  }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  project: one(projects, {
    fields: [cards.projectId],
    references: [projects.id],
  }),
  column: one(projectColumns, {
    fields: [cards.columnId],
    references: [projectColumns.id],
  }),
  assignedTech: one(users, {
    fields: [cards.assignedTechId],
    references: [users.id],
    relationName: "assignedTech",
  }),
  createdBy: one(users, {
    fields: [cards.createdBy],
    references: [users.id],
  }),
  formResponse: one(cardFormResponses),
}));

export const cardFormResponsesRelations = relations(cardFormResponses, ({ one, many }) => ({
  card: one(cards, {
    fields: [cardFormResponses.cardId],
    references: [cards.id],
  }),
  template: one(formTemplates, {
    fields: [cardFormResponses.templateId],
    references: [formTemplates.id],
  }),
  answers: many(cardFormAnswers),
}));

export const cardFormAnswersRelations = relations(cardFormAnswers, ({ one }) => ({
  response: one(cardFormResponses, {
    fields: [cardFormAnswers.responseId],
    references: [cardFormResponses.id],
  }),
  field: one(formFields, {
    fields: [cardFormAnswers.fieldId],
    references: [formFields.id],
  }),
}));

export const formTemplatesRelations = relations(formTemplates, ({ many }) => ({
  fields: many(formFields),
}));

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  template: one(formTemplates, {
    fields: [formFields.templateId],
    references: [formTemplates.id],
  }),
}));

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertClientDocSchema = createInsertSchema(clientDocs).omit({ id: true, createdAt: true });
export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({ id: true, createdAt: true });
export const insertFormFieldSchema = createInsertSchema(formFields).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertProjectColumnSchema = createInsertSchema(projectColumns).omit({ id: true });
export const insertCardSchema = createInsertSchema(cards).omit({ id: true, createdAt: true });
export const insertCardFormResponseSchema = createInsertSchema(cardFormResponses).omit({ id: true, updatedAt: true });
export const insertCardFormAnswerSchema = createInsertSchema(cardFormAnswers).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, resolvedAt: true });

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientDoc = typeof clientDocs.$inferSelect;
export type InsertClientDoc = z.infer<typeof insertClientDocSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormField = typeof formFields.$inferSelect;
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectColumn = typeof projectColumns.$inferSelect;
export type InsertProjectColumn = z.infer<typeof insertProjectColumnSchema>;
export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;
export type CardFormResponse = typeof cardFormResponses.$inferSelect;
export type InsertCardFormResponse = z.infer<typeof insertCardFormResponseSchema>;
export type CardFormAnswer = typeof cardFormAnswers.$inferSelect;
export type InsertCardFormAnswer = z.infer<typeof insertCardFormAnswerSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
