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
    cartoes_usuarios,
    respostas_formularios_cartoes,
    respostas_campos_formularios,
    alertas,
    polo_projetos,
    etapas_polo_projetos,
    pausas_polo_projeto,
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
    type InsertPausaPoloProjeto,
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

    async deleteClient(id: number, userId: string) {
        // Check permissions
        const user = await this.getUser(userId);
        if (!user) throw new Error("User not found");

        const allowedRoles = ["Admin", "Gerente Comercial", "Gerente Supervisor"];
        if (!allowedRoles.includes(user.role)) {
            throw new Error("Only Admin and Managers can delete clients");
        }

        // Check if client exists
        const client = await this.getClient(id);
        if (!client) throw new Error("Client not found");

        // Delete related documents first
        await db.delete(documentos_clientes).where(eq(documentos_clientes.id_cliente, id));

        // Delete the client
        await db.delete(clientes).where(eq(clientes.id, id));
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
        return await db.transaction(async (tx) => {
            // Update template metadata
            await tx
                .update(modelos_formularios)
                .set(templateData)
                .where(eq(modelos_formularios.id, id));

            const updated = await tx.select().from(modelos_formularios).where(eq(modelos_formularios.id, id)).limit(1);
            if (!updated[0]) throw new Error("Template not found");

            // Update fields if provided
            if (fields !== undefined) {
                // Delete old fields within the transaction
                await tx.delete(campos_formularios).where(eq(campos_formularios.id_modelo, id));

                // Insert new fields within the transaction
                if (fields.length > 0) {
                    const fieldsData = fields.map(f => ({
                        ...f,
                        id_modelo: id,
                        opcoes: f.opcoes ? [...f.opcoes] : null,
                    }));
                    await tx.insert(campos_formularios).values(fieldsData as any);
                }
            }

            return updated[0];
        });
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

    async getCardsByTechnician(projectId: number, technicianId: string) {
        return await db.select().from(cartoes).where(
            and(
                eq(cartoes.id_projeto, projectId),
                eq(cartoes.id_tecnico_atribuido, technicianId)
            )
        );
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

        // Buscar usuários atribuídos ao card
        const cardUsers = await db
            .select()
            .from(cartoes_usuarios)
            .where(eq(cartoes_usuarios.id_cartao, id));

        const usuariosAtribuidos = cardUsers.map(cu => cu.id_usuario);

        return { ...card[0], formResponse: formResponse[0], formAnswers, usuariosAtribuidos };
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

            // NOVO: Criar alerta se técnico foi atribuído na criação
            if (card.id_tecnico_atribuido) {
                await this.createAlert({
                    tipo: "Atribuição de Card",
                    id_projeto: card.id_projeto,
                    id_cartao: created[0].id,
                    mensagem: `Você foi atribuído ao card "${created[0].titulo}" no projeto "${project[0].nome}"`,
                    severidade: "Info",
                    id_destinatario: card.id_tecnico_atribuido,
                    lido: false,
                    resolvido: false
                });
            }
        }

        return created[0];
    }

    async updateCard(id: number, updates: Partial<InsertCartao>) {
        const card = await this.getCard(id);
        if (!card) throw new Error("Card not found");

        // NOVO: Criar alerta se técnico atribuído mudou
        if (updates.id_tecnico_atribuido !== undefined &&
            updates.id_tecnico_atribuido !== card.id_tecnico_atribuido &&
            updates.id_tecnico_atribuido !== null) {

            const project = await db
                .select()
                .from(projetos)
                .where(eq(projetos.id, card.id_projeto))
                .limit(1);

            if (project[0]) {
                await this.createAlert({
                    tipo: "Atribuição de Card",
                    id_projeto: card.id_projeto,
                    id_cartao: id,
                    mensagem: `Você foi atribuído ao card "${card.titulo}" no projeto "${project[0].nome}"`,
                    severidade: "Info",
                    id_destinatario: updates.id_tecnico_atribuido,
                    lido: false,
                    resolvido: false
                });
            }
        }

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

        // Delete alerts associated with this card
        await db.delete(alertas).where(eq(alertas.id_cartao, id));

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
            // IMPORTANT: Convert valor_data from string to Date if present
            // JSON serialization converts Date objects to ISO strings, but Drizzle expects Date objects
            const answerData = {
                ...ans,
                id_resposta: response[0].id,
                anexos: ans.anexos ? [...ans.anexos] : null,
                // Convert string date to Date object if present
                valor_data: ans.valor_data ? new Date(ans.valor_data) : null,
            };
            await db
                .insert(respostas_campos_formularios)
                .values(answerData as any);
        }
    }

    // Card Users - Múltiplos usuários por cartão
    async getCardUsers(cardId: number) {
        const cardUsers = await db
            .select()
            .from(cartoes_usuarios)
            .where(eq(cartoes_usuarios.id_cartao, cardId));

        // Buscar dados completos dos usuários
        if (cardUsers.length === 0) return [];

        const userIds = cardUsers.map(cu => cu.id_usuario);
        const usersData = await db
            .select()
            .from(users)
            .where(inArray(users.id, userIds));

        return cardUsers.map(cu => ({
            ...cu,
            usuario: usersData.find(u => u.id === cu.id_usuario)
        }));
    }

    async addCardUser(cardId: number, userId: string) {
        // Verificar se já existe
        const existing = await db
            .select()
            .from(cartoes_usuarios)
            .where(and(
                eq(cartoes_usuarios.id_cartao, cardId),
                eq(cartoes_usuarios.id_usuario, userId)
            ))
            .limit(1);

        if (existing.length > 0) {
            return existing[0]; // Já existe, retorna o existente
        }

        await db.insert(cartoes_usuarios).values({
            id_cartao: cardId,
            id_usuario: userId,
        });

        const created = await db
            .select()
            .from(cartoes_usuarios)
            .where(and(
                eq(cartoes_usuarios.id_cartao, cardId),
                eq(cartoes_usuarios.id_usuario, userId)
            ))
            .limit(1);

        // Criar alerta para o usuário adicionado
        const card = await this.getCard(cardId);
        if (card) {
            const project = await db
                .select()
                .from(projetos)
                .where(eq(projetos.id, card.id_projeto))
                .limit(1);

            if (project[0]) {
                await this.createAlert({
                    tipo: "Atribuição de Card",
                    id_projeto: card.id_projeto,
                    id_cartao: cardId,
                    mensagem: `Você foi atribuído ao card "${card.titulo}" no projeto "${project[0].nome}"`,
                    severidade: "Info",
                    id_destinatario: userId,
                    lido: false,
                    resolvido: false
                });
            }
        }

        return created[0];
    }

    async removeCardUser(cardId: number, userId: string) {
        await db
            .delete(cartoes_usuarios)
            .where(and(
                eq(cartoes_usuarios.id_cartao, cardId),
                eq(cartoes_usuarios.id_usuario, userId)
            ));
    }

    async setCardUsers(cardId: number, userIds: string[]) {
        // Obter usuários atuais
        const currentUsers = await db
            .select()
            .from(cartoes_usuarios)
            .where(eq(cartoes_usuarios.id_cartao, cardId));

        const currentUserIds = currentUsers.map(cu => cu.id_usuario);

        // Usuários a adicionar (novos)
        const toAdd = userIds.filter(id => !currentUserIds.includes(id));

        // Usuários a remover
        const toRemove = currentUserIds.filter(id => !userIds.includes(id));

        // Remover usuários que não estão mais na lista
        if (toRemove.length > 0) {
            await db
                .delete(cartoes_usuarios)
                .where(and(
                    eq(cartoes_usuarios.id_cartao, cardId),
                    inArray(cartoes_usuarios.id_usuario, toRemove)
                ));
        }

        // Adicionar novos usuários
        for (const userId of toAdd) {
            await this.addCardUser(cardId, userId);
        }

        return this.getCardUsers(cardId);
    }

    // Alerts
    async getAlerts() {
        // Retorna alertas com informações do destinatário (para Admin/Gerentes)
        const alertsData = await db.select().from(alertas).orderBy(desc(alertas.criado_em));

        // Buscar nomes dos destinatários
        const allUsers = await db.select().from(users);
        const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

        return alertsData.map(alert => ({
            ...alert,
            nome_destinatario: alert.id_destinatario ? userMap.get(alert.id_destinatario) || "Usuário Removido" : null
        }));
    }

    async createAlert(alerta: typeof alertas.$inferInsert) {
        await db.insert(alertas).values(alerta);
        const created = await db.select().from(alertas).orderBy(desc(alertas.id)).limit(1);
        return created[0];
    }

    async getUnreadAlertsCount(userId: string): Promise<number> {
        const result = await db
            .select({ count: sql<number>`count(*)` })
            .from(alertas)
            .where(and(
                eq(alertas.id_destinatario, userId),
                eq(alertas.lido, false)
            ));

        return result[0]?.count || 0;
    }

    async getAllUnreadAlertsCount(): Promise<number> {
        const result = await db
            .select({ count: sql<number>`count(*)` })
            .from(alertas)
            .where(eq(alertas.lido, false));

        return result[0]?.count || 0;
    }

    async getUserAlerts(userId: string) {
        return await db
            .select()
            .from(alertas)
            .where(eq(alertas.id_destinatario, userId))
            .orderBy(desc(alertas.criado_em));
    }

    async markAlertAsRead(alertId: number) {
        await db
            .update(alertas)
            .set({ lido: true })
            .where(eq(alertas.id, alertId));
    }

    async markAllAlertsAsRead(userId: string) {
        await db
            .update(alertas)
            .set({ lido: true })
            .where(and(
                eq(alertas.id_destinatario, userId),
                eq(alertas.lido, false)
            ));
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
        // Add date filtering
        if (startDate) {
            conditions.push(gte(cartoes.criado_em, startDate));
        }
        if (endDate) {
            conditions.push(lte(cartoes.criado_em, endDate));
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

    async getProjectTechnicianStats(projectId?: number, startDate?: Date, endDate?: Date, technicianId?: string) {
        // 1. Get all projects (or filtered one)
        let relevantProjects;
        if (projectId) {
            relevantProjects = await db.select().from(projetos).where(eq(projetos.id, projectId));
        } else {
            relevantProjects = await db.select().from(projetos);
        }

        // 2. Get all users for mapping names
        const allUsers = await db.select().from(users);
        const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

        // 3. Build response structure
        const result = [];

        for (const project of relevantProjects) {
            // Build query for this project's cards
            const conditions = [eq(cartoes.id_projeto, project.id)];

            if (startDate) {
                conditions.push(gte(cartoes.criado_em, startDate));
            }
            if (endDate) {
                conditions.push(lte(cartoes.criado_em, endDate));
            }
            if (technicianId) {
                conditions.push(eq(cartoes.id_tecnico_atribuido, technicianId));
            }

            const projectCards = await db
                .select({
                    technicianId: cartoes.id_tecnico_atribuido
                })
                .from(cartoes)
                .where(and(...conditions));

            // Aggregate by technician
            const techCounts = new Map<string, number>();

            for (const card of projectCards) {
                const techName = card.technicianId
                    ? (userMap.get(card.technicianId) || "Usuário Removido")
                    : "Não Atribuído";

                techCounts.set(techName, (techCounts.get(techName) || 0) + 1);
            }

            // Convert to array
            const data = Array.from(techCounts.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value); // Sort by count desc

            result.push({
                id: project.id,
                name: project.nome,
                data
            });
        }

        return result;
    }

    async getTechnicianRanking(projectId?: number, startDate?: Date, endDate?: Date) {
        // 1. Get all users for mapping names
        const allUsers = await db.select().from(users);
        const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

        // 2. Get all columns to map phases
        const allColumns = await db.select().from(colunas_projetos);

        // 3. Build query with filters
        const conditions = [];
        if (projectId) {
            conditions.push(eq(cartoes.id_projeto, projectId));
        }
        if (startDate) {
            conditions.push(gte(cartoes.criado_em, startDate));
        }
        if (endDate) {
            conditions.push(lte(cartoes.criado_em, endDate));
        }

        const allCards = conditions.length > 0
            ? await db.select().from(cartoes).where(and(...conditions))
            : await db.select().from(cartoes);

        // 4. Aggregate by technician with phase breakdown
        const techCounts = new Map<string, {
            id: string | null,
            name: string,
            count: number,
            byPhase: {
                aFazer: number,
                emAndamento: number,
                pendencia: number,
                concluido: number
            }
        }>();

        for (const card of allCards) {
            const techId = card.id_tecnico_atribuido;
            const techName = techId ? (userMap.get(techId) || "Usuário Removido") : "Não Atribuído";

            // Find the column for this card
            const column = allColumns.find(col => col.id === card.id_coluna);
            const columnName = column?.nome || "";
            const columnStatus = column?.status || "";

            // Determine phase
            let phaseKey: 'aFazer' | 'emAndamento' | 'pendencia' | 'concluido';

            if (columnStatus === "Concluído" || columnName.toLowerCase().includes("concluído")) {
                phaseKey = 'concluido';
            } else if (columnName.toLowerCase().includes("a fazer") || columnName.toLowerCase().includes("fazer")) {
                phaseKey = 'aFazer';
            } else if (columnName.toLowerCase().includes("andamento")) {
                phaseKey = 'emAndamento';
            } else if (columnName.toLowerCase().includes("pendência") || columnName.toLowerCase().includes("pendencia")) {
                phaseKey = 'pendencia';
            } else {
                // Default to "em andamento" for unknown columns
                phaseKey = 'emAndamento';
            }

            const existing = techCounts.get(techName);
            if (existing) {
                existing.count++;
                existing.byPhase[phaseKey]++;
            } else {
                techCounts.set(techName, {
                    id: techId,
                    name: techName,
                    count: 1,
                    byPhase: {
                        aFazer: phaseKey === 'aFazer' ? 1 : 0,
                        emAndamento: phaseKey === 'emAndamento' ? 1 : 0,
                        pendencia: phaseKey === 'pendencia' ? 1 : 0,
                        concluido: phaseKey === 'concluido' ? 1 : 0
                    }
                });
            }
        }

        // 5. Convert to array and sort
        const ranking = Array.from(techCounts.values())
            .sort((a, b) => b.count - a.count);

        // 6. Calculate percentages
        const maxCount = ranking[0]?.count || 1;

        return ranking.map(tech => ({
            technicianId: tech.id,
            name: tech.name,
            cardCount: tech.count,
            percentage: Math.round((tech.count / maxCount) * 100),
            byPhase: tech.byPhase
        }));
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

                // Calcular prazo final: priorizar data_final do projeto, senão usar maior data_fim das etapas
                // Determine deadline: prioritize project data_final, otherwise use latest stage data_fim
                let prazo_final: string | null = null;

                if (project.data_final) {
                    prazo_final = project.data_final;
                } else if (stages.length > 0) {
                    const latestDate = stages.reduce((latest: string | null, s) => {
                        if (!s.data_fim) return latest;
                        if (!latest) return s.data_fim;
                        return s.data_fim > latest ? s.data_fim : latest;
                    }, null);

                    if (latestDate) {
                        prazo_final = latestDate;
                    }
                }

                return {
                    ...project,
                    stages,
                    prazo_final,
                    etapas_count: stages.length,
                    data_atualizacao: project.atualizado_em || project.criado_em
                };
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
        // No modification needed, updates contains strings and schema expects strings.
        // Sanitizar e formatar campos de data
        const sanitizedUpdates = {
            ...updates,
            data_atualizacao: new Date()
        };

        if (sanitizedUpdates.data_inicial === "") sanitizedUpdates.data_inicial = null;
        if (sanitizedUpdates.data_final === "") sanitizedUpdates.data_final = null;

        await db
            .update(polo_projetos)
            .set(sanitizedUpdates)
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

        // NOVO: Criar alerta se técnico foi atribuído na criação
        if (created[0] && stage.id_tecnico_atribuido) {
            const poloProjeto = await db
                .select()
                .from(polo_projetos)
                .where(eq(polo_projetos.id, stage.id_polo_projeto))
                .limit(1);

            if (poloProjeto[0]) {
                await this.createAlert({
                    tipo: "Atribuição de Etapa",
                    id_etapa_polo: created[0].id,
                    mensagem: `Você foi atribuído como executante da etapa "${created[0].nome}" no projeto "${poloProjeto[0].nome}"`,
                    severidade: "Info",
                    id_destinatario: stage.id_tecnico_atribuido,
                    lido: false,
                    resolvido: false
                });
            }
        }

        return created[0];
    }

    async updatePoloProjectStage(id: number, updates: Partial<InsertEtapaPoloProjeto>) {
        const stage = await db
            .select()
            .from(etapas_polo_projetos)
            .where(eq(etapas_polo_projetos.id, id))
            .limit(1);

        if (!stage[0]) throw new Error("Stage not found");

        // NOVO: Criar alerta se técnico atribuído mudou
        if (updates.id_tecnico_atribuido !== undefined &&
            updates.id_tecnico_atribuido !== stage[0].id_tecnico_atribuido &&
            updates.id_tecnico_atribuido !== null) {

            const poloProjeto = await db
                .select()
                .from(polo_projetos)
                .where(eq(polo_projetos.id, stage[0].id_polo_projeto))
                .limit(1);

            if (poloProjeto[0]) {
                await this.createAlert({
                    tipo: "Atribuição de Etapa",
                    id_etapa_polo: id,
                    mensagem: `Você foi atribuído como executante da etapa "${stage[0].nome}" no projeto "${poloProjeto[0].nome}"`,
                    severidade: "Info",
                    id_destinatario: updates.id_tecnico_atribuido,
                    lido: false,
                    resolvido: false
                });
            }
        }

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

        // Also delete sub-stages if any (although level 2 shouldn't have children in this logic)
        await db.delete(etapas_polo_projetos).where(eq(etapas_polo_projetos.id_etapa_pai, id));

        await db.delete(etapas_polo_projetos).where(eq(etapas_polo_projetos.id, id));
    }

    async deletePoloProject(id: number) {
        // Delete stages first
        await db.delete(etapas_polo_projetos).where(eq(etapas_polo_projetos.id_polo_projeto, id));
        // Delete pauses
        await db.delete(pausas_polo_projeto).where(eq(pausas_polo_projeto.id_polo_projeto, id));
        // Delete project
        await db.delete(polo_projetos).where(eq(polo_projetos.id, id));
    }

    async getPoloProjectDashboardStats() {
        const projects = await this.getPoloProjects();

        const totalProjetos = projects.length;
        const ativosCount = projects.filter(p => p.status === 'Ativo').length;
        const pausadosCount = projects.filter(p => p.status === 'Pausado').length;
        const concluidosCount = projects.filter(p => p.status === 'Concluído').length;
        const canceladosCount = projects.filter(p => p.status === 'Cancelado').length;

        // Calculate upcoming deadlines (next 7 days)
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const upcomingDeadlines: any[] = [];

        projects.forEach(project => {
            if (project.stages) {
                project.stages.forEach(stage => {
                    if (!stage.concluida && stage.data_fim) {
                        // Compare strings directly since they are YYYY-MM-DD
                        // We need to parse to compare with Now+7days though
                        const stageDate = new Date(stage.data_fim + "T00:00:00");
                        // Adding time to ensure it parses as local day start if browser, but in Node with T00:00:00 it might be local
                        // Safest for deadline calc:
                        const [sYear, sMonth, sDay] = stage.data_fim.split('-').map(Number);
                        const deadline = new Date(sYear, sMonth - 1, sDay);

                        if (deadline >= now && deadline <= nextWeek) {
                            const diffTime = deadline.getTime() - now.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            upcomingDeadlines.push({
                                stageName: stage.nome,
                                projectName: project.nome,
                                endDate: stage.data_fim,
                                daysUntil: diffDays
                            });
                        }
                    }
                });
            }
        });

        // Sort by closest deadline
        upcomingDeadlines.sort((a, b) => a.daysUntil - b.daysUntil);

        // Calculate overall average progress
        const totalProgress = projects.reduce((acc, curr) => acc + (curr.progresso_geral || 0), 0);
        const progresso_geral = totalProjetos > 0 ? Math.round(totalProgress / totalProjetos) : 0;

        return {
            totalProjetos,
            ativosCount,
            pausadosCount,
            concluidosCount,
            canceladosCount,
            upcomingDeadlines: upcomingDeadlines.slice(0, 5),
            progresso_geral
        };
    }

    async getPoloProjectGanttData(id: number) {
        const project = await this.getPoloProject(id);
        if (!project) throw new Error("Polo Project not found");

        let minDate = "";
        let maxDate = "";

        // Determine timeline range
        if (project.stages && project.stages.length > 0) {
            project.stages.forEach(stage => {
                if (stage.data_inicio && (!minDate || stage.data_inicio < minDate)) {
                    minDate = stage.data_inicio;
                }
                if (stage.data_fim && (!maxDate || stage.data_fim > maxDate)) {
                    maxDate = stage.data_fim;
                }
            });
        }

        // Add project dates if available
        if (project.data_inicial && (!minDate || project.data_inicial < minDate)) {
            minDate = project.data_inicial;
        }
        if (project.data_final && (!maxDate || project.data_final > maxDate)) {
            maxDate = project.data_final;
        }

        return {
            project,
            stages: project.stages,
            timelineStart: minDate || null,
            timelineEnd: maxDate || null
        };
    }

    // Polo Project Pauses
    async getPoloProjectPauses(id_polo_projeto: number) {
        return await db
            .select()
            .from(pausas_polo_projeto)
            .where(eq(pausas_polo_projeto.id_polo_projeto, id_polo_projeto))
            .orderBy(desc(pausas_polo_projeto.data_pausa));
    }

    async createPoloProjectPause(pause: InsertPausaPoloProjeto) {
        await db.insert(pausas_polo_projeto).values(pause);
        const created = await db
            .select()
            .from(pausas_polo_projeto)
            .orderBy(desc(pausas_polo_projeto.id))
            .limit(1);
        return created[0];
    }

    async updatePoloProjectPause(id: number, updates: Partial<InsertPausaPoloProjeto>) {
        await db
            .update(pausas_polo_projeto)
            .set({ ...updates, atualizado_em: new Date() })
            .where(eq(pausas_polo_projeto.id, id));

        const updated = await db
            .select()
            .from(pausas_polo_projeto)
            .where(eq(pausas_polo_projeto.id, id))
            .limit(1);

        if (!updated[0]) throw new Error("Pause record not found");
        return updated[0];
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

        // Contract Type Statistics
        const contractTypes = ['Novo', 'UPSELL', 'CROSSELL'];
        const contractTypeStats = contractTypes.map(type => {
            const cardsOfType = allCards.filter(c => c.tipo_contrato === type);
            const totalValue = cardsOfType.reduce((sum, c) => sum + (c.valor || 0), 0);

            return {
                type,
                count: cardsOfType.length,
                totalValue,
            };
        });

        // Product Statistics (Main Products)
        const productStats = allCards.reduce((acc, card) => {
            const produto = card.produto || 'Não especificado';
            const existing = acc.find(p => p.product === produto);
            if (existing) {
                existing.count++;
                existing.totalValue += card.valor || 0;
            } else {
                acc.push({
                    product: produto,
                    count: 1,
                    totalValue: card.valor || 0,
                });
            }
            return acc;
        }, [] as Array<{ product: string; count: number; totalValue: number }>);

        // Specific Product Statistics (Derivatives - only when main product is "Produtos")
        const specificProductStats = allCards
            .filter(card => card.produto === 'Produtos' && card.produto_especifico)
            .reduce((acc, card) => {
                const produtoEspecifico = card.produto_especifico!;
                const existing = acc.find(p => p.specificProduct === produtoEspecifico);
                const quantity = card.quantidade_produto || 1; // Default to 1 if not specified

                if (existing) {
                    existing.count += quantity;
                    existing.totalValue += card.valor || 0;
                } else {
                    acc.push({
                        specificProduct: produtoEspecifico,
                        count: quantity,
                        totalValue: card.valor || 0,
                    });
                }
                return acc;
            }, [] as Array<{ specificProduct: string; count: number; totalValue: number }>);

        return {
            columnStats,
            totalDeals,
            totalValue,
            conversionRate,
            averageValue,
            allCards,
            contractTypeStats,
            productStats,
            specificProductStats,
        };
    }
}
