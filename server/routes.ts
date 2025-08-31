import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAssemblerSchema, insertAssemblyCardSchema, updateAssemblyCardSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
