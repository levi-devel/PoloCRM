import { users, clients, clientDocs, formTemplates, formFields, projects, projectColumns, cards, cardFormResponses, cardFormAnswers, alerts, type User, type InsertUser, type InsertClient, type InsertClientDoc, type InsertFormTemplate, type InsertFormField, type InsertProject, type InsertCard, type InsertCardFormAnswer } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Clients
  getClients(): Promise<typeof clients.$inferSelect[]>;
  getClient(id: number): Promise<typeof clients.$inferSelect | undefined>;
  createClient(client: InsertClient): Promise<typeof clients.$inferSelect>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<typeof clients.$inferSelect>;

  // Client Docs
  getClientDocs(clientId: number): Promise<typeof clientDocs.$inferSelect[]>;
  createClientDoc(doc: InsertClientDoc): Promise<typeof clientDocs.$inferSelect>;

  // Form Templates
  getFormTemplates(): Promise<typeof formTemplates.$inferSelect[]>;
  getFormTemplate(id: number): Promise<typeof formTemplates.$inferSelect & { fields: typeof formFields.$inferSelect[] } | undefined>;
  createFormTemplate(template: InsertFormTemplate, fields: InsertFormField[]): Promise<typeof formTemplates.$inferSelect>;

  // Projects
  getProjects(): Promise<typeof projects.$inferSelect[]>;
  getProject(id: number): Promise<typeof projects.$inferSelect & { columns: typeof projectColumns.$inferSelect[] } | undefined>;
  createProject(project: InsertProject): Promise<typeof projects.$inferSelect>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<typeof projects.$inferSelect>;

  // Cards
  getCards(projectId: number): Promise<typeof cards.$inferSelect[]>;
  getCard(id: number): Promise<typeof cards.$inferSelect & { formResponse?: typeof cardFormResponses.$inferSelect, formAnswers?: typeof cardFormAnswers.$inferSelect[] } | undefined>;
  createCard(card: InsertCard): Promise<typeof cards.$inferSelect>;
  updateCard(id: number, updates: Partial<InsertCard>): Promise<typeof cards.$inferSelect>;

  // Forms
  submitCardForm(cardId: number, status: string, answers: InsertCardFormAnswer[]): Promise<void>;

  // Alerts
  getAlerts(): Promise<typeof alerts.$inferSelect[]>;
}

export class DatabaseStorage implements IStorage {
  // Users (from Auth module)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  async upsertUser(userData: InsertUser): Promise<User> {
     // This matches the replit auth storage
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  // Clients
  async getClients() {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }
  async getClient(id: number) {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  async createClient(client: InsertClient) {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }
  async updateClient(id: number, updates: Partial<InsertClient>) {
    const [updated] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    return updated;
  }

  // Client Docs
  async getClientDocs(clientId: number) {
    return await db.select().from(clientDocs).where(eq(clientDocs.clientId, clientId));
  }
  async createClientDoc(doc: InsertClientDoc) {
    const [newDoc] = await db.insert(clientDocs).values(doc).returning();
    return newDoc;
  }

  // Form Templates
  async getFormTemplates() {
    return await db.select().from(formTemplates).orderBy(desc(formTemplates.createdAt));
  }
  async getFormTemplate(id: number) {
    const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
    if (!template) return undefined;
    const fields = await db.select().from(formFields).where(eq(formFields.templateId, id)).orderBy(formFields.order);
    return { ...template, fields };
  }
  async createFormTemplate(template: InsertFormTemplate, fields: InsertFormField[]) {
    const [newTemplate] = await db.insert(formTemplates).values(template).returning();
    if (fields.length > 0) {
        await db.insert(formFields).values(fields.map(f => ({ ...f, templateId: newTemplate.id })));
    }
    return newTemplate;
  }

  // Projects
  async getProjects() {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }
  async getProject(id: number) {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;
    const columns = await db.select().from(projectColumns).where(eq(projectColumns.projectId, id)).orderBy(projectColumns.order);
    return { ...project, columns };
  }
  async createProject(project: InsertProject) {
    const [newProject] = await db.insert(projects).values(project).returning();
    // Default columns
    const columns = ["Backlog", "Em andamento", "Revisão", "Concluído"];
    await db.insert(projectColumns).values(columns.map((name, i) => ({
      projectId: newProject.id,
      name,
      order: i
    })));
    return newProject;
  }
  async updateProject(id: number, updates: Partial<InsertProject>) {
    const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return updated;
  }

  // Cards
  async getCards(projectId: number) {
    return await db.select().from(cards).where(eq(cards.projectId, projectId));
  }
  async getCard(id: number) {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    if (!card) return undefined;
    const [formResponse] = await db.select().from(cardFormResponses).where(eq(cardFormResponses.cardId, id));
    let formAnswers: typeof cardFormAnswers.$inferSelect[] = [];
    if (formResponse) {
        formAnswers = await db.select().from(cardFormAnswers).where(eq(cardFormAnswers.responseId, formResponse.id));
    }
    return { ...card, formResponse, formAnswers };
  }
  async createCard(card: InsertCard) {
    const [newCard] = await db.insert(cards).values(card).returning();
    // Auto-create form response
    const [project] = await db.select().from(projects).where(eq(projects.id, card.projectId));
    if (project) {
        await db.insert(cardFormResponses).values({
            cardId: newCard.id,
            templateId: project.defaultTemplateId,
            status: "Não iniciado"
        });
    }
    return newCard;
  }
  async updateCard(id: number, updates: Partial<InsertCard>) {
    const [updated] = await db.update(cards).set(updates).where(eq(cards.id, id)).returning();
    return updated;
  }

  async submitCardForm(cardId: number, status: string, answers: InsertCardFormAnswer[]) {
    // Check if response exists
    let [response] = await db.select().from(cardFormResponses).where(eq(cardFormResponses.cardId, cardId));
    if (!response) {
       // Should exist, but create if not
       const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
       const [project] = await db.select().from(projects).where(eq(projects.id, card.projectId));
       [response] = await db.insert(cardFormResponses).values({
            cardId,
            templateId: project.defaultTemplateId,
            status: "Não iniciado"
        }).returning();
    }
    
    await db.update(cardFormResponses).set({ status }).where(eq(cardFormResponses.id, response.id));
    
    // Upsert answers
    for (const ans of answers) {
        // Simple delete all for this field and re-insert is easier for now or upsert
        await db.delete(cardFormAnswers).where(and(eq(cardFormAnswers.responseId, response.id), eq(cardFormAnswers.fieldId, ans.fieldId)));
        await db.insert(cardFormAnswers).values({ ...ans, responseId: response.id });
    }
  }

  // Alerts
  async getAlerts() {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }
}

export const storage = new DatabaseStorage();
export const authStorage = storage; // Alias for auth module
