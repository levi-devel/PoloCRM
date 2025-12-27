
import { users, clientes, documentos_clientes, modelos_formularios, campos_formularios, projetos, colunas_projetos, cartoes, respostas_formularios_cartoes, respostas_campos_formularios, alertas, polo_projetos, etapas_polo_projetos, colunas_funil_vendas, cartoes_funil_vendas, type User, type UpsertUser, type InsertCliente, type InsertDocumentoCliente, type InsertModeloFormulario, type InsertCampoFormulario, type InsertProjeto, type InsertCartao, type InsertRespostaCampoFormulario, type InsertPoloProjeto, type InsertEtapaPoloProjeto, type InsertColunaFunilVendas, type InsertCartaoFunilVendas } from "../shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Clients
  getClients(): Promise<typeof clientes.$inferSelect[]>;
  getClient(id: number): Promise<typeof clientes.$inferSelect | undefined>;
  createClient(client: InsertCliente): Promise<typeof clientes.$inferSelect>;
  updateClient(id: number, updates: Partial<InsertCliente>): Promise<typeof clientes.$inferSelect>;

  // Client Docs
  getClientDocs(id_cliente: number): Promise<typeof documentos_clientes.$inferSelect[]>;
  createClientDoc(doc: InsertDocumentoCliente): Promise<typeof documentos_clientes.$inferSelect>;

  // Form Templates
  getFormTemplates(): Promise<typeof modelos_formularios.$inferSelect[]>;
  getFormTemplate(id: number): Promise<typeof modelos_formularios.$inferSelect & { fields: typeof campos_formularios.$inferSelect[] } | undefined>;
  createFormTemplate(template: InsertModeloFormulario, fields: InsertCampoFormulario[]): Promise<typeof modelos_formularios.$inferSelect>;
  updateFormTemplate(id: number, templateData: Partial<InsertModeloFormulario>, fields?: InsertCampoFormulario[]): Promise<typeof modelos_formularios.$inferSelect>;
  deleteFormTemplate(id: number): Promise<void>;

  // Projects
  getProjects(): Promise<typeof projetos.$inferSelect[]>;
  getProject(id: number): Promise<typeof projetos.$inferSelect & { columns: typeof colunas_projetos.$inferSelect[] } | undefined>;
  createProject(project: InsertProjeto): Promise<typeof projetos.$inferSelect>;
  updateProject(id: number, updates: Partial<InsertProjeto>): Promise<typeof projetos.$inferSelect>;
  deleteProject(id: number): Promise<void>;

  // Project Columns
  createProjectColumn(column: typeof colunas_projetos.$inferInsert): Promise<typeof colunas_projetos.$inferSelect>;
  updateProjectColumn(id: number, updates: Partial<typeof colunas_projetos.$inferInsert>): Promise<typeof colunas_projetos.$inferSelect>;
  deleteProjectColumn(id: number): Promise<void>;

  // Cards
  getAllCards(): Promise<typeof cartoes.$inferSelect[]>;
  getCards(id_projeto: number): Promise<typeof cartoes.$inferSelect[]>;
  getCard(id: number): Promise<typeof cartoes.$inferSelect & { formResponse?: typeof respostas_formularios_cartoes.$inferSelect, formAnswers?: typeof respostas_campos_formularios.$inferSelect[] } | undefined>;
  createCard(card: InsertCartao): Promise<typeof cartoes.$inferSelect>;
  updateCard(id: number, updates: Partial<InsertCartao>): Promise<typeof cartoes.$inferSelect>;
  deleteCard(id: number, userId: string): Promise<void>;

  // Forms
  submitCardForm(id_cartao: number, status: string, answers: InsertRespostaCampoFormulario[]): Promise<void>;

  // Alerts
  getAlerts(): Promise<typeof alertas.$inferSelect[]>;

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
  getPoloProjects(): Promise<(typeof polo_projetos.$inferSelect & { stages?: typeof etapas_polo_projetos.$inferSelect[] })[]>;
  getPoloProject(id: number): Promise<typeof polo_projetos.$inferSelect & { stages: typeof etapas_polo_projetos.$inferSelect[] } | undefined>;
  createPoloProject(project: InsertPoloProjeto, stages?: InsertEtapaPoloProjeto[]): Promise<typeof polo_projetos.$inferSelect>;
  updatePoloProject(id: number, updates: Partial<InsertPoloProjeto>): Promise<typeof polo_projetos.$inferSelect>;
  createPoloProjectStage(stage: InsertEtapaPoloProjeto): Promise<typeof etapas_polo_projetos.$inferSelect>;
  updatePoloProjectStage(id: number, updates: Partial<InsertEtapaPoloProjeto>): Promise<typeof etapas_polo_projetos.$inferSelect>;
  deletePoloProjectStage(id: number): Promise<void>;
  getPoloProjectDashboardStats(): Promise<{
    activeProjects: number;
    upcomingDeadlines: { stageName: string; projectName: string; endDate: string; daysUntil: number; }[];
    progresso_geral: number;
  }>;
  getPoloProjectGanttData(id: number): Promise<{
    project: typeof polo_projetos.$inferSelect;
    stages: typeof etapas_polo_projetos.$inferSelect[];
    timelineStart: string;
    timelineEnd: string;
  }>;

  // Sales Funnel
  getSalesFunnelColumns(): Promise<typeof colunas_funil_vendas.$inferSelect[]>;
  createSalesFunnelColumn(column: InsertColunaFunilVendas): Promise<typeof colunas_funil_vendas.$inferSelect>;
  getSalesFunnelCards(): Promise<typeof cartoes_funil_vendas.$inferSelect[]>;
  getSalesFunnelCard(id: number): Promise<typeof cartoes_funil_vendas.$inferSelect | undefined>;
  createSalesFunnelCard(card: InsertCartaoFunilVendas): Promise<typeof cartoes_funil_vendas.$inferSelect>;
  updateSalesFunnelCard(id: number, updates: Partial<InsertCartaoFunilVendas>): Promise<typeof cartoes_funil_vendas.$inferSelect>;
  moveSalesFunnelCard(id: number, id_coluna: number): Promise<typeof cartoes_funil_vendas.$inferSelect>;
  deleteSalesFunnelCard(id: number): Promise<void>;
  getSalesFunnelStats(startDate?: Date, endDate?: Date): Promise<{
    columnStats: { id_coluna: number; columnName: string; color: string; count: number; totalValue: number }[];
    totalDeals: number;
    totalValue: number;
    conversionRate: number;
    averageValue: number;
    allCards: (typeof cartoes_funil_vendas.$inferSelect)[];
  }>;
}

import { DatabaseStorage } from "./db-storage";

export const storage = new DatabaseStorage();
export const authStorage = storage;
