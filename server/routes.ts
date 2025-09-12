import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertAssemblerSchema, insertAssemblyCardSchema, updateAssemblyCardSchema, insertAndonIssueSchema, updateAndonIssueSchema, insertThreadSchema, insertMessageSchema, updateThreadSchema, insertVoteSchema, fileUploadSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";
import XLSX from "xlsx";
import Papa from "papaparse";

// Auto-generate pick list URL from Job Number, Assembly Seq, and Operation Seq
function generatePickListUrl(jobNumber: string | null, assemblySeq: string | null, operationSeq: string | null): string | null {
  if (!jobNumber || !assemblySeq || !operationSeq) {
    return null;
  }
  
  const baseUrl = "https://centralusdtapp47.epicorsaas.com/SaaS5073/Apps/Erp/Home/#/view/UDJobPik?channelid=efccd09a-297a-4e13-a529-94c7486c2d20&layerVersion=0&baseAppVersion=0&company=VIK&site=MfgSys&";
  return `${baseUrl}KeyFields.JobNum=${encodeURIComponent(jobNumber)}&KeyFields.AsySeq=${encodeURIComponent(assemblySeq)}&KeyFields.OpSeq=${encodeURIComponent(operationSeq)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Accept Excel and CSV files based on file extension (more reliable than MIME type)
      const filename = file.originalname.toLowerCase();
      if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
      }
    }
  });
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(credentials);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword,
        message: "Login successful" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to authenticate" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    res.json({ message: "Logout successful" });
  });

  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
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
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
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
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
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

  // Generate template file endpoint - MUST be before the /:id route
  app.get("/api/assembly-cards/template", async (req, res) => {
    try {
      const format = req.query.format as string || 'xlsx';
      
      // Get current assembly cards to use as example data
      const existingCards = await storage.getAssemblyCards();
      
      // Create template data with current cards as examples
      const templateData = existingCards.length > 0 ? existingCards.map(card => ({
        cardNumber: card.cardNumber,
        name: card.name,
        type: card.type,
        duration: card.duration,
        phase: card.phase,
        assignedTo: card.assignedTo || '',
        status: card.status,
        dependencies: card.dependencies.join(','),
        gembaDocLink: card.gembaDocLink || '',
        materialSeq: card.materialSeq || null,
        assemblySeq: card.assemblySeq || null,
        operationSeq: card.operationSeq || null,
        subAssyArea: card.subAssyArea || '',
        requiresCrane: card.requiresCrane,
        pickTime: card.pickTime || null
      })) : [
        {
          cardNumber: 'M1',
          name: 'Example Mechanical Card',
          type: 'M',
          duration: 8,
          phase: 1,
          assignedTo: '',
          status: 'scheduled',
          dependencies: '',
          gembaDocLink: 'https://example.com/instructions',
          materialSeq: 100,
          assemblySeq: 200,
          operationSeq: 300,
          subAssyArea: '',
          requiresCrane: false,
          pickTime: 60
        },
        {
          cardNumber: 'E1',
          name: 'Example Electrical Card',
          type: 'E',
          duration: 6,
          phase: 1,
          assignedTo: '',
          status: 'scheduled',
          dependencies: '',
          gembaDocLink: '',
          materialSeq: null,
          assemblySeq: null,
          operationSeq: null,
          subAssyArea: '',
          requiresCrane: false,
          pickTime: 30
        }
      ];

      if (format === 'csv') {
        const csv = Papa.unparse(templateData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=assembly_cards_template.csv');
        res.send(csv);
      } else {
        // Generate Excel file
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Assembly Cards');
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=assembly_cards_template.xlsx');
        res.send(buffer);
      }
    } catch (error) {
      console.error("Template generation error:", error);
      res.status(500).json({ message: "Failed to generate template" });
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
      console.error("Error creating assembly card:", error);
      res.status(500).json({ message: "Failed to create assembly card" });
    }
  });

  app.patch("/api/assembly-cards/:id", async (req, res) => {
    try {
      const updateData = updateAssemblyCardSchema.parse({ ...req.body, id: req.params.id });
      
      // Auto-generate pick list URL if required fields are present and no manual URL is set
      if (!updateData.pickListLink && updateData.materialSeq && updateData.assemblySeq && updateData.operationSeq) {
        updateData.pickListLink = generatePickListUrl(updateData.materialSeq?.toString() || null, updateData.assemblySeq?.toString() || null, updateData.operationSeq?.toString() || null);
      }
      
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

  // Bulk reset all assembly cards to "scheduled" status
  app.post("/api/assembly-cards/bulk/reset-status", async (req, res) => {
    try {
      await storage.resetAllAssemblyCardsStatus();
      res.json({ message: "All assembly cards reset to scheduled status" });
    } catch (error) {
      console.error("Reset status error:", error);
      res.status(500).json({ message: "Failed to reset assembly card statuses" });
    }
  });

  // Bulk delete all assembly cards
  app.delete("/api/assembly-cards/bulk/delete-all", async (req, res) => {
    try {
      await storage.deleteAllAssemblyCards();
      res.json({ message: "All assembly cards deleted" });
    } catch (error) {
      console.error("Delete all error:", error);
      res.status(500).json({ message: "Failed to delete all assembly cards" });
    }
  });

  // Update all assembly card start times based on a new build start date
  app.post("/api/assembly-cards/bulk/update-start-times", async (req, res) => {
    try {
      const { buildStartDate } = z.object({
        buildStartDate: z.string().transform((str) => new Date(str))
      }).parse(req.body);
      
      const allCards = await storage.getAssemblyCards();
      const updatedCards = [];
      
      // Update all cards with the new build start date
      for (const card of allCards) {
        const updatedCard = await storage.updateAssemblyCard({
          id: card.id,
          startTime: buildStartDate,
        });
        
        if (updatedCard) {
          updatedCards.push(updatedCard);
        }
      }
      
      res.json({
        message: "All assembly card start times updated successfully",
        updatedCount: updatedCards.length,
        buildStartDate: buildStartDate.toISOString()
      });
    } catch (error) {
      console.error("Update start times error:", error);
      res.status(500).json({ message: "Failed to update assembly card start times" });
    }
  });

  // Calculate and update phase cleared to build dates
  app.post("/api/assembly-cards/bulk/update-phase-cleared-dates", async (req, res) => {
    try {
      const allCards = await storage.getAssemblyCards();
      
      // Group cards by phase and find earliest startTime for each phase
      const phaseEarliestDates: { [phase: number]: Date | null } = {};
      
      for (let phase = 1; phase <= 4; phase++) {
        const phaseCards = allCards.filter(card => card.phase === phase && card.startTime);
        if (phaseCards.length > 0) {
          const earliestDate = phaseCards.reduce((earliest, card) => {
            if (!card.startTime) return earliest;
            if (!earliest) return card.startTime;
            return card.startTime < earliest ? card.startTime : earliest;
          }, null as Date | null);
          phaseEarliestDates[phase] = earliestDate;
        } else {
          phaseEarliestDates[phase] = null;
        }
      }
      
      // Update all cards with their phase's earliest date
      const updatedCards = [];
      for (const card of allCards) {
        if (!card.phase) continue; // Skip cards without a phase
        const phaseDate = phaseEarliestDates[card.phase];
        if (phaseDate !== card.phaseClearedToBuildDate) {
          const updatedCard = await storage.updateAssemblyCard({
            id: card.id,
            phaseClearedToBuildDate: phaseDate,
          });
          updatedCards.push(updatedCard);
        }
      }
      
      res.json({ 
        message: "Phase cleared to build dates updated successfully",
        updatedCount: updatedCards.length,
        phaseEarliestDates
      });
    } catch (error) {
      console.error("Update phase cleared dates error:", error);
      res.status(500).json({ message: "Failed to update phase cleared to build dates" });
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

  // File upload for assembly cards (Excel/CSV)
  app.post("/api/assembly-cards/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let data: any[] = [];
      const filePath = req.file.path;
      const filename = req.file.originalname.toLowerCase();

      try {
        if (filename.endsWith('.csv')) {
          // Parse CSV file
          const fs = await import('fs');
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
          data = parsed.data;
        } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
          // Parse Excel file
          const workbook = XLSX.readFile(filePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet);
        }

        // Clean up uploaded file
        const fs = await import('fs');
        fs.unlinkSync(filePath);

        if (data.length === 0) {
          return res.status(400).json({ message: "No data found in file" });
        }

        // Get all assemblers for name-to-ID mapping
        const assemblers = await storage.getAssemblers();
        const assemblerNameToId = new Map();
        for (const assembler of assemblers) {
          assemblerNameToId.set(assembler.name, assembler.id);
        }

        // Validate and transform data
        const validatedCards = [];
        const errors = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            // Map CSV/Excel headers to our schema (case-insensitive)
            const normalizedRow = {
              cardNumber: row.cardNumber || row.CardNumber || row.card_number || row['Card Number'],
              name: row.name || row.Name || row.NAME,
              type: row.type || row.Type || row.TYPE,
              duration: (() => {
                const raw = row.duration || row.Duration || row.DURATION;
                const parsed = Number(raw);
                return Number.isFinite(parsed) ? parsed : 1;
              })(),
              phase: (() => {
                const raw = row.phase || row.Phase || row.PHASE;
                if (raw === undefined || raw === null || raw === '') return null;
                const parsed = Number(raw);
                return Number.isFinite(parsed) ? parsed : null;
              })(),
              assignedTo: (() => {
                const rawAssignedTo = row.assignedTo || row.AssignedTo || row.assigned_to || row['Assigned To'];
                if (!rawAssignedTo || rawAssignedTo === '') return null;
                // Try to find assembler ID by name, fallback to raw value if not found
                return assemblerNameToId.get(rawAssignedTo) || rawAssignedTo;
              })(),
              status: row.status || row.Status || row.STATUS || 'scheduled',
              dependencies: Array.isArray(row.dependencies) 
                ? row.dependencies 
                : (row.dependencies || row.Dependencies || row.DEPENDENCIES || '').split(',').map((s: string) => s.trim()).filter(Boolean),
              precedents: Array.isArray(row.precedents) 
                ? row.precedents 
                : (row.precedents || row.Precedents || row.PRECEDENTS || '').split(',').map((s: string) => s.trim()).filter(Boolean),
              gembaDocLink: row.gembaDocLink || row.GembaDocLink || row.gemba_doc_link || row['Gemba Doc Link'] || null,
              materialSeq: (() => {
                const raw = row.materialSeq || row.MaterialSeq || row.material_seq || row['Material Seq'];
                if (raw === undefined || raw === null || raw === '') return null;
                const parsed = Number(raw);
                return Number.isFinite(parsed) ? parsed : null;
              })(),
              assemblySeq: (() => {
                const raw = row.assemblySeq || row.AssemblySeq || row.assembly_seq || row['Assembly Seq'];
                if (raw === undefined || raw === null || raw === '') return null;
                const parsed = Number(raw);
                return Number.isFinite(parsed) ? parsed : null;
              })(),
              operationSeq: (() => {
                const raw = row.operationSeq || row.OperationSeq || row.operation_seq || row['Operation Seq'];
                if (raw === undefined || raw === null || raw === '') return null;
                const parsed = Number(raw);
                return Number.isFinite(parsed) ? parsed : null;
              })(),
              subAssyArea: row.subAssyArea || row.SubAssyArea || row.sub_assy_area || row['Sub Assy Area'] ? parseInt(row.subAssyArea || row.SubAssyArea || row.sub_assy_area || row['Sub Assy Area']) : null,
              requiresCrane: Boolean(row.requiresCrane || row.RequiresCrane || row.requires_crane || row['Requires Crane']),
              pickTime: (() => {
                const raw = row.pickTime || row.PickTime || row.pick_time || row['Pick Time'];
                if (raw === undefined || raw === null || raw === '') return null;
                const parsed = Number(raw);
                return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
              })(),
            };

            const validatedCard = fileUploadSchema.parse(normalizedRow);
            validatedCards.push(validatedCard);
          } catch (error: any) {
            errors.push({
              row: i + 1,
              data: row,
              error: error instanceof z.ZodError ? error.errors : error.message
            });
          }
        }

        if (errors.length > 0) {
          return res.status(400).json({ 
            message: "Validation errors found", 
            errors,
            validCount: validatedCards.length,
            totalCount: data.length
          });
        }

        // Create all valid assembly cards
        const createdCards = [];
        for (const cardData of validatedCards) {
          try {
            const card = await storage.createAssemblyCard(cardData);
            createdCards.push(card);
          } catch (error: any) {
            console.error("Error creating card:", error);
            errors.push({
              cardNumber: cardData.cardNumber,
              error: error.message
            });
          }
        }

        res.json({
          message: `Successfully imported ${createdCards.length} assembly cards`,
          imported: createdCards.length,
          errors: errors.length > 0 ? errors : undefined
        });

      } catch (parseError) {
        // Clean up uploaded file on error
        try {
          const fs = await import('fs');
          fs.unlinkSync(filePath);
        } catch {}
        
        console.error("File parsing error:", parseError);
        return res.status(400).json({ message: "Failed to parse file. Please check the file format." });
      }

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to process file upload" });
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

      // Send SMS notification for new Andon issues
      try {
        const { smsService } = await import('./sms-service');
        
        // Get alert phone number from settings
        const alertPhoneSetting = await storage.getSetting('sms_alert_phone_number');
        const alertPhoneNumber = alertPhoneSetting?.value || '+13177375614'; // Default to your number

        // Get assembly card for more context
        const assemblyCard = await storage.getAssemblyCardByNumber(issue.assemblyCardNumber);

        // Send SMS notification
        await smsService.sendAndonAlert({
          issue,
          assemblyCard,
          alertPhoneNumber
        });

        console.log('SMS notification sent for Andon issue:', issue.issueNumber);
      } catch (smsError) {
        console.error('Failed to send SMS notification:', smsError);
        // Don't fail the API call if SMS fails
      }

      res.status(201).json(issue);
    } catch (error) {
      console.error('Error creating andon issue:', error);
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
  
  // Route to serve private objects (like Andon photos)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

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

  // Messaging API routes
  
  // Get all message threads
  app.get("/api/threads", async (req, res) => {
    try {
      const threads = await storage.getMessageThreads();
      res.json(threads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  });

  // Get thread by ID with messages
  app.get("/api/threads/:id", async (req, res) => {
    try {
      const threadWithMessages = await storage.getThreadWithMessages(req.params.id);
      if (!threadWithMessages) {
        return res.status(404).json({ message: "Thread not found" });
      }
      res.json(threadWithMessages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  // Create new thread
  app.post("/api/threads", async (req, res) => {
    try {
      const validatedData = insertThreadSchema.parse(req.body);
      const thread = await storage.createMessageThread(validatedData);
      
      // Broadcast new thread to all connected clients
      broadcastToAll({
        type: "thread_created",
        data: thread
      });
      
      res.status(201).json(thread);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create thread" });
    }
  });

  // Update thread (implementation status, etc.)
  app.patch("/api/threads/:id", async (req, res) => {
    try {
      const updateData = updateThreadSchema.parse({ ...req.body, id: req.params.id });
      const thread = await storage.updateMessageThread(updateData);
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Broadcast thread update to all connected clients
      broadcastToAll({
        type: "thread_updated",
        data: thread
      });
      
      res.json(thread);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update thread" });
    }
  });

  // Add message to thread
  app.post("/api/threads/:threadId/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        threadId: req.params.threadId
      });
      const message = await storage.createMessage(messageData);
      
      // Broadcast new message to all connected clients
      broadcastToAll({
        type: "message_created",
        data: message
      });
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Vote on thread
  app.post("/api/threads/:threadId/vote", async (req, res) => {
    try {
      const voteData = insertVoteSchema.parse({
        ...req.body,
        threadId: req.params.threadId
      });
      const result = await storage.voteOnThread(voteData);
      
      // Broadcast vote update to all connected clients
      broadcastToAll({
        type: "thread_voted",
        data: result
      });
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to vote on thread" });
    }
  });

  // Thread participants
  app.post("/api/threads/:threadId/participants", async (req, res) => {
    const { threadId } = req.params;
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: "userIds must be an array" });
    }
    
    try {
      await storage.addThreadParticipants(threadId, userIds);
      res.status(201).json({ message: "Participants added successfully" });
    } catch (error) {
      console.error("Error adding thread participants:", error);
      res.status(500).json({ message: "Failed to add thread participants" });
    }
  });

  app.get("/api/threads/:threadId/participants", async (req, res) => {
    const { threadId } = req.params;
    
    try {
      const participants = await storage.getThreadParticipants(threadId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching thread participants:", error);
      res.status(500).json({ message: "Failed to fetch thread participants" });
    }
  });

  app.delete("/api/threads/:threadId/participants/:userId", async (req, res) => {
    const { threadId, userId } = req.params;
    
    try {
      await storage.removeThreadParticipant(threadId, userId);
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Error removing thread participant:", error);
      res.status(500).json({ message: "Failed to remove thread participant" });
    }
  });

  // File attachment upload
  app.post("/api/attachments/upload", async (req, res) => {
    const { fileExtension } = req.body;
    
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getAttachmentUploadURL(fileExtension);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating attachment upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Serve attachments
  app.get("/attachments/:attachmentPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const attachmentFile = await objectStorageService.getAttachmentFile(`/attachments/${req.params.attachmentPath}`);
      objectStorageService.downloadObject(attachmentFile, res);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      res.json(setting || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const setting = await storage.createSetting(req.body);
      res.status(201).json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to create setting" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.updateSetting({ ...req.body, key: req.params.key });
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  app.post("/api/settings/upsert", async (req, res) => {
    try {
      const { key, value, description } = req.body;
      
      // Try to get existing setting
      const existing = await storage.getSetting(key);
      
      if (existing) {
        // Update existing
        const updated = await storage.updateSetting({ key, value, description });
        res.json(updated);
      } else {
        // Create new
        const created = await storage.createSetting({ key, value, description });
        res.status(201).json(created);
      }
    } catch (error) {
      console.error("Error upserting setting:", error);
      res.status(500).json({ message: "Failed to upsert setting" });
    }
  });

  // Calculate Pick Due Dates endpoint with advanced back-scheduling
  app.post("/api/assembly-cards/bulk/calculate-pick-due-dates", async (req, res) => {
    try {
      // Get settings
      const pickLeadTimeSetting = await storage.getSetting('pick_lead_time_days');
      const dailyCapacitySetting = await storage.getSetting('daily_pick_capacity_hours');
      
      const pickLeadTimeDays = pickLeadTimeSetting ? parseInt(pickLeadTimeSetting.value) : 1;
      const dailyCapacityMinutes = dailyCapacitySetting ? parseInt(dailyCapacitySetting.value) * 60 : 8 * 60; // Default 8 hours
      
      if (pickLeadTimeDays <= 0) {
        return res.status(400).json({ message: "Pick Lead Time must be a positive number" });
      }
      
      // Get all assembly cards
      const allCards = await storage.getAssemblyCards();
      
      // Function to subtract one business day
      const subtractBusinessDay = (date: Date): Date => {
        const result = new Date(date);
        result.setDate(result.getDate() - 1);
        // Skip weekends
        while (result.getDay() === 0 || result.getDay() === 6) {
          result.setDate(result.getDate() - 1);
        }
        return result;
      };
      
      // Group cards by phase and sort by priority (A first, then B, then C)
      const cardsByPhase: { [phase: number]: any[] } = {};
      for (const card of allCards) {
        if (card.phaseClearedToBuildDate && card.pickTime && card.phase) {
          if (!cardsByPhase[card.phase]) {
            cardsByPhase[card.phase] = [];
          }
          cardsByPhase[card.phase].push(card);
        }
      }
      
      // Sort cards within each phase by priority (C first for earliest dates, then B, then A for latest dates)
      const priorityOrder = { 'C': 0, 'B': 1, 'A': 2 };
      for (const phase in cardsByPhase) {
        cardsByPhase[phase].sort((a, b) => {
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
          return aPriority - bPriority;
        });
      }
      
      // Advanced back-scheduling algorithm
      const updatedCards = [];
      
      for (const phase in cardsByPhase) {
        const phaseCards = cardsByPhase[phase];
        if (phaseCards.length === 0) continue;
        
        // Start from the phase cleared date, subtract lead time, then work backward
        const phaseClearedDate = new Date(phaseCards[0].phaseClearedToBuildDate);
        
        // First subtract the pick lead time (5 days) to get the latest pick due date
        let latestPickDate = new Date(phaseClearedDate);
        for (let i = 0; i < pickLeadTimeDays; i++) {
          latestPickDate = subtractBusinessDay(latestPickDate);
        }
        
        // Start scheduling backward from this latest pick date
        let currentSchedulingDate = new Date(latestPickDate);
        let remainingDailyCapacity = dailyCapacityMinutes;
        
        // Schedule cards backward by priority with proper capacity packing
        for (const card of phaseCards) {
          const cardPickTimeMinutes = card.pickTime || 60; // Default 60 minutes if not set
          
          // Check if card fits in current day's remaining capacity
          if (cardPickTimeMinutes <= remainingDailyCapacity) {
            // Card fits in current day - subtract from remaining capacity
            remainingDailyCapacity -= cardPickTimeMinutes;
          } else {
            // Card doesn't fit in current day, move to previous business day
            currentSchedulingDate = subtractBusinessDay(currentSchedulingDate);
            
            // Start new day with full capacity minus this card's time
            if (cardPickTimeMinutes <= dailyCapacityMinutes) {
              // Card fits in a single day
              remainingDailyCapacity = dailyCapacityMinutes - cardPickTimeMinutes;
            } else {
              // Card exceeds daily capacity - schedule on current day anyway and set capacity to 0
              remainingDailyCapacity = 0;
            }
          }
          
          // Update the card with its calculated pick due date
          const updatedCard = await storage.updateAssemblyCard({
            id: card.id,
            pickDueDate: new Date(currentSchedulingDate),
          });
          
          if (updatedCard) {
            updatedCards.push(updatedCard);
          }
        }
      }
      
      res.json({
        message: "Pick Due Dates calculated with capacity scheduling",
        updatedCount: updatedCards.length,
        pickLeadTimeDays: pickLeadTimeDays,
        dailyCapacityHours: Math.round(dailyCapacityMinutes / 60 * 100) / 100,
      });
    } catch (error) {
      console.error("Calculate pick due dates error:", error);
      res.status(500).json({ message: "Failed to calculate pick due dates" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connectedClients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    connectedClients.add(ws);

    // Handle client messages
    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        console.log('Received WebSocket message:', message);
        
        // Echo message back to all clients (for real-time chat)
        broadcastToAll({
          type: 'message_broadcast',
          data: message
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Remove client on disconnect
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      connectedClients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  // Function to broadcast messages to all connected clients
  function broadcastToAll(message: any) {
    const messageString = JSON.stringify(message);
    connectedClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
      }
    });
  }

  return httpServer;
}
