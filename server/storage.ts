
import { users, clients, clientDocs, formTemplates, formFields, projects, projectColumns, cards, cardFormResponses, cardFormAnswers, alerts, poloProjects, poloProjectStages, salesFunnelColumns, salesFunnelCards, type User, type UpsertUser, type InsertClient, type InsertClientDoc, type InsertFormTemplate, type InsertFormField, type InsertProject, type InsertCard, type InsertCardFormAnswer, type InsertPoloProject, type InsertPoloProjectStage, type InsertSalesFunnelColumn, type InsertSalesFunnelCard } from "../shared/schema";

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
  getDashboardStats(projectId?: number, startDate?: Date, endDate?: Date, technicianId?: string): Promise<{
    totalCards: number;
    completedThisMonth: number;
    completedThisYear: number;
    overdueSLA: number;
  }>;
  getCardCompletionTrend(projectId?: number, period?: 'week' | 'month' | 'year', technicianId?: string): Promise<{
    period: string;
    completed: number;
  }[]>;

  // Polo Projects
  getPoloProjects(): Promise<(typeof poloProjects.$inferSelect & { stages?: typeof poloProjectStages.$inferSelect[] })[]>;
  getPoloProject(id: number): Promise<typeof poloProjects.$inferSelect & { stages: typeof poloProjectStages.$inferSelect[] } | undefined>;
  createPoloProject(project: InsertPoloProject, stages?: InsertPoloProjectStage[]): Promise<typeof poloProjects.$inferSelect>;
  updatePoloProject(id: number, updates: Partial<InsertPoloProject>): Promise<typeof poloProjects.$inferSelect>;
  createPoloProjectStage(stage: InsertPoloProjectStage): Promise<typeof poloProjectStages.$inferSelect>;
  updatePoloProjectStage(id: number, updates: Partial<InsertPoloProjectStage>): Promise<typeof poloProjectStages.$inferSelect>;
  deletePoloProjectStage(id: number): Promise<void>;
  getPoloProjectDashboardStats(): Promise<{
    activeProjects: number;
    upcomingDeadlines: { stageName: string; projectName: string; endDate: string; daysUntil: number; }[];
    overallProgress: number;
  }>;
  getPoloProjectGanttData(id: number): Promise<{
    project: typeof poloProjects.$inferSelect;
    stages: typeof poloProjectStages.$inferSelect[];
    timelineStart: string;
    timelineEnd: string;
  }>;

  // Sales Funnel
  getSalesFunnelColumns(): Promise<typeof salesFunnelColumns.$inferSelect[]>;
  createSalesFunnelColumn(column: InsertSalesFunnelColumn): Promise<typeof salesFunnelColumns.$inferSelect>;
  getSalesFunnelCards(): Promise<typeof salesFunnelCards.$inferSelect[]>;
  getSalesFunnelCard(id: number): Promise<typeof salesFunnelCards.$inferSelect | undefined>;
  createSalesFunnelCard(card: InsertSalesFunnelCard): Promise<typeof salesFunnelCards.$inferSelect>;
  updateSalesFunnelCard(id: number, updates: Partial<InsertSalesFunnelCard>): Promise<typeof salesFunnelCards.$inferSelect>;
  moveSalesFunnelCard(id: number, columnId: number): Promise<typeof salesFunnelCards.$inferSelect>;
  deleteSalesFunnelCard(id: number): Promise<void>;
  getSalesFunnelStats(startDate?: Date, endDate?: Date): Promise<{
    columnStats: { columnId: number; columnName: string; color: string; count: number; totalValue: number }[];
    totalDeals: number;
    totalValue: number;
    conversionRate: number;
    averageValue: number;
    allCards: (typeof salesFunnelCards.$inferSelect)[];
  }>;
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
  private poloProjects: Map<number, typeof poloProjects.$inferSelect>;
  private poloProjectStages: Map<number, typeof poloProjectStages.$inferSelect>;
  private salesFunnelColumns: Map<number, typeof salesFunnelColumns.$inferSelect>;
  private salesFunnelCards: Map<number, typeof salesFunnelCards.$inferSelect>;

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
  private poloProjectCurrentId = 1;
  private poloProjectStageCurrentId = 1;
  private salesFunnelColumnCurrentId = 1;
  private salesFunnelCardCurrentId = 1;

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
    this.poloProjects = new Map();
    this.poloProjectStages = new Map();
    this.salesFunnelColumns = new Map();
    this.salesFunnelCards = new Map();

    // Initialize default sales funnel columns
    this.initializeSalesFunnelColumns();
  }

  private initializeSalesFunnelColumns() {
    const defaultColumns = [
      { name: "Envio de Proposta", order: 0, color: "#3b82f6" },
      { name: "Contrato Fechado", order: 1, color: "#10b981" },
      { name: "Contrato Recusado", order: 2, color: "#f59e0b" },
      { name: "Cancelamento", order: 3, color: "#ef4444" }
    ];

    defaultColumns.forEach((col) => {
      const id = this.salesFunnelColumnCurrentId++;
      this.salesFunnelColumns.set(id, {
        id,
        name: col.name,
        order: col.order,
        color: col.color
      });
    });
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
    // Ensure all fields have explicit values (even if null) so they persist correctly
    const newCard: typeof cards.$inferSelect = {
      id,
      projectId: card.projectId,
      columnId: card.columnId,
      title: card.title,
      description: card.description ?? null,
      priority: card.priority ?? "Média",
      startDate: card.startDate ?? null,
      dueDate: card.dueDate ?? null,
      completionDate: card.completionDate ?? null,
      assignedTechId: card.assignedTechId ?? null,
      tags: (card.tags ?? null) as string[] | null,
      createdBy: card.createdBy ?? null,
      createdAt: new Date(),
    };
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

    // Normalize legacy cards - ensure all fields exist with defaults
    const normalizedCard: typeof cards.$inferSelect = {
      id: card.id,
      projectId: card.projectId,
      columnId: card.columnId,
      title: card.title,
      description: card.description ?? null,
      priority: card.priority ?? "Média",
      startDate: card.startDate ?? null,
      dueDate: card.dueDate ?? null,
      completionDate: card.completionDate ?? null,
      assignedTechId: card.assignedTechId ?? null,
      tags: (card.tags ?? null) as string[] | null,
      createdBy: card.createdBy ?? null,
      createdAt: card.createdAt ?? null,
    };

    // If columnId is being updated, check if we need to set/clear completionDate
    if (updates.columnId !== undefined) {
      const newColumn = this.projectColumns.get(updates.columnId);
      const oldColumn = this.projectColumns.get(normalizedCard.columnId);

      // Moving TO a completed column - set completionDate if not already set
      if (newColumn?.status === "Concluído" && !updates.completionDate) {
        updates.completionDate = new Date();
      }

      // Moving FROM a completed column to a non-completed column - clear completionDate
      if (oldColumn?.status === "Concluído" && newColumn?.status !== "Concluído") {
        updates.completionDate = null;
      }
    }

    const updatedCard = { ...normalizedCard, ...updates };
    this.cards.set(id, updatedCard);

    return updatedCard;
  }

  async deleteCard(id: number, userId: string) {
    // Check if user has permission to delete (Admin, Gerente Comercial, or Gerente Supervisor)
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const allowedRoles = ["Admin", "Gerente Comercial", "Gerente Supervisor"];

    if (!allowedRoles.includes(user.role)) {
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
  async getDashboardStats(projectId?: number, startDate?: Date, endDate?: Date, technicianId?: string) {
    let allCards = Array.from(this.cards.values());

    // Filter by project if specified
    if (projectId) {
      allCards = allCards.filter(c => c.projectId === projectId);
    }

    // Filter by technician if specified
    if (technicianId) {
      allCards = allCards.filter(c => c.assignedTechId === technicianId);
    }

    const filteredCards = allCards;

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

  async getCardCompletionTrend(projectId?: number, period: 'week' | 'month' | 'year' = 'week', technicianId?: string) {
    let allCards = Array.from(this.cards.values());

    // Filter by project if specified
    if (projectId) {
      allCards = allCards.filter(c => c.projectId === projectId);
    }

    // Filter by technician if specified
    if (technicianId) {
      allCards = allCards.filter(c => c.assignedTechId === technicianId);
    }

    const filteredCards = allCards;

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

  // Polo Projects
  async getPoloProjects() {
    const projects = Array.from(this.poloProjects.values()).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return projects.map(project => {
      const stages = Array.from(this.poloProjectStages.values())
        .filter(s => s.poloProjectId === project.id)
        .sort((a, b) => a.order - b.order);
      return { ...project, stages };
    });
  }

  async getPoloProject(id: number) {
    const project = this.poloProjects.get(id);
    if (!project) return undefined;
    const stages = Array.from(this.poloProjectStages.values())
      .filter(s => s.poloProjectId === id)
      .sort((a, b) => a.order - b.order);
    return { ...project, stages };
  }

  async createPoloProject(project: InsertPoloProject, stages?: InsertPoloProjectStage[]) {
    const id = this.poloProjectCurrentId++;
    const newProject = { ...project, id, createdAt: new Date() } as typeof poloProjects.$inferSelect;
    this.poloProjects.set(id, newProject);

    if (stages && stages.length > 0) {
      stages.forEach((stage, index) => {
        const stageId = this.poloProjectStageCurrentId++;
        this.poloProjectStages.set(stageId, {
          ...stage,
          id: stageId,
          poloProjectId: id,
          order: stage.order ?? index,
          createdAt: new Date()
        } as typeof poloProjectStages.$inferSelect);
      });
    }

    return newProject;
  }

  async updatePoloProject(id: number, updates: Partial<InsertPoloProject>) {
    const project = this.poloProjects.get(id);
    if (!project) throw new Error("Polo Project not found");
    const updatedProject = { ...project, ...updates };
    this.poloProjects.set(id, updatedProject);
    return updatedProject;
  }

  async createPoloProjectStage(stage: InsertPoloProjectStage) {
    // Validações de hierarquia
    if (stage.level === 2) {
      // Sub-etapa DEVE ter parentStageId
      if (!stage.parentStageId) {
        throw new Error("Sub-etapas (2º nível) devem estar vinculadas a uma etapa principal");
      }

      // Verificar se a etapa principal existe e é de 1º nível
      const parentStage = this.poloProjectStages.get(stage.parentStageId);
      if (!parentStage) {
        throw new Error("Etapa principal não encontrada");
      }
      if (parentStage.level !== 1) {
        throw new Error("O parentStageId deve referenciar uma etapa de 1º nível");
      }
    } else if (stage.level === 1) {
      // Etapa principal NÃO deve ter parentStageId
      if (stage.parentStageId) {
        throw new Error("Etapas principais (1º nível) não podem ter etapa pai");
      }
    } else {
      throw new Error("O nível da etapa deve ser 1 ou 2");
    }

    const id = this.poloProjectStageCurrentId++;
    const newStage = { ...stage, id, createdAt: new Date() } as typeof poloProjectStages.$inferSelect;
    this.poloProjectStages.set(id, newStage);
    return newStage;
  }

  async updatePoloProjectStage(id: number, updates: Partial<InsertPoloProjectStage>) {
    const stage = this.poloProjectStages.get(id);
    if (!stage) throw new Error("Polo Project Stage not found");
    const updatedStage = { ...stage, ...updates };
    this.poloProjectStages.set(id, updatedStage);

    // Recalculate project progress if isCompleted changed
    const projectId = updatedStage.poloProjectId;
    const allStages = Array.from(this.poloProjectStages.values())
      .filter(s => s.poloProjectId === projectId);

    if (allStages.length > 0) {
      const completedStages = allStages.filter(s => s.isCompleted).length;
      const overallProgress = Math.round((completedStages / allStages.length) * 100);

      const project = this.poloProjects.get(projectId);
      if (project) {
        const updatedProject = { ...project, overallProgress };
        this.poloProjects.set(projectId, updatedProject);
      }
    }

    return updatedStage;
  }

  async deletePoloProjectStage(id: number) {
    const stage = this.poloProjectStages.get(id);
    if (!stage) throw new Error("Polo Project Stage not found");

    // Se for etapa de 1º nível, verificar se possui sub-etapas vinculadas
    if (stage.level === 1) {
      const subStages = Array.from(this.poloProjectStages.values())
        .filter(s => s.parentStageId === id);

      if (subStages.length > 0) {
        throw new Error("Esta etapa possui sub-etapas vinculadas. Exclua primeiro as sub-etapas ou desvincule-as.");
      }
    }

    this.poloProjectStages.delete(id);
  }

  async getPoloProjectDashboardStats() {
    const allProjects = Array.from(this.poloProjects.values());
    const activeProjects = allProjects.filter(p => p.status === "Ativo").length;

    // Get all stages with upcoming deadlines
    const allStages = Array.from(this.poloProjectStages.values());
    const now = new Date();

    const upcomingStages = allStages
      .filter(s => {
        const stage = s as typeof poloProjectStages.$inferSelect;
        if (stage.isCompleted) return false;
        const endDate = stage.endDate ? new Date(stage.endDate) : null;
        return endDate && endDate >= now;
      })
      .map(s => {
        const stage = s as typeof poloProjectStages.$inferSelect;
        const project = this.poloProjects.get(stage.poloProjectId);
        const endDate = stage.endDate ? new Date(stage.endDate) : new Date();
        const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          stageName: stage.name,
          projectName: project?.name || "Unknown",
          endDate: stage.endDate || "",
          daysUntil
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5); // Top 5 upcoming deadlines

    // Calculate overall progress
    let totalProgress = 0;
    if (allProjects.length > 0) {
      totalProgress = allProjects.reduce((sum, p) => sum + (p.overallProgress || 0), 0) / allProjects.length;
    }

    return {
      activeProjects,
      upcomingDeadlines: upcomingStages,
      overallProgress: Math.round(totalProgress)
    };
  }

  async getPoloProjectGanttData(id: number) {
    const project = this.poloProjects.get(id);
    if (!project) throw new Error("Polo Project not found");

    const stages = Array.from(this.poloProjectStages.values())
      .filter(s => s.poloProjectId === id)
      .sort((a, b) => a.order - b.order);

    let timelineStart = "";
    let timelineEnd = "";

    if (stages.length > 0) {
      // Find earliest start date and latest end date
      const dates = stages.map(s => ({
        start: s.startDate ? new Date(s.startDate) : null,
        end: s.endDate ? new Date(s.endDate) : null
      })).filter(d => d.start && d.end);

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.start!.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.end!.getTime())));
        timelineStart = minDate.toISOString().split('T')[0];
        timelineEnd = maxDate.toISOString().split('T')[0];
      }
    }

    return {
      project,
      stages,
      timelineStart,
      timelineEnd
    };
  }

  // Sales Funnel Methods
  async getSalesFunnelColumns() {
    return Array.from(this.salesFunnelColumns.values()).sort((a, b) => a.order - b.order);
  }

  async createSalesFunnelColumn(column: InsertSalesFunnelColumn) {
    const id = this.salesFunnelColumnCurrentId++;
    const newColumn = { ...column, id } as typeof salesFunnelColumns.$inferSelect;
    this.salesFunnelColumns.set(id, newColumn);
    return newColumn;
  }

  async getSalesFunnelCards() {
    return Array.from(this.salesFunnelCards.values()).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getSalesFunnelCard(id: number) {
    return this.salesFunnelCards.get(id);
  }

  async createSalesFunnelCard(card: InsertSalesFunnelCard) {
    const id = this.salesFunnelCardCurrentId++;
    const newCard = {
      ...card,
      id,
      createdAt: new Date()
    } as typeof salesFunnelCards.$inferSelect;
    this.salesFunnelCards.set(id, newCard);
    return newCard;
  }

  async updateSalesFunnelCard(id: number, updates: Partial<InsertSalesFunnelCard>) {
    const card = this.salesFunnelCards.get(id);
    if (!card) throw new Error("Sales funnel card not found");
    const updatedCard = { ...card, ...updates };
    this.salesFunnelCards.set(id, updatedCard);
    return updatedCard;
  }

  async moveSalesFunnelCard(id: number, columnId: number) {
    const card = this.salesFunnelCards.get(id);
    if (!card) throw new Error("Sales funnel card not found");
    const updatedCard = { ...card, columnId };
    this.salesFunnelCards.set(id, updatedCard);
    return updatedCard;
  }

  async deleteSalesFunnelCard(id: number) {
    const card = this.salesFunnelCards.get(id);
    if (!card) throw new Error("Sales funnel card not found");
    this.salesFunnelCards.delete(id);
  }

  async getSalesFunnelStats(startDate?: Date, endDate?: Date) {
    let allCards = Array.from(this.salesFunnelCards.values());
    const allColumns = Array.from(this.salesFunnelColumns.values()).sort((a, b) => a.order - b.order);

    // Apply date filter if provided
    if (startDate || endDate) {
      allCards = allCards.filter(card => {
        if (!card.createdAt) return false;

        const cardDate = new Date(card.createdAt);

        if (startDate && cardDate < startDate) return false;
        if (endDate && cardDate > endDate) return false;

        return true;
      });
    }

    // Calculate stats per column
    const columnStats = allColumns.map(column => {
      const cardsInColumn = allCards.filter(card => card.columnId === column.id);
      const totalValue = cardsInColumn.reduce((sum, card) => sum + (card.value || 0), 0);

      return {
        columnId: column.id,
        columnName: column.name,
        color: column.color || '#6b7280',
        count: cardsInColumn.length,
        totalValue
      };
    });

    // Calculate aggregate metrics
    const totalDeals = allCards.length;
    const totalValue = allCards.reduce((sum, card) => sum + (card.value || 0), 0);

    // Conversion rate: (cards in "Contrato Fechado" / total cards) * 100
    // Assuming second column (index 1) is "Contrato Fechado"
    const closedColumn = allColumns[1]; // Contrato Fechado
    const closedDeals = closedColumn ? allCards.filter(card => card.columnId === closedColumn.id).length : 0;
    const conversionRate = totalDeals > 0 ? (closedDeals / totalDeals) * 100 : 0;

    const averageValue = totalDeals > 0 ? totalValue / totalDeals : 0;

    return {
      columnStats,
      totalDeals,
      totalValue,
      conversionRate,
      averageValue,
      allCards
    };
  }
}

export const storage = new MemStorage();
export const authStorage = storage;
