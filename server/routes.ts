import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAssemblerSchema, insertAssemblyCardSchema, updateAssemblyCardSchema, insertAndonIssueSchema, updateAndonIssueSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updateData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Assemblers routes
  app.get("/api/assemblers", async (req, res) => {
    try {
      const assemblers = await storage.getAssemblers();
      res.json(assemblers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assemblers" });
    }
  });

  app.get("/api/assemblers/:id", async (req, res) => {
    try {
      const assembler = await storage.getAssembler(req.params.id);
      if (!assembler) {
        return res.status(404).json({ message: "Assembler not found" });
      }
      res.json(assembler);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assembler" });
    }
  });

  app.post("/api/assemblers", async (req, res) => {
    try {
      const validatedData = insertAssemblerSchema.parse(req.body);
      const assembler = await storage.createAssembler(validatedData);
      res.status(201).json(assembler);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assembler" });
    }
  });

  app.patch("/api/assemblers/:id", async (req, res) => {
    try {
      const updateData = insertAssemblerSchema.partial().parse(req.body);
      const assembler = await storage.updateAssembler(req.params.id, updateData);
      if (!assembler) {
        return res.status(404).json({ message: "Assembler not found" });
      }
      res.json(assembler);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update assembler" });
    }
  });

  // Assembly Cards routes
  app.get("/api/assembly-cards", async (req, res) => {
    try {
      const cards = await storage.getAssemblyCards();
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assembly cards" });
    }
  });

  app.get("/api/assembly-cards/:id", async (req, res) => {
    try {
      const card = await storage.getAssemblyCard(req.params.id);
      if (!card) {
        return res.status(404).json({ message: "Assembly card not found" });
      }
      res.json(card);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assembly card" });
    }
  });

  app.post("/api/assembly-cards", async (req, res) => {
    try {
      const validatedData = insertAssemblyCardSchema.parse(req.body);
      const card = await storage.createAssemblyCard(validatedData);
      res.status(201).json(card);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assembly card" });
    }
  });

  app.patch("/api/assembly-cards/:id", async (req, res) => {
    try {
      console.log("Update request received:", req.params.id, req.body);
      const updateData = updateAssemblyCardSchema.parse({ ...req.body, id: req.params.id });
      console.log("Validated update data:", updateData);
      const card = await storage.updateAssemblyCard(updateData);
      if (!card) {
        return res.status(404).json({ message: "Assembly card not found" });
      }
      res.json(card);
    } catch (error) {
      console.error("Update error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update assembly card" });
    }
  });

  app.delete("/api/assembly-cards/:id", async (req, res) => {
    try {
      const success = await storage.deleteAssemblyCard(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Assembly card not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assembly card" });
    }
  });

  // Dependency validation
  app.post("/api/assembly-cards/:cardNumber/validate-dependencies", async (req, res) => {
    try {
      const { dependencies } = z.object({ dependencies: z.array(z.string()) }).parse(req.body);
      const validation = await storage.validateDependencies(req.params.cardNumber, dependencies);
      res.json(validation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to validate dependencies" });
    }
  });

  // Andon Issues routes
  app.get("/api/andon-issues", async (req, res) => {
    try {
      const issues = await storage.getAndonIssues();
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch andon issues" });
    }
  });

  app.get("/api/andon-issues/:id", async (req, res) => {
    try {
      const issue = await storage.getAndonIssue(parseInt(req.params.id));
      if (!issue) {
        return res.status(404).json({ message: "Andon issue not found" });
      }
      res.json(issue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch andon issue" });
    }
  });

  app.post("/api/andon-issues", async (req, res) => {
    try {
      const validatedData = insertAndonIssueSchema.parse(req.body);
      const issue = await storage.createAndonIssue(validatedData);
      res.status(201).json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create andon issue" });
    }
  });

  app.patch("/api/andon-issues/:id", async (req, res) => {
    try {
      const updateData = updateAndonIssueSchema.parse({
        id: parseInt(req.params.id),
        ...req.body
      });
      const issue = await storage.updateAndonIssue(updateData);
      if (!issue) {
        return res.status(404).json({ message: "Andon issue not found" });
      }
      res.json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update andon issue" });
    }
  });

  app.delete("/api/andon-issues/:id", async (req, res) => {
    try {
      const success = await storage.deleteAndonIssue(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Andon issue not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete andon issue" });
    }
  });

  // Photo upload routes for Andon alerts
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/andon-photos", async (req, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.photoURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting andon photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
