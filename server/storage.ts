
import { users, clients, clientDocs, formTemplates, formFields, projects, projectColumns, cards, cardFormResponses, cardFormAnswers, alerts, type User, type UpsertUser, type InsertClient, type InsertClientDoc, type InsertFormTemplate, type InsertFormField, type InsertProject, type InsertCard, type InsertCardFormAnswer } from "../shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
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

  // Project Columns
  createProjectColumn(column: typeof projectColumns.$inferInsert): Promise<typeof projectColumns.$inferSelect>;
  updateProjectColumn(id: number, updates: Partial<typeof projectColumns.$inferInsert>): Promise<typeof projectColumns.$inferSelect>;
  deleteProjectColumn(id: number): Promise<void>;

  // Cards
  getCards(projectId: number): Promise<typeof cards.$inferSelect[]>;
  getCard(id: number): Promise<typeof cards.$inferSelect & { formResponse?: typeof cardFormResponses.$inferSelect, formAnswers?: typeof cardFormAnswers.$inferSelect[] } | undefined>;
  createCard(card: InsertCard): Promise<typeof cards.$inferSelect>;
  updateCard(id: number, updates: Partial<InsertCard>): Promise<typeof cards.$inferSelect>;
  deleteCard(id: number, userId: string): Promise<void>;

  // Forms
  submitCardForm(cardId: number, status: string, answers: InsertCardFormAnswer[]): Promise<void>;

  // Alerts
  getAlerts(): Promise<typeof alerts.$inferSelect[]>;

  // Dashboard stats
  getDashboardStats(projectId?: number, startDate?: Date, endDate?: Date): Promise<{
    totalCards: number;
    completedThisMonth: number;
    completedThisYear: number;
    overdueSLA: number;
  }>;
  getCardCompletionTrend(projectId?: number, period?: 'week' | 'month' | 'year'): Promise<{
    period: string;
    completed: number;
  }[]>;
}


