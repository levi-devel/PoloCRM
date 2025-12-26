export * from "./models/auth";
import { mysqlTable, text, int, boolean, timestamp, json, date, varchar } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  contact: text("contact"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  milvusNotes: text("milvus_notes"), // Observação do Milvus

  // Client Description
  description: text("description"),

  // Contract Details
  contractedProducts: json("contracted_products").$type<string[]>(),
  contractedAutomations: json("contracted_automations").$type<string[]>(),
  contractLimitUsers: int("contract_limit_users"),
  contractLimitAgents: int("contract_limit_agents"),
  contractLimitSupervisors: int("contract_limit_supervisors"),
  contractStartDate: date("contract_start_date"),

  // Technical Information
  accessUrl: text("access_url"),
  apiUsed: text("api_used"),
  credentials: text("credentials"), // Sensitive field
  definedScope: text("defined_scope"),
  outOfScope: text("out_of_scope"),
  internalManagers: json("internal_managers").$type<string[]>(),
  knowledgeBase: text("knowledge_base"),
  technicalSpecPath: text("technical_spec_path"),

  // Quick History & Observations
  risks: text("risks"),
  currentPending: text("current_pending"),
  relevantIncidents: text("relevant_incidents"),
  technicalDecisions: text("technical_decisions"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const clientDocs = mysqlTable("client_docs", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").references(() => clients.id).notNull(),
  type: text("type").notNull(), // Senha, URL, Acesso, Observação
  title: text("title").notNull(),
  url: text("url"),
  login: text("login"),
  password: text("password"), // Sensitive
  notes: text("notes"),
  visibility: text("visibility").default("Admin"), // Admin, Gestor, Atribuídos
  allowedUsers: json("allowed_users").$type<string[]>(), // Array of user IDs
  attachments: json("attachments").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formTemplates = mysqlTable("form_templates", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  version: text("version").default("1.0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formFields = mysqlTable("form_fields", {
  id: int("id").primaryKey().autoincrement(),
  templateId: int("template_id").references(() => formTemplates.id).notNull(),
  order: int("order").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(), // text, long_text, number, date, list, checkbox, file
  required: boolean("required").default(false).notNull(),
  options: json("options").$type<string[]>(), // For lists
  placeholder: text("placeholder"),
});

export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("Ativo").notNull(), // Ativo, Concluído, Pausado, Cancelado
  techLeadId: varchar("tech_lead_id", { length: 255 }).references(() => users.id).notNull(),
  team: json("team").$type<string[]>(), // Array of user IDs
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"), // Prazo
  completionDate: timestamp("completion_date"),
  priority: text("priority").default("Média"), // Baixa, Média, Alta
  defaultTemplateId: int("default_template_id").references(() => formTemplates.id).notNull(),
  overdueAlertActive: boolean("overdue_alert_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectColumns = mysqlTable("project_columns", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  order: int("order").notNull(),
  color: text("color").default("#6b7280"), // Default gray
  status: text("status").default("Em aberto").notNull(), // Em aberto, Pausado, Concluído
});

export const cards = mysqlTable("cards", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").references(() => projects.id).notNull(),
  columnId: int("column_id").references(() => projectColumns.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTechId: varchar("assigned_tech_id", { length: 255 }).references(() => users.id),
  priority: text("priority").default("Média"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completionDate: timestamp("completion_date"),
  tags: json("tags").$type<string[]>(),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cardFormResponses = mysqlTable("card_form_responses", {
  id: int("id").primaryKey().autoincrement(),
  cardId: int("card_id").references(() => cards.id).notNull(),
  templateId: int("template_id").references(() => formTemplates.id).notNull(),
  status: text("status").default("Não iniciado"), // Não iniciado, Em preenchimento, Completo
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cardFormAnswers = mysqlTable("card_form_answers", {
  id: int("id").primaryKey().autoincrement(),
  responseId: int("response_id").references(() => cardFormResponses.id).notNull(),
  fieldId: int("field_id").references(() => formFields.id).notNull(),
  valueText: text("value_text"),
  valueNum: int("value_num"),
  valueDate: timestamp("value_date"),
  valueBool: boolean("value_bool"),
  valueList: text("value_list"),
  attachments: json("attachments").$type<string[]>(),
});

export const alerts = mysqlTable("alerts", {
  id: int("id").primaryKey().autoincrement(),
  type: text("type").notNull(),
  projectId: int("project_id").references(() => projects.id).notNull(),
  cardId: int("card_id").references(() => cards.id),
  message: text("message").notNull(),
  severity: text("severity").default("Info"), // Info, Aviso, Crítico
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  recipients: json("recipients").$type<string[]>(), // User IDs
});

// Polo Project Tables
export const poloProjects = mysqlTable("polo_projects", {
  id: int("id").primaryKey().autoincrement(),
  cardId: int("card_id").references(() => cards.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("Ativo").notNull(), // Ativo, Concluído, Pausado, Cancelado
  overallProgress: int("overall_progress").default(0), // 0-100
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const poloProjectStages = mysqlTable("polo_project_stages", {
  id: int("id").primaryKey().autoincrement(),
  poloProjectId: int("polo_project_id").references(() => poloProjects.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  order: int("order").notNull(),
  level: int("level").notNull().default(1), // 1 = Etapa Principal, 2 = Sub-Etapa
  parentStageId: int("parent_stage_id"), // Referência à etapa principal (apenas para level 2)
  color: text("color").default("#3b82f6"), // Default blue
  isCompleted: boolean("is_completed").default(false),
  assignedTechId: varchar("assigned_tech_id", { length: 255 }).references(() => users.id),
  activityDescription: text("activity_description"), // Descrição da atividade realizada
  createdAt: timestamp("created_at").defaultNow(),
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

export const poloProjectsRelations = relations(poloProjects, ({ one, many }) => ({
  card: one(cards, {
    fields: [poloProjects.cardId],
    references: [cards.id],
  }),
  createdBy: one(users, {
    fields: [poloProjects.createdBy],
    references: [users.id],
  }),
  stages: many(poloProjectStages),
}));

export const poloProjectStagesRelations = relations(poloProjectStages, ({ one, many }) => ({
  poloProject: one(poloProjects, {
    fields: [poloProjectStages.poloProjectId],
    references: [poloProjects.id],
  }),
  assignedTech: one(users, {
    fields: [poloProjectStages.assignedTechId],
    references: [users.id],
  }),
  parentStage: one(poloProjectStages, {
    fields: [poloProjectStages.parentStageId],
    references: [poloProjectStages.id],
    relationName: "subStages",
  }),
  subStages: many(poloProjectStages, {
    relationName: "subStages",
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
export const insertPoloProjectSchema = createInsertSchema(poloProjects).omit({ id: true, createdAt: true });
export const insertPoloProjectStageSchema = createInsertSchema(poloProjectStages).omit({ id: true, createdAt: true });

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
export type PoloProject = typeof poloProjects.$inferSelect;
export type InsertPoloProject = z.infer<typeof insertPoloProjectSchema>;
export type PoloProjectStage = typeof poloProjectStages.$inferSelect;
export type InsertPoloProjectStage = z.infer<typeof insertPoloProjectStageSchema>;

// Sales Funnel Tables
export const salesFunnelColumns = mysqlTable("sales_funnel_columns", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  order: int("order").notNull(),
  color: text("color").default("#3b82f6"), // Default blue
});

export const salesFunnelCards = mysqlTable("sales_funnel_cards", {
  id: int("id").primaryKey().autoincrement(),
  columnId: int("column_id").references(() => salesFunnelColumns.id).notNull(),
  clientName: text("client_name").notNull(),
  cnpj: text("cnpj"),
  contactName: text("contact_name"),
  phone: text("phone"),
  proposalNumber: text("proposal_number"),
  sendDate: date("send_date"),
  value: int("value"), // Valor em centavos
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales Funnel Relations
export const salesFunnelColumnsRelations = relations(salesFunnelColumns, ({ many }) => ({
  cards: many(salesFunnelCards),
}));

export const salesFunnelCardsRelations = relations(salesFunnelCards, ({ one }) => ({
  column: one(salesFunnelColumns, {
    fields: [salesFunnelCards.columnId],
    references: [salesFunnelColumns.id],
  }),
  createdBy: one(users, {
    fields: [salesFunnelCards.createdBy],
    references: [users.id],
  }),
}));

export const insertSalesFunnelColumnSchema = createInsertSchema(salesFunnelColumns).omit({ id: true });
export const insertSalesFunnelCardSchema = createInsertSchema(salesFunnelCards).omit({ id: true, createdAt: true });

export type SalesFunnelColumn = typeof salesFunnelColumns.$inferSelect;
export type InsertSalesFunnelColumn = z.infer<typeof insertSalesFunnelColumnSchema>;
export type SalesFunnelCard = typeof salesFunnelCards.$inferSelect;
export type InsertSalesFunnelCard = z.infer<typeof insertSalesFunnelCardSchema>;
