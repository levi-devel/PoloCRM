import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes } from "./auth/auth-routes";
import { isAuthenticated, hashPassword } from "./auth/local-auth";
import { api } from "../shared/routes";
import { users } from "../shared/models/auth";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register authentication routes (login, logout, get user)
  registerAuthRoutes(app);



  // Users
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });
  app.post("/api/users", async (req, res) => {
    let userData = { ...req.body };
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }

    const newUser = await storage.upsertUser({
      id: `user-${Date.now()}`,
      ...userData,
    });
    res.status(201).json(newUser);
  });
  app.patch(api.users.update.path, async (req, res) => {
    try {
      const updates: Partial<typeof users.$inferSelect> = {};

      if (req.body.firstName !== undefined) updates.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updates.lastName = req.body.lastName;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.password !== undefined) {
        updates.password = await hashPassword(req.body.password);
      }
      if (req.body.role !== undefined) updates.role = req.body.role;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

      const updated = await storage.updateUser(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update user" });
    }
  });

  // Clients
  app.get(api.clientes.list.path, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });
  app.post(api.clientes.create.path, async (req, res) => {
    const client = await storage.createClient(req.body);
    res.status(201).json(client);
  });
  app.get(api.clientes.get.path, async (req, res) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ message: "Not found" });
    res.json(client);
  });
  app.put(api.clientes.update.path, async (req, res) => {
    const client = await storage.updateClient(Number(req.params.id), req.body);
    res.json(client);
  });
  app.delete(api.clientes.delete.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.deleteClient(Number(req.params.id), userId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Client not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Only Admin and Managers")) {
        return res.status(403).json({ message: error.message });
      }
      res.status(400).json({ message: error.message || "Failed to delete client" });
    }
  });


  // Client Docs
  app.get(api.documentos_clientes.list.path, async (req, res) => {
    const docs = await storage.getClientDocs(Number(req.params.clientId));
    res.json(docs);
  });
  app.post(api.documentos_clientes.create.path, async (req, res) => {
    const doc = await storage.createClientDoc({ ...req.body, clientId: Number(req.params.clientId) });
    res.status(201).json(doc);
  });

  // Milvus API Proxy
  app.get("/api/milvus/clients", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const milvusToken = process.env.MILVUS_TOKEN;

      if (!milvusToken) {
        return res.status(500).json({ message: "Milvus token not configured" });
      }

      // Build URL with query parameters
      const url = new URL("https://apiintegracao.milvus.com.br/api/cliente/busca");
      if (search) {
        url.searchParams.append("nome_fantasia", search);
      }
      url.searchParams.append("status", "1"); // Only active clients

      const response = await fetch(url.toString(), {
        headers: {
          "Authorization": milvusToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Milvus API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching Milvus clients:", error);
      res.status(500).json({ message: error.message || "Failed to fetch Milvus clients" });
    }
  });

  // Form Templates
  app.get(api.modelos_formularios.list.path, async (req, res) => {
    const templates = await storage.getFormTemplates();
    res.json(templates);
  });
  app.post(api.modelos_formularios.create.path, async (req, res) => {
    const { fields, ...template } = req.body;
    const newTemplate = await storage.createFormTemplate(template, fields || []);
    res.status(201).json(newTemplate);
  });
  app.get(api.modelos_formularios.get.path, async (req, res) => {
    const template = await storage.getFormTemplate(Number(req.params.id));
    if (!template) return res.status(404).json({ message: "Not found" });
    res.json(template);
  });
  app.put(api.modelos_formularios.update.path, async (req, res) => {
    const templateId = Number(req.params.id);
    const { fields, ...templateData } = req.body;

    try {
      const updatedTemplate = await storage.updateFormTemplate(templateId, templateData, fields || []);
      res.json(updatedTemplate);
    } catch (error: any) {
      if (error.message === "Template not found") {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(400).json({ message: error.message || "Failed to update template" });
    }
  });
  app.delete(api.modelos_formularios.delete.path, async (req, res) => {
    try {
      await storage.deleteFormTemplate(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to delete template" });
    }
  });

  // Projects
  app.get(api.projetos.list.path, async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });
  app.post(api.projetos.create.path, async (req, res) => {
    const project = await storage.createProject(req.body);
    res.status(201).json(project);
  });
  app.get(api.projetos.get.path, async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Not found" });
    res.json(project);
  });
  app.put(api.projetos.update.path, async (req, res) => {
    const project = await storage.updateProject(Number(req.params.id), req.body);
    res.json(project);
  });
  app.delete(api.projetos.delete.path, isAuthenticated, async (req, res) => {
    try {
      const user = (req.session as any).user || await storage.getUser((req.session as any).userId);

      // Permission check
      const allowedRoles = ["Admin", "Gerente Comercial", "Gerente Supervisor"];
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Only Admin and Managers can delete projects" });
      }

      await storage.deleteProject(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to delete project" });
    }
  });

  // Cards
  // Get all cards (for dashboard statistics)
  app.get("/api/cards", async (req, res) => {
    const cards = await storage.getAllCards();
    res.json(cards);
  });

  app.get(api.cartoes.list.path, async (req, res) => {
    const cards = await storage.getCards(Number(req.params.projectId));
    res.json(cards);
  });
  app.post(api.cartoes.create.path, async (req, res) => {
    const card = await storage.createCard({ ...req.body, projectId: Number(req.params.projectId) });
    res.status(201).json(card);
  });
  app.get(api.cartoes.get.path, async (req, res) => {
    const card = await storage.getCard(Number(req.params.id));
    if (!card) return res.status(404).json({ message: "Not found" });
    res.json(card);
  });
  app.put(api.cartoes.update.path, async (req, res) => {
    const card = await storage.updateCard(Number(req.params.id), req.body);
    res.json(card);
  });
  app.patch("/api/cards/:id/basic-info", async (req, res) => {
    const cardId = Number(req.params.id);
    const { description, priority, startDate, dueDate, assignedTechId } = req.body;

    console.log("[DEBUG] PATCH /api/cards/:id/basic-info received:", { cardId, assignedTechId, body: req.body });

    const updates: any = {};
    if (description !== undefined) updates.descricao = description;
    if (priority !== undefined) updates.prioridade = priority;
    if (startDate !== undefined) updates.data_inicio = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updates.data_prazo = dueDate ? new Date(dueDate) : null;
    if (assignedTechId !== undefined) updates.id_tecnico_atribuido = assignedTechId || null;

    console.log("[DEBUG] Updates object to be applied:", updates);

    const card = await storage.updateCard(cardId, updates);
    console.log("[DEBUG] Updated card returned:", JSON.stringify(card, null, 2));

    res.json(card);
  });
  app.patch(api.cartoes.move.path, async (req, res) => {
    const card = await storage.updateCard(Number(req.params.id), { id_coluna: req.body.columnId });
    res.json(card);
  });

  // Delete card (only for Gerente role)
  app.delete("/api/cards/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.deleteCard(Number(req.params.id), userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(403).json({ message: error.message || "Failed to delete card" });
    }
  });

  // Project Columns
  app.post("/api/projects/:projectId/columns", async (req, res) => {
    try {
      const column = await storage.createProjectColumn({
        projectId: Number(req.params.projectId),
        ...req.body,
      });
      res.status(201).json(column);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create column" });
    }
  });

  app.patch("/api/columns/:id", async (req, res) => {
    try {
      const column = await storage.updateProjectColumn(Number(req.params.id), req.body);
      res.json(column);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update column" });
    }
  });

  app.delete("/api/columns/:id", async (req, res) => {
    try {
      await storage.deleteProjectColumn(Number(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to delete column" });
    }
  });


  // Card Form
  app.post(api.cardForms.submit.path, async (req, res) => {
    await storage.submitCardForm(Number(req.params.cardId), req.body.status, req.body.answers);
    res.json({ success: true });
  });

  // Alerts
  app.get(api.alertas.list.path, async (req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  // Dashboard endpoints
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const technicianId = req.query.technicianId ? String(req.query.technicianId) : undefined;

      const stats = await storage.getDashboardStats(projectId, startDate, endDate, technicianId);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to get dashboard stats" });
    }
  });

  app.get("/api/dashboard/completion-trend", async (req, res) => {
    try {
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const period = (req.query.period as 'week' | 'month' | 'year') || 'week';
      const technicianId = req.query.technicianId ? String(req.query.technicianId) : undefined;

      const trend = await storage.getCardCompletionTrend(projectId, period, technicianId);
      res.json(trend);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to get completion trend" });
    }
  });


  // Polo Projects
  app.get(api.polo_projetos.list.path, async (req, res) => {
    const projects = await storage.getPoloProjects();
    res.json(projects);
  });

  app.post(api.polo_projetos.create.path, async (req, res) => {
    try {
      const { stages, ...projectData } = req.body;
      const project = await storage.createPoloProject(projectData, stages);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create Polo Project" });
    }
  });

  // IMPORTANT: Specific routes must come BEFORE parameterized routes
  app.get(api.polo_projetos.dashboard.path, async (req, res) => {
    try {
      const stats = await storage.getPoloProjectDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get dashboard stats" });
    }
  });

  app.get(api.polo_projetos.gantt.path, async (req, res) => {
    try {
      const ganttData = await storage.getPoloProjectGanttData(Number(req.params.id));
      res.json(ganttData);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Polo Project not found" });
    }
  });

  // Parameterized routes come after specific routes
  app.get(api.polo_projetos.get.path, async (req, res) => {
    const project = await storage.getPoloProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Polo Project not found" });
    res.json(project);
  });

  app.put(api.polo_projetos.update.path, async (req, res) => {
    try {
      const project = await storage.updatePoloProject(Number(req.params.id), req.body);
      res.json(project);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Polo Project not found" });
    }
  });

  // Polo Project Stages
  app.post(api.etapas_polo_projetos.create.path, async (req, res) => {
    try {
      const stage = await storage.createPoloProjectStage({
        ...req.body,
        poloProjectId: Number(req.params.projectId)
      });
      res.status(201).json(stage);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create stage" });
    }
  });

  app.put(api.etapas_polo_projetos.update.path, async (req, res) => {
    try {
      const stage = await storage.updatePoloProjectStage(Number(req.params.stageId), req.body);
      res.json(stage);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Stage not found" });
    }
  });

  app.delete(api.etapas_polo_projetos.delete.path, async (req, res) => {
    try {
      await storage.deletePoloProjectStage(Number(req.params.stageId));
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Stage not found" });
    }
  });


  // Sales Funnel Routes
  app.get(api.salesFunnel.columns.list.path, async (req, res) => {
    const columns = await storage.getSalesFunnelColumns();
    res.json(columns);
  });

  app.get(api.salesFunnel.cartoes.list.path, async (req, res) => {
    const cards = await storage.getSalesFunnelCards();
    res.json(cards);
  });

  app.post(api.salesFunnel.cartoes.create.path, async (req, res) => {
    try {
      const card = await storage.createSalesFunnelCard(req.body);
      res.status(201).json(card);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create sales funnel card" });
    }
  });

  app.get(api.salesFunnel.cartoes.get.path, async (req, res) => {
    const card = await storage.getSalesFunnelCard(Number(req.params.id));
    if (!card) return res.status(404).json({ message: "Sales funnel card not found" });
    res.json(card);
  });

  app.put(api.salesFunnel.cartoes.update.path, async (req, res) => {
    try {
      const card = await storage.updateSalesFunnelCard(Number(req.params.id), req.body);
      res.json(card);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Sales funnel card not found" });
    }
  });

  app.patch(api.salesFunnel.cartoes.move.path, async (req, res) => {
    try {
      console.log(`[DEBUG] Moving sales funnel card ${req.params.id} to column ${req.body.columnId}`);
      if (!req.body.columnId) {
        return res.status(400).json({ message: "columnId is required" });
      }
      const cardId = Number(req.params.id);
      const columnId = Number(req.body.columnId);

      const card = await storage.moveSalesFunnelCard(cardId, columnId);
      res.json(card);
    } catch (error: any) {
      console.error(`[ERROR] Failed to move sales funnel card:`, error);
      res.status(error.message === "Sales funnel card not found" ? 404 : 400).json({
        message: error.message || "Failed to move sales funnel card"
      });
    }
  });

  app.delete(api.salesFunnel.cartoes.delete.path, async (req, res) => {
    try {
      await storage.deleteSalesFunnelCard(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Sales funnel card not found" });
    }
  });

  app.get("/api/sales-funnel/stats", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Parse date parameters
      const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

      const stats = await storage.getSalesFunnelStats(parsedStartDate, parsedEndDate);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get sales funnel stats" });
    }
  });

  // Seed Data - Create default client and form template
  try {
    // Create default client (PoloTelecom) if not exists
    const clients = await storage.getClients();
    const poloTelecomExists = clients.some(c => c.nome === "PoloTelecom");

    if (!poloTelecomExists) {
      console.log("Seeding default client: PoloTelecom...");
      await storage.createClient({
        nome: "PoloTelecom",
        cnpj: "",
        contato: "",
        telefone: "",
        email: "",
        observacoes: "Cliente padrão do sistema"
      });
      console.log("Seeded default client: PoloTelecom.");
    }

  } catch (error) {
    console.error("Error seeding data:", error);
  }

  return httpServer;
}