export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<number, typeof clients.$inferSelect>;
  private clientDocs: Map<number, typeof clientDocs.$inferSelect>;
  private formTemplates: Map<number, typeof formTemplates.$inferSelect>;
  private formFields: Map<number, typeof formFields.$inferSelect>;
  private projects: Map<number, typeof projects.$inferSelect>;
  private projectColumns: Map<number, typeof projectColumns.$inferSelect>;
  private cards: Map<number, typeof cards.$inferSelect>;
  private cardFormResponses: Map<number, typeof cardFormResponses.$inferSelect>;
  private cardFormAnswers: Map<number, typeof cardFormAnswers.$inferSelect>;
  private alerts: Map<number, typeof alerts.$inferSelect>;

  private clientCurrentId = 1;
  private clientDocCurrentId = 1;
  private formTemplateCurrentId = 1;
  private formFieldCurrentId = 1;
  private projectCurrentId = 1;
  private projectColumnCurrentId = 1;
  private cardCurrentId = 1;
  private cardFormResponseCurrentId = 1;
  private cardFormAnswerCurrentId = 1;
  private alertCurrentId = 1;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.clientDocs = new Map();
    this.formTemplates = new Map();
    this.formFields = new Map();
    this.projects = new Map();
    this.projectColumns = new Map();
    this.cards = new Map();
    this.cardFormResponses = new Map();
    this.cardFormAnswers = new Map();
    this.alerts = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  async upsertUser(user: UpsertUser): Promise<User> {
    const existingUser = this.users.get(user.id);
    const updatedUser = {
      ...user,
      updatedAt: new Date(),
      createdAt: existingUser?.createdAt || new Date(),
    } as User;
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Clients
  async getClients() {
    return Array.from(this.clients.values()).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }
  async getClient(id: number) {
    return this.clients.get(id);
  }
  async createClient(client: InsertClient) {
    const id = this.clientCurrentId++;
    const newClient = { ...client, id, createdAt: new Date() } as typeof clients.$inferSelect;
    this.clients.set(id, newClient);
    return newClient;
  }
  async updateClient(id: number, updates: Partial<InsertClient>) {
    const client = this.clients.get(id);
    if (!client) throw new Error("Client not found");
    const updatedClient = { ...client, ...updates };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  // Client Docs
  async getClientDocs(clientId: number) {
    return Array.from(this.clientDocs.values()).filter(d => d.clientId === clientId);
  }
  async createClientDoc(doc: InsertClientDoc) {
    const id = this.clientDocCurrentId++;
    const newDoc = { ...doc, id, createdAt: new Date() } as typeof clientDocs.$inferSelect;
    this.clientDocs.set(id, newDoc);
    return newDoc;
  }

  // Form Templates
  async getFormTemplates() {
    return Array.from(this.formTemplates.values()).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }
  async getFormTemplate(id: number) {
    const template = this.formTemplates.get(id);
    if (!template) return undefined;
    const fields = Array.from(this.formFields.values())
      .filter(f => f.templateId === id)
      .sort((a, b) => a.order - b.order);
    return { ...template, fields };
  }
  async createFormTemplate(template: InsertFormTemplate, fields: InsertFormField[]) {
    const id = this.formTemplateCurrentId++;
    const newTemplate = { ...template, id, createdAt: new Date() } as typeof formTemplates.$inferSelect;
    this.formTemplates.set(id, newTemplate);

    if (fields.length > 0) {
      fields.forEach(f => {
        const fieldId = this.formFieldCurrentId++;
        this.formFields.set(fieldId, { ...f, id: fieldId, templateId: id } as typeof formFields.$inferSelect);
      });
    }
    return newTemplate;
  }

  async updateFormTemplate(id: number, templateData: Partial<InsertFormTemplate>, fields?: InsertFormField[]) {
    const existingTemplate = this.formTemplates.get(id);
    if (!existingTemplate) {
      throw new Error("Template not found");
    }

    // Update template data
    const updatedTemplate = { ...existingTemplate, ...templateData } as typeof formTemplates.$inferSelect;
    this.formTemplates.set(id, updatedTemplate);

    // If fields are provided, replace all fields
    if (fields !== undefined) {
      // Remove old fields
      const existingFields = Array.from(this.formFields.entries())
        .filter(([_, field]) => field.templateId === id);
      existingFields.forEach(([fieldId]) => {
        this.formFields.delete(fieldId);
      });

      // Add new fields
      fields.forEach(f => {
        const fieldId = this.formFieldCurrentId++;
        this.formFields.set(fieldId, { ...f, id: fieldId, templateId: id } as typeof formFields.$inferSelect);
      });
    }

    return updatedTemplate;
  }

  // Projects
  async getProjects() {
    return Array.from(this.projects.values()).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }
  async getProject(id: number) {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const columns = Array.from(this.projectColumns.values())
      .filter(c => c.projectId === id)
      .sort((a, b) => a.order - b.order);
    return { ...project, columns };
  }
  async createProject(project: InsertProject) {
    const id = this.projectCurrentId++;
    const newProject = { ...project, id, createdAt: new Date() } as typeof projects.$inferSelect;
    this.projects.set(id, newProject);

    // Default columns with appropriate status
    const columns = [
      { name: "Backlog", status: "Em aberto" },
      { name: "Em andamento", status: "Em aberto" },
      { name: "Revisão", status: "Em aberto" },
      { name: "Concluído", status: "Concluído" }
    ];
    columns.forEach((col, i) => {
      const colId = this.projectColumnCurrentId++;
      this.projectColumns.set(colId, {
        id: colId,
        projectId: id,
        name: col.name,
        order: i,
        color: "#6b7280", // Default gray
        status: col.status
      });
    });
    return newProject;
  }
  async updateProject(id: number, updates: Partial<InsertProject>) {
    const project = this.projects.get(id);
    if (!project) throw new Error("Project not found");
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  // Project Columns
  async createProjectColumn(column: typeof projectColumns.$inferInsert) {
    const id = this.projectColumnCurrentId++;
    const newColumn = { ...column, id } as typeof projectColumns.$inferSelect;
    this.projectColumns.set(id, newColumn);
    return newColumn;
  }

  async updateProjectColumn(id: number, updates: Partial<typeof projectColumns.$inferInsert>) {
    const column = this.projectColumns.get(id);
    if (!column) throw new Error("Column not found");
    const updatedColumn = { ...column, ...updates };
    this.projectColumns.set(id, updatedColumn);
    return updatedColumn;
  }

  async deleteProjectColumn(id: number) {
    // Check if any cards exist in this column
    const cardsInColumn = Array.from(this.cards.values()).filter(c => c.columnId === id);
    if (cardsInColumn.length > 0) {
      throw new Error("Cannot delete column with existing cards. Please move or delete the cards first.");
    }
    this.projectColumns.delete(id);
  }

  // Cards
  async getAllCards() {
    return Array.from(this.cards.values());
  }
  async getCards(projectId: number) {
    return Array.from(this.cards.values()).filter(c => c.projectId === projectId);
  }
  async getCard(id: number) {
    const card = this.cards.get(id);
    if (!card) return undefined;

    const formResponse = Array.from(this.cardFormResponses.values()).find(r => r.cardId === id);
    let formAnswers: typeof cardFormAnswers.$inferSelect[] = [];
    if (formResponse) {
      formAnswers = Array.from(this.cardFormAnswers.values()).filter(a => a.responseId === formResponse.id);
    }
    return { ...card, formResponse, formAnswers };
  }
  async createCard(card: InsertCard) {
    const id = this.cardCurrentId++;
    const newCard = { ...card, id, createdAt: new Date() } as typeof cards.$inferSelect;
    this.cards.set(id, newCard);

    // Auto-create form response
    const project = this.projects.get(card.projectId);
    if (project) {
      const respId = this.cardFormResponseCurrentId++;
      this.cardFormResponses.set(respId, {
        id: respId,
        cardId: id,
        templateId: project.defaultTemplateId,
        status: "Não iniciado",
        updatedAt: new Date()
      });
    }

    return newCard;
  }
  async updateCard(id: number, updates: Partial<InsertCard>) {
    const card = this.cards.get(id);
    if (!card) throw new Error("Card not found");

    // If columnId is being updated, check if we need to set/clear completionDate
    if (updates.columnId !== undefined) {
      const newColumn = this.projectColumns.get(updates.columnId);
      const oldColumn = this.projectColumns.get(card.columnId);

      // Moving TO a completed column - set completionDate if not already set
      if (newColumn?.status === "Concluído" && !updates.completionDate) {
        updates.completionDate = new Date();
      }

      // Moving FROM a completed column to a non-completed column - clear completionDate
      if (oldColumn?.status === "Concluído" && newColumn?.status !== "Concluído") {
        updates.completionDate = null;
      }
    }

    const updatedCard = { ...card, ...updates };
    this.cards.set(id, updatedCard);
    return updatedCard;
  }

  async deleteCard(id: number, userId: string) {
    // Check if user has "Gerente" role
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "Gerente") {
      throw new Error("Only users with 'Gerente' role can delete cards");
    }

    // Delete the card and associated data
    const card = this.cards.get(id);
    if (!card) throw new Error("Card not found");

    // Delete form responses and answers
    const formResponse = Array.from(this.cardFormResponses.values()).find(r => r.cardId === id);
    if (formResponse) {
      // Delete form answers
      Array.from(this.cardFormAnswers.entries())
        .filter(([_, ans]) => ans.responseId === formResponse.id)
        .forEach(([ansId]) => this.cardFormAnswers.delete(ansId));
      // Delete form response
      const responseEntry = Array.from(this.cardFormResponses.entries()).find(([_, r]) => r.id === formResponse.id);
      if (responseEntry) {
        this.cardFormResponses.delete(responseEntry[0]);
      }
    }

    // Delete the card
    this.cards.delete(id);
  }

  async submitCardForm(cardId: number, status: string, answers: InsertCardFormAnswer[]) {
    let response = Array.from(this.cardFormResponses.values()).find(r => r.cardId === cardId);
    if (!response) {
      const card = this.cards.get(cardId);
      if (!card) throw new Error("Card not found");
      const project = this.projects.get(card.projectId);
      if (!project) throw new Error("Project not found");

      const respId = this.cardFormResponseCurrentId++;
      response = {
        id: respId,
        cardId,
        templateId: project.defaultTemplateId,
        status: "Não iniciado",
        updatedAt: new Date()
      };
      this.cardFormResponses.set(respId, response);
    }

    // Update status
    response.status = status;
    response.updatedAt = new Date();
    this.cardFormResponses.set(response.id, response);

    // Upsert answers
    // In-memory simplistic approach: remove old answers for these fields and add new ones
    for (const ans of answers) {
      // Find existing answer index/key
      const existingKeys: number[] = [];
      this.cardFormAnswers.forEach((val, key) => {
        if (val.responseId === response!.id && val.fieldId === ans.fieldId) {
          existingKeys.push(key);
        }
      });
      existingKeys.forEach(k => this.cardFormAnswers.delete(k));

      const ansId = this.cardFormAnswerCurrentId++;
      this.cardFormAnswers.set(ansId, { ...ans, id: ansId, responseId: response.id });
    }
  }

  // Alerts
  async getAlerts() {
    return Array.from(this.alerts.values()).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Dashboard Stats
  async getDashboardStats(projectId?: number, startDate?: Date, endDate?: Date) {
    const allCards = Array.from(this.cards.values());

    // Filter by project if specified
    const filteredCards = projectId
      ? allCards.filter(c => c.projectId === projectId)
      : allCards;

    // Get all columns to identify "completed" columns (by status)
    const allColumns = Array.from(this.projectColumns.values());
    const completedColumnIds = allColumns
      .filter(col => col.status === "Concluído")
      .map(col => col.id);

    // Total cards
    const totalCards = filteredCards.length;

    // Completed cards (cards in "Concluído" column with completion date)
    const completedCards = filteredCards.filter(c =>
      completedColumnIds.includes(c.columnId) && c.completionDate
    );

    // Current date calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Completed this month
    const completedThisMonth = completedCards.filter(c => {
      const completionDate = c.completionDate ? new Date(c.completionDate) : null;
      return completionDate && completionDate >= startOfMonth;
    }).length;

    // Completed this year
    const completedThisYear = completedCards.filter(c => {
      const completionDate = c.completionDate ? new Date(c.completionDate) : null;
      return completionDate && completionDate >= startOfYear;
    }).length;

    // Overdue/SLA: cards with dueDate in the past and not completed
    const overdueCards = filteredCards.filter(c => {
      if (!c.dueDate) return false;
      const dueDate = new Date(c.dueDate);
      const isOverdue = dueDate < now;
      const isNotCompleted = !completedColumnIds.includes(c.columnId);
      return isOverdue && isNotCompleted;
    }).length;

    return {
      totalCards,
      completedThisMonth,
      completedThisYear,
      overdueSLA: overdueCards
    };
  }

  async getCardCompletionTrend(projectId?: number, period: 'week' | 'month' | 'year' = 'week') {
    const allCards = Array.from(this.cards.values());

    // Filter by project if specified
    const filteredCards = projectId
      ? allCards.filter(c => c.projectId === projectId)
      : allCards;

    // Get completed column IDs (by status)
    const allColumns = Array.from(this.projectColumns.values());
    const completedColumnIds = allColumns
      .filter(col => col.status === "Concluído")
      .map(col => col.id);

    // Filter completed cards
    const completedCards = filteredCards.filter(c =>
      completedColumnIds.includes(c.columnId) && c.completionDate
    );

    const now = new Date();
    const trends: { period: string; completed: number }[] = [];

    if (period === 'week') {
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const count = completedCards.filter(c => {
          const completionDate = c.completionDate ? new Date(c.completionDate) : null;
          return completionDate && completionDate >= weekStart && completionDate <= weekEnd;
        }).length;

        trends.push({
          period: `S${12 - i}`,
          completed: count
        });
      }
    } else if (period === 'month') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

        const count = completedCards.filter(c => {
          const completionDate = c.completionDate ? new Date(c.completionDate) : null;
          return completionDate && completionDate >= monthStart && completionDate <= monthEnd;
        }).length;

        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        trends.push({
          period: monthNames[monthStart.getMonth()],
          completed: count
        });
      }
    } else {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        const yearStart = new Date(now.getFullYear() - i, 0, 1);
        const yearEnd = new Date(now.getFullYear() - i, 11, 31, 23, 59, 59, 999);

        const count = completedCards.filter(c => {
          const completionDate = c.completionDate ? new Date(c.completionDate) : null;
          return completionDate && completionDate >= yearStart && completionDate <= yearEnd;
        }).length;

        trends.push({
          period: yearStart.getFullYear().toString(),
          completed: count
        });
      }
    }

    return trends;
  }
}

export const storage = new MemStorage();
export const authStorage = storage;
