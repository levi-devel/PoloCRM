import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes } from "./auth/auth-routes";
import { isAuthenticated, hashPassword } from "./auth/local-auth";
import { api } from "../shared/routes";
import { users } from "../shared/models/auth";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";


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

  // Change Password - User changes their own password
  app.patch(api.users.changePassword.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Nova senha deve ter no mínimo 6 caracteres" });
      }

      // Get current user
      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const bcrypt = await import("bcrypt");
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Senha atual incorreta" });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      await storage.updateUser(userId, { password: hashedNewPassword });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: error.message || "Falha ao trocar senha" });
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

  // File Upload Configuration - Client Specs
  const uploadsDir = path.join(process.cwd(), "uploads", "client-specs");

  // File Upload Configuration - Card Attachments
  const cardUploadsDir = path.join(process.cwd(), "uploads", "card-attachments");

  // Ensure uploads directories exist
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(cardUploadsDir, { recursive: true });

  const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Determine destination based on the route
      if (req.path.includes('/cards/')) {
        cb(null, cardUploadsDir);
      } else {
        cb(null, uploadsDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(file.originalname);
      const prefix = req.path.includes('/cards/') ? 'card-att-' : 'spec-';
      cb(null, `${prefix}${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage: fileStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo não permitido.'));
      }
    }
  });

  // Upload Technical Specification
  app.post("/api/clientes/:id/upload-spec", (req, res) => {
    // Ensure directory exists before upload
    fs.mkdir(uploadsDir, { recursive: true })
      .then(() => {
        // Process the upload
        upload.single('file')(req, res, async (err) => {
          try {
            // Check for multer errors
            if (err) {
              console.error("[ERROR] Multer error uploading spec:", err);
              if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                  return res.status(400).json({ message: "Arquivo muito grande. Máximo 10MB" });
                }
                return res.status(400).json({ message: `Erro ao fazer upload: ${err.message}` });
              }
              return res.status(500).json({ message: err.message || "Falha ao fazer upload do arquivo" });
            }

            if (!req.file) {
              console.error("[ERROR] No file received in request");
              return res.status(400).json({ message: "Nenhum arquivo enviado" });
            }

            const clientId = Number(req.params.id);
            const client = await storage.getClient(clientId);

            if (!client) {
              // Remove uploaded file if client doesn't exist
              await fs.unlink(req.file.path);
              return res.status(404).json({ message: "Cliente não encontrado" });
            }

            console.log("[DEBUG] Client spec file uploaded successfully:", {
              clientId,
              originalName: req.file.originalname,
              storedName: req.file.filename,
              size: req.file.size,
              path: req.file.path,
              destination: req.file.destination
            });

            // Create file metadata
            const fileMetadata = {
              originalName: req.file.originalname,
              storedName: req.file.filename,
              fileSize: req.file.size,
              uploadDate: new Date().toISOString(),
              mimeType: req.file.mimetype
            };

            // Get existing files array or create new one
            let existingFiles: any[] = [];
            if (client.caminho_especificacao_tecnica) {
              const parsed = typeof client.caminho_especificacao_tecnica === 'string'
                ? JSON.parse(client.caminho_especificacao_tecnica)
                : client.caminho_especificacao_tecnica;

              // Handle both old single-file format and new array format
              existingFiles = Array.isArray(parsed) ? parsed : [parsed];
            }

            // Add new file to array
            const updatedFiles = [...existingFiles, fileMetadata];

            // Update client with new files array
            await storage.updateClient(clientId, {
              caminho_especificacao_tecnica: updatedFiles
            });

            res.json({ success: true, file: fileMetadata, allFiles: updatedFiles });
          } catch (error: any) {
            // Clean up uploaded file on error
            if (req.file) {
              try {
                await fs.unlink(req.file.path);
              } catch (e) {
                console.error("[ERROR] Failed to delete file on error:", e);
              }
            }
            console.error("[ERROR] Error uploading specification:", error);
            res.status(500).json({ message: error.message || "Falha ao fazer upload do arquivo" });
          }
        });
      })
      .catch((err) => {
        console.error("[ERROR] Failed to create upload directory:", err);
        res.status(500).json({ message: "Falha ao criar diretório de upload" });
      });
  });

  // View Technical Specification (open in browser)
  app.get("/api/clientes/:id/view-spec", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const storedName = req.query.file as string;
      const client = await storage.getClient(clientId);

      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      if (!client.caminho_especificacao_tecnica) {
        return res.status(404).json({ message: "Nenhum arquivo anexado" });
      }

      // Parse JSON if it's a string (MySQL returns JSON as string)
      let filesArray = typeof client.caminho_especificacao_tecnica === 'string'
        ? JSON.parse(client.caminho_especificacao_tecnica)
        : client.caminho_especificacao_tecnica;

      // Ensure it's an array
      if (!Array.isArray(filesArray)) {
        filesArray = [filesArray];
      }

      // Find the specific file
      const fileMetadata = filesArray.find((f: any) => f.storedName === storedName);

      if (!fileMetadata) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      const filePath = path.join(uploadsDir, fileMetadata.storedName);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      // Set Content-Type and inline disposition to open in browser
      res.setHeader('Content-Type', fileMetadata.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileMetadata.originalName}"`);
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Error viewing specification:", error);
      res.status(500).json({ message: error.message || "Falha ao visualizar o arquivo" });
    }
  });

  // Download Technical Specification
  app.get("/api/clientes/:id/download-spec", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const storedName = req.query.file as string;
      const client = await storage.getClient(clientId);

      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      if (!client.caminho_especificacao_tecnica) {
        return res.status(404).json({ message: "Nenhum arquivo anexado" });
      }

      // Parse JSON if it's a string (MySQL returns JSON as string)
      let filesArray = typeof client.caminho_especificacao_tecnica === 'string'
        ? JSON.parse(client.caminho_especificacao_tecnica)
        : client.caminho_especificacao_tecnica;

      // Ensure it's an array
      if (!Array.isArray(filesArray)) {
        filesArray = [filesArray];
      }

      // Find the specific file
      const fileMetadata = filesArray.find((f: any) => f.storedName === storedName);

      if (!fileMetadata) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      const filePath = path.join(uploadsDir, fileMetadata.storedName);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      res.download(filePath, fileMetadata.originalName);
    } catch (error: any) {
      console.error("Error downloading specification:", error);
      res.status(500).json({ message: error.message || "Falha ao fazer download do arquivo" });
    }
  });

  // Delete Technical Specification
  app.delete("/api/clientes/:id/delete-spec", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const storedName = req.query.file as string; // Which file to delete
      const client = await storage.getClient(clientId);

      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      if (!client.caminho_especificacao_tecnica) {
        return res.status(404).json({ message: "Nenhum arquivo anexado" });
      }

      // Parse JSON if it's a string (MySQL returns JSON as string)
      let filesArray = typeof client.caminho_especificacao_tecnica === 'string'
        ? JSON.parse(client.caminho_especificacao_tecnica)
        : client.caminho_especificacao_tecnica;

      // Ensure it's an array
      if (!Array.isArray(filesArray)) {
        filesArray = [filesArray];
      }

      // Find the file to delete
      const fileToDelete = filesArray.find((f: any) => f.storedName === storedName);

      if (!fileToDelete) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      // Delete file from disk
      const filePath = path.join(uploadsDir, fileToDelete.storedName);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.log("File not found or already deleted");
      }

      // Remove file from array
      const updatedFiles = filesArray.filter((f: any) => f.storedName !== storedName);

      // Update client with new files array (or null if empty)
      await storage.updateClient(clientId, {
        caminho_especificacao_tecnica: updatedFiles.length > 0 ? updatedFiles : null
      });

      res.json({ success: true, remainingFiles: updatedFiles });
    } catch (error: any) {
      console.error("Error deleting specification:", error);
      res.status(500).json({ message: error.message || "Falha ao excluir o arquivo" });
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

  app.get(api.cartoes.list.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      // Admin e Gerentes veem todos os cards
      const isManagerOrAdmin = ["Admin", "Gerente Comercial", "Gerente Supervisor"].includes(user.role);

      let cards;
      if (isManagerOrAdmin) {
        cards = await storage.getCards(Number(req.params.projectId));
      } else {
        // Técnicos veem apenas seus próprios cards
        cards = await storage.getCardsByTechnician(
          Number(req.params.projectId),
          userId
        );
      }

      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Falha ao buscar cards" });
    }
  });
  app.post(api.cartoes.create.path, async (req, res) => {
    const card = await storage.createCard({ ...req.body, id_projeto: Number(req.params.projectId) });
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

  // Card File Attachments
  app.post("/api/cards/:id/upload", (req, res) => {
    // Ensure directory exists before upload
    fs.mkdir(cardUploadsDir, { recursive: true })
      .then(() => {
        // Process the upload
        upload.single('file')(req, res, async (err) => {
          try {
            // Check for multer errors
            if (err) {
              console.error("[ERROR] Multer error uploading card file:", err);
              if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                  return res.status(400).json({ message: "Arquivo muito grande. Máximo 10MB" });
                }
                return res.status(400).json({ message: `Erro ao fazer upload: ${err.message}` });
              }
              return res.status(500).json({ message: err.message || "Falha ao fazer upload do arquivo" });
            }

            if (!req.file) {
              console.error("[ERROR] No file received in request");
              return res.status(400).json({ message: "Nenhum arquivo enviado" });
            }

            console.log("[DEBUG] Card file uploaded successfully:", {
              originalName: req.file.originalname,
              storedName: req.file.filename,
              size: req.file.size,
              path: req.file.path,
              destination: req.file.destination
            });

            const fileMetadata = {
              originalName: req.file.originalname,
              storedName: req.file.filename,
              fileSize: req.file.size,
              uploadDate: new Date().toISOString(),
              mimeType: req.file.mimetype
            };

            res.json({ success: true, file: fileMetadata });
          } catch (error: any) {
            if (req.file) {
              try {
                await fs.unlink(req.file.path);
              } catch (e) {
                console.error("[ERROR] Failed to delete file on error:", e);
              }
            }
            console.error("[ERROR] Error uploading card file:", error);
            res.status(500).json({ message: error.message || "Falha ao fazer upload do arquivo" });
          }
        });
      })
      .catch((err) => {
        console.error("[ERROR] Failed to create upload directory:", err);
        res.status(500).json({ message: "Falha ao criar diretório de upload" });
      });
  });

  app.get("/api/cards/:id/view-file", async (req, res) => {
    try {
      const storedName = req.query.file as string;
      const originalName = req.query.name as string || "arquivo";

      const filePath = path.join(cardUploadsDir, storedName);

      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      // Determine mime type from extension if not stored/passed, or rely on original filename ext
      const ext = path.extname(storedName).toLowerCase();
      let contentType = 'application/octet-stream';

      if (['.png', '.jpg', '.jpeg'].includes(ext)) contentType = `image/${ext.replace('.', '')}`;
      else if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.txt') contentType = 'text/plain';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Error viewing card file:", error);
      res.status(500).json({ message: error.message || "Falha ao visualizar o arquivo" });
    }
  });

  app.get("/api/cards/:id/download-file", async (req, res) => {
    try {
      const storedName = req.query.file as string;
      const originalName = req.query.name as string || "arquivo";

      const filePath = path.join(cardUploadsDir, storedName);

      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      res.download(filePath, originalName);
    } catch (error: any) {
      console.error("Error downloading card file:", error);
      res.status(500).json({ message: error.message || "Falha ao fazer download do arquivo" });
    }
  });

  // Alerts
  // Get alerts for current user
  app.get(api.alertas.list.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const alerts = await storage.getUserAlerts(userId);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get alerts" });
    }
  });

  // Get unread alerts count for current user
  app.get("/api/alertas/unread-count", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const count = await storage.getUnreadAlertsCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get unread count" });
    }
  });

  // Mark alert as read
  app.patch("/api/alertas/:id/mark-read", isAuthenticated, async (req, res) => {
    try {
      await storage.markAlertAsRead(Number(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to mark alert as read" });
    }
  });

  // Mark all alerts as read
  app.patch("/api/alertas/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.markAllAlertsAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to mark all alerts as read" });
    }
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

  app.get("/api/dashboard/project-technician-stats", async (req, res) => {
    try {
      const projectId = req.query.projectId && req.query.projectId !== "all" ? Number(req.query.projectId) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const technicianId = req.query.technicianId && req.query.technicianId !== "all" ? String(req.query.technicianId) : undefined;

      const stats = await storage.getProjectTechnicianStats(projectId, startDate, endDate, technicianId);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to get project technician stats" });
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

  app.get("/api/dashboard/technician-ranking", async (req, res) => {
    try {
      const projectId = req.query.projectId && req.query.projectId !== "all" ? Number(req.query.projectId) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const ranking = await storage.getTechnicianRanking(projectId, startDate, endDate);
      res.json(ranking);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to get technician ranking" });
    }
  });


  // Polo Projects
  app.get(api.polo_projetos.list.path, async (req, res) => {
    const projects = await storage.getPoloProjects();
    res.json(projects);
  });

  app.post(api.polo_projetos.create.path, async (req, res) => {
    try {
      console.log("[DEBUG] Polo Project creation request body:", JSON.stringify(req.body, null, 2));
      const { stages, ...projectData } = req.body;
      console.log("[DEBUG] Project data after destructuring:", JSON.stringify(projectData, null, 2));
      const project = await storage.createPoloProject(projectData, stages);
      console.log("[DEBUG] Polo Project created successfully:", project);
      res.status(201).json(project);
    } catch (error: any) {
      console.error("[ERROR] Failed to create Polo Project:", error);
      console.error("[ERROR] Error stack:", error.stack);
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
      // Validação dos dados recebidos
      const updateSchema = z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
        status: z.enum(["Ativo", "Pausado", "Concluído", "Cancelado"]),
        data_inicial: z.string().nullable().optional(),
        data_final: z.string().nullable().optional(),
        id_cliente: z.number().nullable().optional()
      });

      const validatedData = updateSchema.parse(req.body);

      // Manter strings de data sem conversão para Date objects
      const dataToUpdate = {
        nome: validatedData.nome,
        descricao: validatedData.descricao,
        status: validatedData.status,
        data_inicial: validatedData.data_inicial,
        data_final: validatedData.data_final,
        id_cliente: validatedData.id_cliente
      };

      const project = await storage.updatePoloProject(Number(req.params.id), dataToUpdate);
      res.json(project);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Dados inválidos",
          errors: error.errors
        });
      }
      res.status(404).json({ message: error.message || "Polo Project not found" });
    }
  });

  app.delete(api.polo_projetos.delete.path, isAuthenticated, async (req, res) => {
    try {
      const user = (req.session as any).user || await storage.getUser((req.session as any).userId);

      const allowedRoles = ["Admin", "Gerente Comercial", "Gerente Supervisor"];
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Apenas Admin e Gerentes podem excluir Polo Projects" });
      }

      await storage.deletePoloProject(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to delete Polo Project" });
    }
  });

  // Polo Project Stages
  app.post(api.etapas_polo_projetos.create.path, async (req, res) => {
    try {
      const stage = await storage.createPoloProjectStage({
        ...req.body,
        id_polo_projeto: Number(req.params.projectId)
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

  // Polo Project Pauses
  app.get("/api/polo-projetos/:id/pausas", async (req, res) => {
    try {
      const pausas = await storage.getPoloProjectPauses(Number(req.params.id));
      res.json(pausas);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get pause history" });
    }
  });

  app.post("/api/polo-projetos/:id/pausas", isAuthenticated, async (req, res) => {
    try {
      const user = (req.session as any).user || await storage.getUser((req.session as any).userId);

      const pause = await storage.createPoloProjectPause({
        id_polo_projeto: Number(req.params.id),
        motivo: req.body.motivo,
        data_pausa: req.body.data_pausa,
        criado_por: user.id,
      });

      res.status(201).json(pause);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create pause" });
    }
  });

  app.patch("/api/pausas/:id/retomar", isAuthenticated, async (req, res) => {
    try {
      const pause = await storage.updatePoloProjectPause(Number(req.params.id), {
        data_retomada: req.body.data_retomada,
      });

      res.json(pause);
    } catch (error: any) {
      res.status(404).json({ message: error.message || "Pause not found" });
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

