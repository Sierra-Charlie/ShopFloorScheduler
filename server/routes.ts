import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertAssemblerSchema, insertAssemblyCardSchema, updateAssemblyCardSchema, insertAndonIssueSchema, updateAndonIssueSchema, insertThreadSchema, insertMessageSchema, updateThreadSchema, insertVoteSchema, fileUploadSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";
import * as XLSX from "xlsx";
import * as papa from "papaparse";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Accept Excel and CSV files
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];
      if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'), false);
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
        precedents: card.precedents.join(','),
        gembaDocLink: card.gembaDocLink || '',
        materialSeq: card.materialSeq || '',
        operationSeq: card.operationSeq || '',
        subAssyArea: card.subAssyArea || '',
        requiresCrane: card.requiresCrane
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
          precedents: 'E1,S1',
          gembaDocLink: 'https://example.com/instructions',
          materialSeq: 'Material sequence info',
          operationSeq: 'Operation sequence info',
          subAssyArea: '',
          requiresCrane: false
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
          precedents: '',
          gembaDocLink: '',
          materialSeq: '',
          operationSeq: '',
          subAssyArea: '',
          requiresCrane: false
        }
      ];

      if (format === 'csv') {
        const csv = papa.unparse(templateData);
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
          const parsed = papa.parse(fileContent, { header: true, skipEmptyLines: true });
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
              duration: parseInt(row.duration || row.Duration || row.DURATION),
              phase: parseInt(row.phase || row.Phase || row.PHASE),
              assignedTo: row.assignedTo || row.AssignedTo || row.assigned_to || row['Assigned To'] || null,
              status: row.status || row.Status || row.STATUS || 'scheduled',
              dependencies: Array.isArray(row.dependencies) 
                ? row.dependencies 
                : (row.dependencies || row.Dependencies || row.DEPENDENCIES || '').split(',').map((s: string) => s.trim()).filter(Boolean),
              precedents: Array.isArray(row.precedents) 
                ? row.precedents 
                : (row.precedents || row.Precedents || row.PRECEDENTS || '').split(',').map((s: string) => s.trim()).filter(Boolean),
              gembaDocLink: row.gembaDocLink || row.GembaDocLink || row.gemba_doc_link || row['Gemba Doc Link'] || null,
              materialSeq: row.materialSeq || row.MaterialSeq || row.material_seq || row['Material Seq'] || null,
              operationSeq: row.operationSeq || row.OperationSeq || row.operation_seq || row['Operation Seq'] || null,
              subAssyArea: row.subAssyArea || row.SubAssyArea || row.sub_assy_area || row['Sub Assy Area'] ? parseInt(row.subAssyArea || row.SubAssyArea || row.sub_assy_area || row['Sub Assy Area']) : null,
              requiresCrane: Boolean(row.requiresCrane || row.RequiresCrane || row.requires_crane || row['Requires Crane']),
            };

            const validatedCard = fileUploadSchema.parse(normalizedRow);
            validatedCards.push(validatedCard);
          } catch (error) {
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
          } catch (error) {
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
