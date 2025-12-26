import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes } from "./auth/auth-routes";
import { isAuthenticated } from "./auth/local-auth";
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
    const newUser = await storage.upsertUser({
      id: `user-${Date.now()}`,
      ...req.body,
    });
    res.status(201).json(newUser);
  });
  app.patch(api.users.update.path, async (req, res) => {
    try {
      const updates: Partial<typeof users.$inferSelect> = {};

      if (req.body.firstName !== undefined) updates.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updates.lastName = req.body.lastName;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.password !== undefined) updates.password = req.body.password; // Store plaintext for now (matching existing auth)
      if (req.body.role !== undefined) updates.role = req.body.role;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

      const updated = await storage.updateUser(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update user" });
    }
  });

  // Clients
  app.get(api.clients.list.path, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });
  app.post(api.clients.create.path, async (req, res) => {
    const client = await storage.createClient(req.body);
    res.status(201).json(client);
  });
  app.get(api.clients.get.path, async (req, res) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ message: "Not found" });
    res.json(client);
  });
  app.put(api.clients.update.path, async (req, res) => {
    const client = await storage.updateClient(Number(req.params.id), req.body);
    res.json(client);
  });

  // Client Docs
  app.get(api.clientDocs.list.path, async (req, res) => {
    const docs = await storage.getClientDocs(Number(req.params.clientId));
    res.json(docs);
  });
  app.post(api.clientDocs.create.path, async (req, res) => {
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
  app.get(api.formTemplates.list.path, async (req, res) => {
    const templates = await storage.getFormTemplates();
    res.json(templates);
  });
  app.post(api.formTemplates.create.path, async (req, res) => {
    const { fields, ...template } = req.body;
    const newTemplate = await storage.createFormTemplate(template, fields || []);
    res.status(201).json(newTemplate);
  });
  app.get(api.formTemplates.get.path, async (req, res) => {
    const template = await storage.getFormTemplate(Number(req.params.id));
    if (!template) return res.status(404).json({ message: "Not found" });
    res.json(template);
  });
  app.put(api.formTemplates.update.path, async (req, res) => {
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

  // Projects
  app.get(api.projects.list.path, async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });
  app.post(api.projects.create.path, async (req, res) => {
    const project = await storage.createProject(req.body);
    res.status(201).json(project);
  });
  app.get(api.projects.get.path, async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Not found" });
    res.json(project);
  });
  app.put(api.projects.update.path, async (req, res) => {
    const project = await storage.updateProject(Number(req.params.id), req.body);
    res.json(project);
  });

  // Cards
  // Get all cards (for dashboard statistics)
  app.get("/api/cards", async (req, res) => {
    const cards = await storage.getAllCards();
    res.json(cards);
  });

  app.get(api.cards.list.path, async (req, res) => {
    const cards = await storage.getCards(Number(req.params.projectId));
    res.json(cards);
  });
  app.post(api.cards.create.path, async (req, res) => {
    const card = await storage.createCard({ ...req.body, projectId: Number(req.params.projectId) });
    res.status(201).json(card);
  });
  app.get(api.cards.get.path, async (req, res) => {
    const card = await storage.getCard(Number(req.params.id));
    if (!card) return res.status(404).json({ message: "Not found" });
    res.json(card);
  });
  app.put(api.cards.update.path, async (req, res) => {
    const card = await storage.updateCard(Number(req.params.id), req.body);
    res.json(card);
  });
  app.patch("/api/cards/:id/basic-info", async (req, res) => {
    const cardId = Number(req.params.id);
    const { description, priority, startDate, dueDate, assignedTechId } = req.body;

    console.log("[DEBUG] PATCH /api/cards/:id/basic-info received:", { cardId, assignedTechId, body: req.body });

    const updates: any = {};
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedTechId !== undefined) updates.assignedTechId = assignedTechId || null;

    console.log("[DEBUG] Updates object to be applied:", updates);

    const card = await storage.updateCard(cardId, updates);
    console.log("[DEBUG] Updated card returned:", JSON.stringify(card, null, 2));

    res.json(card);
  });
  app.patch(api.cards.move.path, async (req, res) => {
    const card = await storage.updateCard(Number(req.params.id), { columnId: req.body.columnId });
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
  app.get(api.alerts.list.path, async (req, res) => {
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
  app.get(api.poloProjects.list.path, async (req, res) => {
    const projects = await storage.getPoloProjects();
    res.json(projects);
  });

  app.post(api.poloProjects.create.path, async (req, res) => {
    try {
      const { stages, ...projectData } = req.body;
      const project = await storage.createPoloProject(projectData, stages);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create Polo Project" });
    }
  });

  // IMPORTANT: Specific routes must come BEFORE parameterized routes
  app.get(api.poloProjects.dashboard.path, async (req, res) => {
    try {
      const stats = await storage.getPoloProjectDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get dashboard stats" });
    }
  });

  app.get(api.poloProjects.gantt.path, async (req, res) => {
    try {
      const ganttData = await storage.getPoloProjectGanttData(Number(req.params.id));
      res.json(ganttData);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Polo Project not found" });
    }
  });

  // Parameterized routes come after specific routes
  app.get(api.poloProjects.get.path, async (req, res) => {
    const project = await storage.getPoloProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Polo Project not found" });
    res.json(project);
  });

  app.put(api.poloProjects.update.path, async (req, res) => {
    try {
      const project = await storage.updatePoloProject(Number(req.params.id), req.body);
      res.json(project);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Polo Project not found" });
    }
  });

  // Polo Project Stages
  app.post(api.poloProjectStages.create.path, async (req, res) => {
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

  app.put(api.poloProjectStages.update.path, async (req, res) => {
    try {
      const stage = await storage.updatePoloProjectStage(Number(req.params.stageId), req.body);
      res.json(stage);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Stage not found" });
    }
  });

  app.delete(api.poloProjectStages.delete.path, async (req, res) => {
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

  app.get(api.salesFunnel.cards.list.path, async (req, res) => {
    const cards = await storage.getSalesFunnelCards();
    res.json(cards);
  });

  app.post(api.salesFunnel.cards.create.path, async (req, res) => {
    try {
      const card = await storage.createSalesFunnelCard(req.body);
      res.status(201).json(card);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create sales funnel card" });
    }
  });

  app.get(api.salesFunnel.cards.get.path, async (req, res) => {
    const card = await storage.getSalesFunnelCard(Number(req.params.id));
    if (!card) return res.status(404).json({ message: "Sales funnel card not found" });
    res.json(card);
  });

  app.put(api.salesFunnel.cards.update.path, async (req, res) => {
    try {
      const card = await storage.updateSalesFunnelCard(Number(req.params.id), req.body);
      res.json(card);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Sales funnel card not found" });
    }
  });

  app.patch(api.salesFunnel.cards.move.path, async (req, res) => {
    try {
      const card = await storage.moveSalesFunnelCard(Number(req.params.id), req.body.columnId);
      res.json(card);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Sales funnel card not found" });
    }
  });

  app.delete(api.salesFunnel.cards.delete.path, async (req, res) => {
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
    const poloTelecomExists = clients.some(c => c.name === "PoloTelecom");

    if (!poloTelecomExists) {
      console.log("Seeding default client: PoloTelecom...");
      await storage.createClient({
        name: "PoloTelecom",
        cnpj: "",
        contact: "",
        phone: "",
        email: "",
        notes: "Cliente padrão do sistema"
      });
      console.log("Seeded default client: PoloTelecom.");
    }

    // Create default form template if not exists
    const templates = await storage.getFormTemplates();
    const contractTemplateExists = templates.some(t => t.name === "Formulário de Contratos");

    if (!contractTemplateExists) {
      console.log("Seeding default form template: Formulário de Contratos...");
      await storage.createFormTemplate({
        name: "Formulário de Contratos",
        description: "Template padrão para gestão de contratos",
        version: "1.0",
        isActive: true,
      }, [
        { order: 1, label: "Cliente", type: "text", required: true } as any,
        { order: 2, label: "Produto", type: "text", required: true } as any,
        { order: 3, label: "Fornecedor", type: "text", required: true } as any,
        { order: 4, label: "Tipo de Contrato", type: "list", required: true, options: ["Novo", "Aditivo"] } as any,
        { order: 5, label: "Descrição", type: "long_text", required: false } as any,
        { order: 6, label: "Data de Assinatura", type: "date", required: true } as any,
      ]);
      console.log("Seeded default form template: Formulário de Contratos.");
    }
  } catch (error) {
    console.error("Error seeding data:", error);
  }

  return httpServer;
}
