import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import {
    users,
    clientes,
    documentos_clientes,
    modelos_formularios,
    campos_formularios,
    projetos,
    colunas_projetos,
    cartoes,
    respostas_formularios_cartoes,
    respostas_campos_formularios,
    alertas,
    polo_projetos,
    etapas_polo_projetos,
    colunas_funil_vendas,
    cartoes_funil_vendas,
    type User,
    type UpsertUser,
    type InsertCliente,
    type InsertDocumentoCliente,
    type InsertModeloFormulario,
    type InsertCampoFormulario,
    type InsertProjeto,
    type InsertCartao,
    type InsertRespostaCampoFormulario,
    type InsertPoloProjeto,
    type InsertEtapaPoloProjeto,
    type InsertColunaFunilVendas,
    type InsertCartaoFunilVendas,
} from "../shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
    // Users
    async getUser(id: string): Promise<User | undefined> {
        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return result[0];
    }

    async getUsers(): Promise<User[]> {
        return await db.select().from(users);
    }

    async upsertUser(user: UpsertUser): Promise<User> {
        if (!user.id) {
            user.id = crypto.randomUUID();
        }

        const existing = await this.getUser(user.id);

        if (existing) {
            await db
                .update(users)
                .set({ ...user, updatedAt: new Date() })
                .where(eq(users.id, user.id));

            return (await this.getUser(user.id))!;
        } else {
            await db
                .insert(users)
                .values({ ...user, createdAt: new Date(), updatedAt: new Date() });

            return (await this.getUser(user.id))!;
        }
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User> {
        await db
            .update(users)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(users.id, id));

        const updated = await this.getUser(id);
        if (!updated) throw new Error("User not found");
        return updated;
    }

    // Clients
    async getClients() {
        return await db.select().from(clientes).orderBy(desc(clientes.criado_em));
    }

    async getClient(id: number) {
        const result = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
        return result[0];
    }

    async createClient(client: InsertCliente) {
        const clientData = {
            ...client,
            produtos_contratados: client.produtos_contratados ? [...client.produtos_contratados] : null,
        };
        await db.insert(clientes).values(clientData as any);
        const result = await db.select().from(clientes).orderBy(desc(clientes.id)).limit(1);
        return result[0];
    }

    async updateClient(id: number, updates: Partial<InsertCliente>) {
        const updateData = {
            ...updates,
            produtos_contratados: updates.produtos_contratados ? [...updates.produtos_contratados] : updates.produtos_contratados,
        };
        await db
            .update(clientes)
            .set(updateData as any)
            .where(eq(clientes.id, id));

        const updated = await this.getClient(id);
        if (!updated) throw new Error("Client not found");
        return updated;
    }

    // Client Docs
    async getClientDocs(clientId: number) {
        return await db
            .select()
            .from(documentos_clientes)
            .where(eq(documentos_clientes.id_cliente, clientId));
    }

    async createClientDoc(doc: InsertDocumentoCliente) {
        const docData = {
            ...doc,
            anexos: doc.anexos ? [...doc.anexos] : null,
            usuarios_permitidos: doc.usuarios_permitidos ? [...doc.usuarios_permitidos] : null,
        };
        await db.insert(documentos_clientes).values(docData as any);
        const result = await db.select().from(documentos_clientes).orderBy(desc(documentos_clientes.id)).limit(1);
        return result[0];
    }

    // Form Templates
    async getFormTemplates() {
        return await db.select().from(modelos_formularios).orderBy(desc(modelos_formularios.criado_em));
    }

    async getFormTemplate(id: number) {
        const template = await db
            .select()
            .from(modelos_formularios)
            .where(eq(modelos_formularios.id, id))
            .limit(1);

        if (!template[0]) return undefined;

        const fields = await db
            .select()
            .from(campos_formularios)
            .where(eq(campos_formularios.id_modelo, id))
            .orderBy(asc(campos_formularios.ordem));

        return { ...template[0], fields };
    }

    async createFormTemplate(template: InsertModeloFormulario, fields: InsertCampoFormulario[]) {
        await db.insert(modelos_formularios).values(template);
        const created = await db.select().from(modelos_formularios).orderBy(desc(modelos_formularios.id)).limit(1);

        if (fields.length > 0) {
            const fieldsData = fields.map(f => ({
                ...f,
                id_modelo: created[0].id,
                opcoes: f.opcoes ? [...f.opcoes] : null,
            }));
            await db.insert(campos_formularios).values(fieldsData as any);
        }

        return created[0];
    }

    async updateFormTemplate(id: number, templateData: Partial<InsertModeloFormulario>, fields?: InsertCampoFormulario[]) {
        await db
            .update(modelos_formularios)
            .set(templateData)
            .where(eq(modelos_formularios.id, id));

        const updated = await db.select().from(modelos_formularios).where(eq(modelos_formularios.id, id)).limit(1);
        if (!updated[0]) throw new Error("Template not found");

        if (fields !== undefined) {
            // Delete old fields
            await db.delete(campos_formularios).where(eq(campos_formularios.id_modelo, id));

            // Insert new fields
            if (fields.length > 0) {
                const fieldsData = fields.map(f => ({
                    ...f,
                    id_modelo: id,
                    opcoes: f.opcoes ? [...f.opcoes] : null,
                }));
                await db.insert(campos_formularios).values(fieldsData as any);
            }
        }

        return updated[0];
    }

    async deleteFormTemplate(id: number) {
        // Delete fields first
        await db.delete(campos_formularios).where(eq(campos_formularios.id_modelo, id));
        // Delete template
        await db.delete(modelos_formularios).where(eq(modelos_formularios.id, id));
    }

    // Projects
    async getProjects() {
        return await db.select().from(projetos).orderBy(desc(projetos.criado_em));
    }

    async getProject(id: number) {
        const project = await db.select().from(projetos).where(eq(projetos.id, id)).limit(1);
        if (!project[0]) return undefined;

        const columns = await db
            .select()
            .from(colunas_projetos)
            .where(eq(colunas_projetos.id_projeto, id))
            .orderBy(asc(colunas_projetos.ordem));

        return { ...project[0], columns };
    }

    async createProject(project: InsertProjeto) {
        const projectData = {
            ...project,
            equipe: project.equipe ? [...project.equipe] : null,
        };
        await db.insert(projetos).values(projectData as any);
        const created = await db.select().from(projetos).orderBy(desc(projetos.id)).limit(1);

        // Create default columns
        const defaultColumns = [
            { nome: "A Fazer", status: "Em aberto", ordem: 0, cor: "#6b7280" },
            { nome: "Em Andamento", status: "Em aberto", ordem: 1, cor: "#3b82f6" },
            { nome: "Pendência Interna", status: "Em aberto", ordem: 2, cor: "#f59e0b" },
            { nome: "Pendência Externa", status: "Em aberto", ordem: 3, cor: "#f59e0b" },
            { nome: "Concluído", status: "Concluído", ordem: 4, cor: "#10b981" },
        ];

        await db.insert(colunas_projetos).values(
            defaultColumns.map(col => ({
                id_projeto: created[0].id,
                nome: col.nome,
                ordem: col.ordem,
                cor: col.cor,
                status: col.status,
            }))
        );

        return created[0];
    }

    async updateProject(id: number, updates: Partial<InsertProjeto>) {
        const updateData = {
            ...updates,
            equipe: updates.equipe ? [...updates.equipe] : updates.equipe,
        };
        await db
            .update(projetos)
            .set(updateData as any)
            .where(eq(projetos.id, id));

        const updated = await this.getProject(id);
        if (!updated) throw new Error("Project not found");
        return updated;
    }

    async deleteProject(id: number) {
        // 1. Delete Alerts
        await db.delete(alertas).where(eq(alertas.id_projeto, id));

        // 2. Delete Cards (and their responses/answers via cascade or manual if needed)
        // Since we didn't set CASCADE on project->cards, we must delete cards manually.
        // And since cards->responses->answers have cascade on the card FK, deleting card should work.
        // However, let's be safe and get card IDs to check if we need to do anything else.
        // Actually, db-storage deleteCard handles response/answer deletion, but that's per card.
        // We can do a bulk delete here.

        // Get all card IDs for this project
        const projectCards = await db
            .select({ id: cartoes.id })
            .from(cartoes)
            .where(eq(cartoes.id_projeto, id));

        const cardIds = projectCards.map(c => c.id);

        if (cardIds.length > 0) {
            // Because responses->answers has cascade, and cards->responses has cascade (based on schema definitions),
            // deleting from cartoes SHOULD be enough if the strict foreign keys are enforced with ON DELETE CASCADE in DB.
            // But let's verify schema.ts:
            // answers -> response (CASCADE)
            // response -> card (CASCADE)
            // So deleting card is sufficient.

            // Delete responses manually if we are paranoid about DB sync, but let's trust Drizzle/DB for now 
            // OR use the manual approach if we think FKs might be missing.
            // Given I cannot verify the actual DB schema constraints right now, I will trust the migration/schema intent BUT
            // will manually delete form responses just in case, because if FK cascade IS missing, this will fail.
            // Actually, manual delete is safer.

            // Get response IDs
            const responses = await db
                .select({ id: respostas_formularios_cartoes.id })
                .from(respostas_formularios_cartoes)
                .where(inArray(respostas_formularios_cartoes.id_cartao, cardIds));

            const responseIds = responses.map(r => r.id);

            if (responseIds.length > 0) {
                await db.delete(respostas_campos_formularios)
                    .where(inArray(respostas_campos_formularios.id_resposta, responseIds));

                await db.delete(respostas_formularios_cartoes)
                    .where(inArray(respostas_formularios_cartoes.id, responseIds));
            }

            // Finally delete cards
            await db.delete(cartoes).where(eq(cartoes.id_projeto, id));
        }

        // 3. Delete Columns
        // Note: deleteProjectColumn method has a check for existing cards. Since we deleted cards above, this is fine.
        await db.delete(colunas_projetos).where(eq(colunas_projetos.id_projeto, id));

        // 4. Delete Project
        await db.delete(projetos).where(eq(projetos.id, id));
    }

    // Project Columns
    async createProjectColumn(column: typeof colunas_projetos.$inferInsert) {
        await db.insert(colunas_projetos).values(column);
        const created = await db.select().from(colunas_projetos).orderBy(desc(colunas_projetos.id)).limit(1);
        return created[0];
    }

    async updateProjectColumn(id: number, updates: Partial<typeof colunas_projetos.$inferInsert>) {
        await db
            .update(colunas_projetos)
            .set(updates)
            .where(eq(colunas_projetos.id, id));

        const updated = await db.select().from(colunas_projetos).where(eq(colunas_projetos.id, id)).limit(1);
        if (!updated[0]) throw new Error("Column not found");
        return updated[0];
    }

    async deleteProjectColumn(id: number) {
        // Check if any cards exist in this column
        const cardsInColumn = await db
            .select()
            .from(cartoes)
            .where(eq(cartoes.id_coluna, id))
            .limit(1);

        if (cardsInColumn.length > 0) {
            throw new Error("Cannot delete column with existing cards. Please move or delete the cards first.");
        }

        await db.delete(colunas_projetos).where(eq(colunas_projetos.id, id));
    }

    // Cards
    async getAllCards() {
        return await db.select().from(cartoes);
    }

    async getCards(projectId: number) {
        return await db.select().from(cartoes).where(eq(cartoes.id_projeto, projectId));
    }

    async getCard(id: number) {
        const card = await db.select().from(cartoes).where(eq(cartoes.id, id)).limit(1);
        if (!card[0]) return undefined;

        const formResponse = await db
            .select()
            .from(respostas_formularios_cartoes)
            .where(eq(respostas_formularios_cartoes.id_cartao, id))
            .limit(1);

        let formAnswers: typeof respostas_campos_formularios.$inferSelect[] = [];
        if (formResponse[0]) {
            formAnswers = await db
                .select()
                .from(respostas_campos_formularios)
                .where(eq(respostas_campos_formularios.id_resposta, formResponse[0].id));
        }

        return { ...card[0], formResponse: formResponse[0], formAnswers };
    }

    async createCard(card: InsertCartao) {
        const cardData = {
            ...card,
            tags: card.tags ? [...card.tags] : null,
        };
        await db.insert(cartoes).values(cardData as any);
        const created = await db.select().from(cartoes).orderBy(desc(cartoes.id)).limit(1);

        // Auto-create form response
        const project = await db
            .select()
            .from(projetos)
            .where(eq(projetos.id, card.id_projeto))
            .limit(1);

        if (project[0]) {
            await db.insert(respostas_formularios_cartoes).values({
                id_cartao: created[0].id,
                id_modelo: project[0].id_modelo_padrao,
                status: "Não iniciado",
            });
        }

        return created[0];
    }

    async updateCard(id: number, updates: Partial<InsertCartao>) {
        const card = await this.getCard(id);
        if (!card) throw new Error("Card not found");

        // Handle completion date logic
        if (updates.id_coluna !== undefined) {
            const newColumn = await db
                .select()
                .from(colunas_projetos)
                .where(eq(colunas_projetos.id, updates.id_coluna))
                .limit(1);

            const oldColumn = await db
                .select()
                .from(colunas_projetos)
                .where(eq(colunas_projetos.id, card.id_coluna))
                .limit(1);

            // Moving TO a completed column
            if (newColumn[0]?.status === "Concluído" && !updates.data_conclusao) {
                updates.data_conclusao = new Date();
            }

            // Moving FROM a completed column to a non-completed column
            if (oldColumn[0]?.status === "Concluído" && newColumn[0]?.status !== "Concluído") {
                updates.data_conclusao = null;
            }
        }

        await db
            .update(cartoes)
            .set({
                ...updates,
                tags: updates.tags ? [...updates.tags] : updates.tags,
            } as any)
            .where(eq(cartoes.id, id));

        const updated = await this.getCard(id);
        return updated!;
    }

    async deleteCard(id: number, userId: string) {
        // Check permissions
        const user = await this.getUser(userId);
        if (!user) throw new Error("User not found");

        const allowedRoles = ["Admin", "Gerente Comercial", "Gerente Supervisor"];
        if (!allowedRoles.includes(user.role)) {
            throw new Error("Only users with 'Gerente' role can delete cards");
        }

        // Delete form responses and answers
        const formResponse = await db
            .select()
            .from(respostas_formularios_cartoes)
            .where(eq(respostas_formularios_cartoes.id_cartao, id))
            .limit(1);

        if (formResponse[0]) {
            await db
                .delete(respostas_campos_formularios)
                .where(eq(respostas_campos_formularios.id_resposta, formResponse[0].id));

            await db
                .delete(respostas_formularios_cartoes)
                .where(eq(respostas_formularios_cartoes.id, formResponse[0].id));
        }

        // Delete the card
        await db.delete(cartoes).where(eq(cartoes.id, id));
    }

    async submitCardForm(cardId: number, status: string, answers: InsertRespostaCampoFormulario[]) {
        let response = await db
            .select()
            .from(respostas_formularios_cartoes)
            .where(eq(respostas_formularios_cartoes.id_cartao, cardId))
            .limit(1);

        if (!response[0]) {
            const card = await this.getCard(cardId);
            if (!card) throw new Error("Card not found");

            const project = await db
                .select()
                .from(projetos)
                .where(eq(projetos.id, card.id_projeto))
                .limit(1);

            if (!project[0]) throw new Error("Project not found");

            await db
                .insert(respostas_formularios_cartoes)
                .values({
                    id_cartao: cardId,
                    id_modelo: project[0].id_modelo_padrao,
                    status: "Não iniciado",
                });

            response = await db
                .select()
                .from(respostas_formularios_cartoes)
                .where(eq(respostas_formularios_cartoes.id_cartao, cardId))
                .limit(1);
        }

        // Update status
        await db
            .update(respostas_formularios_cartoes)
            .set({ status, atualizado_em: new Date() })
            .where(eq(respostas_formularios_cartoes.id, response[0].id));

        // Upsert answers
        for (const ans of answers) {
            // Delete existing answer for this field
            await db
                .delete(respostas_campos_formularios)
                .where(
                    and(
                        eq(respostas_campos_formularios.id_resposta, response[0].id),
                        eq(respostas_campos_formularios.id_campo, ans.id_campo)
                    )
                );

            // Insert new answer
            const answerData = {
                ...ans,
                id_resposta: response[0].id,
                anexos: ans.anexos ? [...ans.anexos] : null,
            };
            await db
                .insert(respostas_campos_formularios)
                .values(answerData as any);
        }
    }

    // Alerts
    async getAlerts() {
        return await db.select().from(alertas).orderBy(desc(alertas.criado_em));
    }

    // Dashboard stats
    async getDashboardStats(projectId?: number, startDate?: Date, endDate?: Date, technicianId?: string) {
        let query = db.select().from(cartoes);

        const conditions = [];
        if (projectId) {
            conditions.push(eq(cartoes.id_projeto, projectId));
        }
        if (technicianId) {
            conditions.push(eq(cartoes.id_tecnico_atribuido, technicianId));
        }

        const allCards = conditions.length > 0
            ? await db.select().from(cartoes).where(and(...conditions))
            : await db.select().from(cartoes);

        // Get completed column IDs
        const completedColumns = await db
            .select()
            .from(colunas_projetos)
            .where(eq(colunas_projetos.status, "Concluído"));

        const completedColumnIds = completedColumns.map(col => col.id);

        const totalCards = allCards.length;

        const completedCards = allCards.filter(c =>
            completedColumnIds.includes(c.id_coluna) && c.data_conclusao
        );

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const completedThisMonth = completedCards.filter(c => {
            const completionDate = c.data_conclusao ? new Date(c.data_conclusao) : null;
            return completionDate && completionDate >= startOfMonth;
        }).length;

        const completedThisYear = completedCards.filter(c => {
            const completionDate = c.data_conclusao ? new Date(c.data_conclusao) : null;
            return completionDate && completionDate >= startOfYear;
        }).length;

        const overdueCards = allCards.filter(c => {
            if (!c.data_prazo) return false;
            const dueDate = new Date(c.data_prazo);
            const isOverdue = dueDate < now;
            const isNotCompleted = !completedColumnIds.includes(c.id_coluna);
            return isOverdue && isNotCompleted;
        }).length;

        return {
            totalCards,
            completedThisMonth,
            completedThisYear,
            overdueSLA: overdueCards,
        };
    }

    async getCardCompletionTrend(projectId?: number, period: 'week' | 'month' | 'year' = 'week', technicianId?: string) {
        // Implementation placeholder - can be implemented later
        return [];
    }

    // Polo Projects
    async getPoloProjects() {
        const projects = await db.select().from(polo_projetos).orderBy(desc(polo_projetos.criado_em));

        const projectsWithStages = await Promise.all(
            projects.map(async (project) => {
                const stages = await db
                    .select()
                    .from(etapas_polo_projetos)
                    .where(eq(etapas_polo_projetos.id_polo_projeto, project.id))
                    .orderBy(asc(etapas_polo_projetos.ordem));

                return { ...project, stages };
            })
        );

        return projectsWithStages;
    }

    async getPoloProject(id: number) {
        const project = await db.select().from(polo_projetos).where(eq(polo_projetos.id, id)).limit(1);
        if (!project[0]) return undefined;

        const stages = await db
            .select()
            .from(etapas_polo_projetos)
            .where(eq(etapas_polo_projetos.id_polo_projeto, id))
            .orderBy(asc(etapas_polo_projetos.ordem));

        return { ...project[0], stages };
    }

    async createPoloProject(project: InsertPoloProjeto, stages?: InsertEtapaPoloProjeto[]) {
        await db.insert(polo_projetos).values(project);
        const created = await db.select().from(polo_projetos).orderBy(desc(polo_projetos.id)).limit(1);

        if (stages && stages.length > 0) {
            await db.insert(etapas_polo_projetos).values(
                stages.map((stage, index) => ({
                    ...stage,
                    id_polo_projeto: created[0].id,
                    ordem: stage.ordem ?? index,
                }))
            );
        }

        return created[0];
    }

    async updatePoloProject(id: number, updates: Partial<InsertPoloProjeto>) {
        await db
            .update(polo_projetos)
            .set(updates)
            .where(eq(polo_projetos.id, id));

        const updated = await db.select().from(polo_projetos).where(eq(polo_projetos.id, id)).limit(1);
        if (!updated[0]) throw new Error("Polo Project not found");
        return updated[0];
    }

    async createPoloProjectStage(stage: InsertEtapaPoloProjeto) {
        // Validations
        if (stage.nivel === 2 && !stage.id_etapa_pai) {
            throw new Error("Sub-etapas (2º nível) devem estar vinculadas a uma etapa principal");
        }

        if (stage.nivel === 1 && stage.id_etapa_pai) {
            throw new Error("Etapas principais (1º nível) não podem ter etapa pai");
        }

        await db.insert(etapas_polo_projetos).values(stage);
        const created = await db.select().from(etapas_polo_projetos).orderBy(desc(etapas_polo_projetos.id)).limit(1);
        return created[0];
    }

    async updatePoloProjectStage(id: number, updates: Partial<InsertEtapaPoloProjeto>) {
        await db
            .update(etapas_polo_projetos)
            .set(updates)
            .where(eq(etapas_polo_projetos.id, id));

        const updated = await db.select().from(etapas_polo_projetos).where(eq(etapas_polo_projetos.id, id)).limit(1);
        if (!updated[0]) throw new Error("Polo Project Stage not found");

        // Recalculate project progress if concluida changed
        if (updates.concluida !== undefined) {
            const allStages = await db
                .select()
                .from(etapas_polo_projetos)
                .where(eq(etapas_polo_projetos.id_polo_projeto, updated[0].id_polo_projeto));

            const completedStages = allStages.filter(s => s.concluida).length;
            const overallProgress = Math.round((completedStages / allStages.length) * 100);

            await db
                .update(polo_projetos)
                .set({ progresso_geral: overallProgress })
                .where(eq(polo_projetos.id, updated[0].id_polo_projeto));
        }

        return updated[0];
    }

    async deletePoloProjectStage(id: number) {
        const stage = await db
            .select()
            .from(etapas_polo_projetos)
            .where(eq(etapas_polo_projetos.id, id))
            .limit(1);

        if (!stage[0]) throw new Error("Polo Project Stage not found");

        // Check for sub-stages
        if (stage[0].nivel === 1) {
            const subStages = await db
                .select()
                .from(etapas_polo_projetos)
                .where(eq(etapas_polo_projetos.id_etapa_pai, id))
                .limit(1);

            if (subStages.length > 0) {
                throw new Error("Não é possível excluir uma etapa principal que possui sub-etapas vinculadas");
            }
        }

        await db.delete(etapas_polo_projetos).where(eq(etapas_polo_projetos.id, id));
    }

    async getPoloProjectDashboardStats() {
        // Implementation placeholder
        return {
            activeProjects: 0,
            upcomingDeadlines: [],
            progresso_geral: 0,
        };
    }

    async getPoloProjectGanttData(id: number) {
        const project = await this.getPoloProject(id);
        if (!project) throw new Error("Polo Project not found");

        return {
            project: { ...project, stages: undefined } as any,
            stages: project.stages || [],
            timelineStart: "",
            timelineEnd: "",
        };
    }

    // Sales Funnel
    async getSalesFunnelColumns() {
        return await db.select().from(colunas_funil_vendas).orderBy(asc(colunas_funil_vendas.ordem));
    }

    async createSalesFunnelColumn(column: InsertColunaFunilVendas) {
        await db.insert(colunas_funil_vendas).values(column);
        const created = await db.select().from(colunas_funil_vendas).orderBy(desc(colunas_funil_vendas.id)).limit(1);
        return created[0];
    }

    async getSalesFunnelCards() {
        return await db.select().from(cartoes_funil_vendas);
    }

    async getSalesFunnelCard(id: number) {
        const result = await db
            .select()
            .from(cartoes_funil_vendas)
            .where(eq(cartoes_funil_vendas.id, id))
            .limit(1);
        return result[0];
    }

    async createSalesFunnelCard(card: InsertCartaoFunilVendas) {
        await db.insert(cartoes_funil_vendas).values(card);
        const created = await db.select().from(cartoes_funil_vendas).orderBy(desc(cartoes_funil_vendas.id)).limit(1);
        return created[0];
    }

    async updateSalesFunnelCard(id: number, updates: Partial<InsertCartaoFunilVendas>) {
        await db
            .update(cartoes_funil_vendas)
            .set(updates)
            .where(eq(cartoes_funil_vendas.id, id));
        return await this.getSalesFunnelCard(id);
    }

    async moveSalesFunnelCard(id: number, columnId: number) {
        return await this.updateSalesFunnelCard(id, { id_coluna: columnId });
    }

    async deleteSalesFunnelCard(id: number) {
        await db.delete(cartoes_funil_vendas).where(eq(cartoes_funil_vendas.id, id));
    }

    async getSalesFunnelStats(startDate?: Date, endDate?: Date) {
        const conditions = [];
        if (startDate && endDate) {
            conditions.push(
                and(
                    gte(cartoes_funil_vendas.data_envio, startDate),
                    lte(cartoes_funil_vendas.data_envio, endDate)
                )!
            );
        }

        const allCards = conditions.length > 0
            ? await db.select().from(cartoes_funil_vendas).where(and(...conditions))
            : await db.select().from(cartoes_funil_vendas);

        const columns = await this.getSalesFunnelColumns();

        const columnStats = columns.map(col => {
            const cardsInColumn = allCards.filter(c => c.id_coluna === col.id);
            const totalValue = cardsInColumn.reduce((sum, c) => sum + (c.valor || 0), 0);

            return {
                id_coluna: col.id,
                columnName: col.nome,
                color: col.cor || "#3b82f6",
                count: cardsInColumn.length,
                totalValue,
            };
        });

        const totalDeals = allCards.length;
        const totalValue = allCards.reduce((sum, c) => sum + (c.valor || 0), 0);


        // Calculate conversion rate: Contrato Fechado / (Contrato Fechado + Contrato Recusado + Envio de Proposta) * 100
        const closedColumn = columns.find(col => col.nome.toLowerCase().includes('fechado'));
        const refusedColumn = columns.find(col => col.nome.toLowerCase().includes('recusado'));
        const proposalColumn = columns.find(col => col.nome.toLowerCase().includes('proposta') || col.nome.toLowerCase().includes('envio'));

        let conversionRate = 0;
        if (proposalColumn && closedColumn && refusedColumn) {
            const closedContracts = allCards.filter(c => c.id_coluna === closedColumn.id).length;
            const refusedContracts = allCards.filter(c => c.id_coluna === refusedColumn.id).length;
            const sentProposals = allCards.filter(c => c.id_coluna === proposalColumn.id).length;

            const totalRelevant = closedContracts + refusedContracts + sentProposals;

            if (totalRelevant > 0) {
                conversionRate = parseFloat(((closedContracts / totalRelevant) * 100).toFixed(1));
            }
        }

        const averageValue = totalDeals > 0 ? totalValue / totalDeals : 0;

        return {
            columnStats,
            totalDeals,
            totalValue,
            conversionRate,
            averageValue,
            allCards,
        };
    }
}
