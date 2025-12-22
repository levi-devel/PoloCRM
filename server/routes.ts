import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  // Users
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });
  app.patch(api.users.update.path, async (req, res) => {
    const updated = await storage.updateUser(req.params.id, req.body);
    res.json(updated);
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
  app.patch(api.cards.move.path, async (req, res) => {
    const card = await storage.updateCard(Number(req.params.id), { columnId: req.body.columnId });
    res.json(card);
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

  // Seed Data
  try {
      const templates = await storage.getFormTemplates();
      if (templates.length === 0) {
        console.log("Seeding default template...");
        await storage.createFormTemplate({
            name: "Formulário Padrão - Desenvolvimento",
            description: "Template padrão para projetos de software",
            version: "1.0",
            isActive: true,
        }, [
            { order: 1, label: "Link do repositório", type: "text", required: true },
            { order: 2, label: "Ambiente", type: "list", required: true, options: ["Dev", "Homolog", "Prod"] },
            { order: 3, label: "URL de homologação", type: "text", required: false },
            { order: 4, label: "Data prevista do card", type: "date", required: false },
            { order: 5, label: "Checklist de validação", type: "checkbox", required: false },
            { order: 6, label: "Observações", type: "long_text", required: false },
            { order: 7, label: "Anexo", type: "file", required: false },
        ]);
        console.log("Seeded default template.");
      }
  } catch (error) {
      console.error("Error seeding data:", error);
  }

  return httpServer;
}
