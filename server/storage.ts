import { type User, type InsertUser, type LoginUser, type Assembler, type InsertAssembler, type AssemblyCard, type InsertAssemblyCard, type UpdateAssemblyCard, type AndonIssue, type InsertAndonIssue, type UpdateAndonIssue, type MessageThread, type InsertThread, type UpdateThread, type Message, type InsertMessage, type ThreadVote, type InsertVote, type ThreadParticipant } from "@shared/schema";
import { users, assemblers, assemblyCards, andonIssues, messageThreads, messages, threadVotes, threadParticipants } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Authentication
  authenticateUser(credentials: LoginUser): Promise<User | null>;
  
  // Assemblers
  getAssemblers(): Promise<Assembler[]>;
  getAssembler(id: string): Promise<Assembler | undefined>;
  createAssembler(assembler: InsertAssembler): Promise<Assembler>;
  updateAssembler(id: string, assembler: Partial<InsertAssembler>): Promise<Assembler | undefined>;
  
  // Assembly Cards
  getAssemblyCards(): Promise<AssemblyCard[]>;
  getAssemblyCard(id: string): Promise<AssemblyCard | undefined>;
  getAssemblyCardByNumber(cardNumber: string): Promise<AssemblyCard | undefined>;
  createAssemblyCard(card: InsertAssemblyCard): Promise<AssemblyCard>;
  updateAssemblyCard(update: UpdateAssemblyCard): Promise<AssemblyCard | undefined>;
  deleteAssemblyCard(id: string): Promise<boolean>;
  
  // Dependency validation
  validateDependencies(cardNumber: string, dependencies: string[]): Promise<{ valid: boolean; issues: string[] }>;
  
  // Andon Issues
  getAndonIssues(): Promise<AndonIssue[]>;
  getAndonIssue(id: number): Promise<AndonIssue | undefined>;
  createAndonIssue(issue: InsertAndonIssue): Promise<AndonIssue>;
  updateAndonIssue(update: UpdateAndonIssue): Promise<AndonIssue | undefined>;
  deleteAndonIssue(id: number): Promise<boolean>;
  
  // Messaging System
  getMessageThreads(): Promise<MessageThread[]>;
  getMessageThread(id: string): Promise<MessageThread | undefined>;
  getThreadWithMessages(id: string): Promise<{ thread: MessageThread; messages: Message[] } | undefined>;
  createMessageThread(thread: InsertThread): Promise<MessageThread>;
  updateMessageThread(update: UpdateThread): Promise<MessageThread | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  voteOnThread(vote: InsertVote): Promise<{ thread: MessageThread; userVote: string }>;
  
  // Thread Participants
  addThreadParticipants(threadId: string, userIds: string[]): Promise<void>;
  getThreadParticipants(threadId: string): Promise<ThreadParticipant[]>;
  removeThreadParticipant(threadId: string, userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private assemblers: Map<string, Assembler>;
  private assemblyCards: Map<string, AssemblyCard>;
  private andonIssues: Map<number, AndonIssue>;
  private messageThreads: Map<string, MessageThread>;
  private messages: Map<string, Message>;
  private threadVotes: Map<string, ThreadVote>;
  private threadParticipants: Map<string, ThreadParticipant>;
  private nextIssueId: number = 1;
  constructor() {
    this.users = new Map();
    this.assemblers = new Map();
    this.assemblyCards = new Map();
    this.andonIssues = new Map();
    this.messageThreads = new Map();
    this.messages = new Map();
    this.threadVotes = new Map();
    this.threadParticipants = new Map();
    this.initializeData();
  }

  private initializeData() {
    // Initialize users with pre-hashed passwords for admin123 and password123
    const now = new Date();
    
    const defaultUsers = [
      { 
        name: "John Smith", 
        role: "production_supervisor", 
        email: "john.smith@vikingeng.com", 
        password: "$2b$10$k1u6C502f.wLw38.b3ckk.a5i5yR9v/Stn.M8zrQinzEA4FwWwqHS" // password123
      },
      { 
        name: "Sarah Johnson", 
        role: "material_handler", 
        email: "sarah.johnson@vikingeng.com", 
        password: "$2b$10$k1u6C502f.wLw38.b3ckk.a5i5yR9v/Stn.M8zrQinzEA4FwWwqHS" // password123
      },
      { 
        name: "Mike Wilson", 
        role: "assembler", 
        email: "mike.wilson@stonetreeinvest.com", 
        password: "$2b$10$k1u6C502f.wLw38.b3ckk.a5i5yR9v/Stn.M8zrQinzEA4FwWwqHS" // password123
      },
      { 
        name: "Emily Chen", 
        role: "scheduler", 
        email: "emily.chen@vikingeng.com", 
        password: "$2b$10$k1u6C502f.wLw38.b3ckk.a5i5yR9v/Stn.M8zrQinzEA4FwWwqHS" // password123
      },
      { 
        name: "David Brown", 
        role: "admin", 
        email: "david.brown@stonetreeinvest.com", 
        password: "$2b$10$UyrXWhp5Tdsissr1m1e.BO29RB2eQiZE07bjzj4juE3lKb6.KIA9." // admin123
      },
    ];

    defaultUsers.forEach(userData => {
      const id = randomUUID();
      this.users.set(id, { 
        ...userData, 
        id, 
        createdAt: now, 
        updatedAt: now 
      });
    });

    // Initialize assemblers
    const defaultAssemblers: InsertAssembler[] = [
      { name: "Mech Assy 1", type: "mechanical", status: "available" },
      { name: "Mech Assy 2", type: "mechanical", status: "available" },
      { name: "Mech Assy 3", type: "mechanical", status: "available" },
      { name: "Mech Assy 4", type: "mechanical", status: "available" },
      { name: "Elec Assy 1", type: "electrical", status: "available" },
      { name: "Elec Assy 2", type: "electrical", status: "available" },
      { name: "Elec Assy 3", type: "electrical", status: "available" },
      { name: "Elec Assy 4", type: "electrical", status: "available" },
      { name: "Run-in", type: "final", status: "available" },
    ];

    defaultAssemblers.forEach(assembler => {
      const id = randomUUID();
      this.assemblers.set(id, { ...assembler, id, status: assembler.status || "available", assignedUser: null });
    });

    // Initialize assembly cards
    const mechanicalAssembler1Id = Array.from(this.assemblers.values()).find(a => a.name === "Mech Assy 1")?.id;
    const electricalAssembler1Id = Array.from(this.assemblers.values()).find(a => a.name === "Elec Assy 1")?.id;
    const runinId = Array.from(this.assemblers.values()).find(a => a.name === "Run-in")?.id;

    const defaultCards: InsertAssemblyCard[] = [
      {
        cardNumber: "M4",
        name: "Base Frame",
        type: "M",
        duration: 4,
        phase: 1,
        assignedTo: mechanicalAssembler1Id,
        status: "in_progress",
        dependencies: [],
        precedents: ["M5"],
        startTime: new Date(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        position: 0,
      },
      {
        cardNumber: "S4",
        name: "Sub Assembly",
        type: "S",
        duration: 3,
        phase: 2,
        assignedTo: mechanicalAssembler1Id,
        status: "scheduled",
        dependencies: [],
        precedents: ["M5"],
        startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
        position: 1,
      },
      {
        cardNumber: "M5",
        name: "M1 Frame ASSY",
        type: "M",
        duration: 6,
        phase: 2,
        assignedTo: mechanicalAssembler1Id,
        status: "blocked",
        dependencies: ["M4", "S4"],
        precedents: ["M6"],
        startTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 13 * 60 * 60 * 1000),
        position: 2,
      },
      {
        cardNumber: "E7",
        name: "Wiring Harness",
        type: "E",
        duration: 5,
        phase: 3,
        assignedTo: electricalAssembler1Id,
        status: "in_progress",
        dependencies: [],
        precedents: [],
        startTime: new Date(),
        endTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        position: 0,
      },
      {
        cardNumber: "E8",
        name: "Control Panel",
        type: "E",
        duration: 4,
        phase: 4,
        assignedTo: electricalAssembler1Id,
        status: "scheduled",
        dependencies: ["E7"],
        precedents: [],
        startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 9 * 60 * 60 * 1000),
        position: 1,
      },
      {
        cardNumber: "M6",
        name: "Final Assembly",
        type: "M",
        duration: 8,
        phase: 1,
        assignedTo: runinId,
        status: "scheduled",
        dependencies: ["M5"],
        precedents: [],
        startTime: new Date(Date.now() + 13 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 21 * 60 * 60 * 1000),
        position: 0,
      },
    ];

    defaultCards.forEach(card => {
      const id = randomUUID();
      this.assemblyCards.set(id, { 
        ...card, 
        id, 
        status: card.status || "scheduled",
        dependencies: card.dependencies || [],
        precedents: card.precedents || [],
        position: card.position || 0,
        assignedTo: card.assignedTo || null,
        startTime: card.startTime || null,
        endTime: card.endTime || null,
        elapsedTime: card.elapsedTime || 0,
        pickingStartTime: null as Date | null,
        actualDuration: null,
        gembaDocLink: null,
        grounded: false,
        subAssyArea: card.subAssyArea ?? null
      });
    });
  }

  // Assemblers
  async getAssemblers(): Promise<Assembler[]> {
    return Array.from(this.assemblers.values());
  }

  async getAssembler(id: string): Promise<Assembler | undefined> {
    return this.assemblers.get(id);
  }

  async createAssembler(assembler: InsertAssembler): Promise<Assembler> {
    const id = randomUUID();
    const newAssembler: Assembler = { ...assembler, id, status: assembler.status || "available", assignedUser: assembler.assignedUser || null };
    this.assemblers.set(id, newAssembler);
    return newAssembler;
  }

  async updateAssembler(id: string, assembler: Partial<InsertAssembler>): Promise<Assembler | undefined> {
    const existing = this.assemblers.get(id);
    if (!existing) return undefined;
    
    const updated: Assembler = { ...existing, ...assembler };
    this.assemblers.set(id, updated);
    return updated;
  }

  // Assembly Cards
  async getAssemblyCards(): Promise<AssemblyCard[]> {
    return Array.from(this.assemblyCards.values()).sort((a, b) => {
      if (a.assignedTo !== b.assignedTo) {
        return (a.assignedTo || "").localeCompare(b.assignedTo || "");
      }
      return (a.position || 0) - (b.position || 0);
    });
  }

  async getAssemblyCard(id: string): Promise<AssemblyCard | undefined> {
    return this.assemblyCards.get(id);
  }

  async getAssemblyCardByNumber(cardNumber: string): Promise<AssemblyCard | undefined> {
    return Array.from(this.assemblyCards.values()).find(card => card.cardNumber === cardNumber);
  }

  async createAssemblyCard(card: InsertAssemblyCard): Promise<AssemblyCard> {
    const id = randomUUID();
    const newCard: AssemblyCard = { 
      ...card, 
      id, 
      status: card.status || "scheduled",
      dependencies: card.dependencies || [],
      precedents: card.precedents || [],
      position: card.position || 0,
      assignedTo: card.assignedTo || null,
      startTime: card.startTime || null,
      endTime: card.endTime || null,
      elapsedTime: card.elapsedTime || 0,
      pickingStartTime: card.pickingStartTime || null,
      actualDuration: card.actualDuration || null,
      gembaDocLink: card.gembaDocLink || null,
      grounded: card.grounded ?? false,
      subAssyArea: card.subAssyArea ?? null
    };
    this.assemblyCards.set(id, newCard);
    return newCard;
  }

  async updateAssemblyCard(update: UpdateAssemblyCard): Promise<AssemblyCard | undefined> {
    const existing = this.assemblyCards.get(update.id);
    if (!existing) return undefined;
    
    const updated: AssemblyCard = { ...existing, ...update };
    
    // Handle explicit startTime updates (including null for reset)
    if ('startTime' in update) {
      updated.startTime = update.startTime ?? null;
    }
    
    // Handle explicit elapsedTime updates
    if ('elapsedTime' in update) {
      updated.elapsedTime = update.elapsedTime ?? 0;
    }
    
    // Handle explicit pickingStartTime updates
    if ('pickingStartTime' in update) {
      updated.pickingStartTime = update.pickingStartTime ?? null;
    }
    
    // Handle explicit actualDuration updates
    if ('actualDuration' in update) {
      updated.actualDuration = update.actualDuration ?? null;
    }
    
    // Status change logic
    if (update.status) {
      if (update.status === "assembling") {
        // Starting or resuming assembly
        if (!('startTime' in update)) {
          if (existing.status === "paused" && existing.elapsedTime) {
            // Resuming from pause - adjust startTime to account for elapsed time
            updated.startTime = new Date(Date.now() - (existing.elapsedTime * 1000));
          } else {
            // Starting fresh - always override existing startTime (including future times from initial setup)
            updated.startTime = new Date();
            updated.elapsedTime = 0;
          }
        }
      } else if (update.status === "picking") {
        // Starting material picking - set picking start time
        if (!('pickingStartTime' in update)) {
          updated.pickingStartTime = new Date();
        }
      } else if (update.status === "paused") {
        // Pausing - calculate and store elapsed time
        if (existing.startTime && existing.status === "assembling") {
          const currentElapsed = Math.floor((Date.now() - new Date(existing.startTime).getTime()) / 1000);
          updated.elapsedTime = Math.max(currentElapsed, existing.elapsedTime || 0);
        }
        // Keep startTime for reference but timer will be paused
      } else if (update.status === "ready_for_build") {
        // When marking as ready for build, clear picking start time
        if (!('pickingStartTime' in update)) {
          updated.pickingStartTime = null;
        }
        if (!('startTime' in update) && !('elapsedTime' in update)) {
          // Only reset assembly times if explicitly requested
        }
      }
    }
    
    // Automatically set endTime and actualDuration when status changes to completed
    if (update.status === "completed") {
      if (!existing.endTime) {
        updated.endTime = new Date();
      }
      // Calculate actual duration from elapsed time if not explicitly provided
      if (!('actualDuration' in update) && existing.elapsedTime) {
        // Convert elapsed seconds to hours (decimal)
        updated.actualDuration = Math.round((existing.elapsedTime / 3600) * 100) / 100;
      }
    }
    
    this.assemblyCards.set(update.id, updated);
    return updated;
  }

  async deleteAssemblyCard(id: string): Promise<boolean> {
    return this.assemblyCards.delete(id);
  }

  async validateDependencies(cardNumber: string, dependencies: string[]): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const card = await this.getAssemblyCardByNumber(cardNumber);
    
    if (!card) {
      issues.push(`Card ${cardNumber} not found`);
      return { valid: false, issues };
    }

    for (const depCardNumber of dependencies) {
      const depCard = await this.getAssemblyCardByNumber(depCardNumber);
      if (!depCard) {
        issues.push(`Dependency card ${depCardNumber} not found`);
        continue;
      }

      // Check for circular dependencies
      if (depCard.dependencies?.includes(cardNumber)) {
        issues.push(`Circular dependency detected between ${cardNumber} and ${depCardNumber}`);
      }

      // Check if dependency is completed or scheduled before this card
      if (depCard.status === "blocked" || (depCard.endTime && card.startTime && depCard.endTime > card.startTime)) {
        issues.push(`Dependency ${depCardNumber} is not completed before ${cardNumber} starts`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  // Users
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser: User = { ...user, id, password: hashedPassword, createdAt: now, updatedAt: now };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updatedData = { ...user };
    if (user.password) {
      updatedData.password = await bcrypt.hash(user.password, 10);
    }
    
    const updated: User = { ...existing, ...updatedData, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async authenticateUser(credentials: LoginUser): Promise<User | null> {
    const user = await this.getUserByEmail(credentials.email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(credentials.password, user.password);
    if (!isValid) return null;
    
    return user;
  }

  // Andon Issues
  async getAndonIssues(): Promise<AndonIssue[]> {
    return Array.from(this.andonIssues.values());
  }

  async getAndonIssue(id: number): Promise<AndonIssue | undefined> {
    return this.andonIssues.get(id);
  }

  async createAndonIssue(issue: InsertAndonIssue): Promise<AndonIssue> {
    const id = this.nextIssueId++;
    const issueNumber = `AI-${id.toString().padStart(3, '0')}`;
    const now = new Date();
    
    const newIssue: AndonIssue = {
      id,
      issueNumber,
      assemblyCardNumber: issue.assemblyCardNumber,
      description: issue.description,
      photoPath: issue.photoPath || null,
      submittedBy: issue.submittedBy,
      assignedTo: issue.assignedTo || null,
      status: issue.status || "unresolved",
      createdAt: now,
      updatedAt: now,
    };
    
    this.andonIssues.set(id, newIssue);
    return newIssue;
  }

  async updateAndonIssue(update: UpdateAndonIssue): Promise<AndonIssue | undefined> {
    const existing = this.andonIssues.get(update.id);
    if (!existing) return undefined;
    
    const updated: AndonIssue = {
      ...existing,
      ...update,
      updatedAt: new Date(),
    };
    
    this.andonIssues.set(update.id, updated);
    return updated;
  }

  async deleteAndonIssue(id: number): Promise<boolean> {
    return this.andonIssues.delete(id);
  }

  // Messaging System Methods
  
  async getMessageThreads(): Promise<MessageThread[]> {
    return Array.from(this.messageThreads.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  async getMessageThread(id: string): Promise<MessageThread | undefined> {
    return this.messageThreads.get(id);
  }

  async getThreadWithMessages(id: string): Promise<{ thread: MessageThread; messages: Message[] } | undefined> {
    const thread = this.messageThreads.get(id);
    if (!thread) return undefined;
    
    const messages = Array.from(this.messages.values())
      .filter(msg => msg.threadId === id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    return { thread, messages };
  }

  async createMessageThread(thread: InsertThread): Promise<MessageThread> {
    const id = randomUUID();
    const now = new Date();
    const newThread: MessageThread = {
      ...thread,
      id,
      createdAt: now,
      lastMessageAt: now,
      isActive: true,
      upvotes: 0,
      implementationStatus: thread.implementationStatus || "idea",
      tags: thread.tags || []
    };
    
    this.messageThreads.set(id, newThread);
    return newThread;
  }

  async updateMessageThread(update: UpdateThread): Promise<MessageThread | undefined> {
    const existing = this.messageThreads.get(update.id);
    if (!existing) return undefined;
    
    const updated: MessageThread = { ...existing, ...update };
    this.messageThreads.set(update.id, updated);
    return updated;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const now = new Date();
    const newMessage: Message = {
      ...message,
      id,
      createdAt: now,
      updatedAt: now,
      isEdited: false,
      attachmentPath: message.attachmentPath ?? null
    };
    
    this.messages.set(id, newMessage);
    
    // Update thread's lastMessageAt
    const thread = this.messageThreads.get(message.threadId);
    if (thread) {
      thread.lastMessageAt = now;
      this.messageThreads.set(message.threadId, thread);
    }
    
    return newMessage;
  }

  async voteOnThread(vote: InsertVote): Promise<{ thread: MessageThread; userVote: string }> {
    const thread = this.messageThreads.get(vote.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }
    
    // Check if user has already voted
    const existingVote = Array.from(this.threadVotes.values())
      .find(v => v.threadId === vote.threadId && v.userId === vote.userId);
    
    if (existingVote) {
      // Update existing vote
      if (existingVote.voteType !== vote.voteType) {
        // Vote type changed
        if (existingVote.voteType === "upvote") {
          thread.upvotes = Math.max(0, thread.upvotes - 1);
        } else {
          thread.upvotes = thread.upvotes + 1;
        }
        
        if (vote.voteType === "upvote") {
          thread.upvotes = thread.upvotes + 1;
        } else {
          thread.upvotes = Math.max(0, thread.upvotes - 1);
        }
        
        existingVote.voteType = vote.voteType;
        existingVote.createdAt = new Date();
        this.threadVotes.set(existingVote.id, existingVote);
      }
    } else {
      // Create new vote
      const voteId = randomUUID();
      const newVote: ThreadVote = {
        ...vote,
        id: voteId,
        createdAt: new Date()
      };
      
      this.threadVotes.set(voteId, newVote);
      
      if (vote.voteType === "upvote") {
        thread.upvotes = thread.upvotes + 1;
      } else {
        thread.upvotes = Math.max(0, thread.upvotes - 1);
      }
    }
    
    this.messageThreads.set(vote.threadId, thread);
    
    return {
      thread,
      userVote: vote.voteType
    };
  }

  // Thread Participants Operations
  async addThreadParticipants(threadId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      // Check if participant already exists
      const exists = Array.from(this.threadParticipants.values())
        .some(p => p.threadId === threadId && p.userId === userId);
      
      if (!exists) {
        const id = randomUUID();
        const participant: ThreadParticipant = {
          id,
          threadId,
          userId,
          lastReadAt: new Date(),
          joinedAt: new Date(),
          canWrite: true
        };
        this.threadParticipants.set(id, participant);
      }
    }
  }

  async getThreadParticipants(threadId: string): Promise<ThreadParticipant[]> {
    return Array.from(this.threadParticipants.values())
      .filter(p => p.threadId === threadId);
  }

  async removeThreadParticipant(threadId: string, userId: string): Promise<void> {
    const participant = Array.from(this.threadParticipants.values())
      .find(p => p.threadId === threadId && p.userId === userId);
    if (participant) {
      this.threadParticipants.delete(participant.id);
    }
  }
}

// Database-backed storage implementation
export class DatabaseStorage implements IStorage {
  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const userData = { ...user, password: hashedPassword };
    const [created] = await db.insert(users).values(userData).returning();
    return created;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const updateData = { ...userData };
    if (userData.password) {
      updateData.password = await bcrypt.hash(userData.password, 10);
    }
    updateData.updatedAt = new Date();
    
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async authenticateUser(credentials: LoginUser): Promise<User | null> {
    const user = await this.getUserByEmail(credentials.email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(credentials.password, user.password);
    if (!isValid) return null;
    
    return user;
  }

  // Assemblers
  async getAssemblers(): Promise<Assembler[]> {
    return await db.select().from(assemblers);
  }

  async getAssembler(id: string): Promise<Assembler | undefined> {
    const [assembler] = await db.select().from(assemblers).where(eq(assemblers.id, id));
    return assembler || undefined;
  }

  async createAssembler(assembler: InsertAssembler): Promise<Assembler> {
    const [created] = await db.insert(assemblers).values(assembler).returning();
    return created;
  }

  async updateAssembler(id: string, assemblerData: Partial<InsertAssembler>): Promise<Assembler | undefined> {
    const [updated] = await db.update(assemblers).set(assemblerData).where(eq(assemblers.id, id)).returning();
    return updated || undefined;
  }

  // Assembly Cards
  async getAssemblyCards(): Promise<AssemblyCard[]> {
    const cards = await db.select().from(assemblyCards);
    return cards.sort((a, b) => {
      if (a.assignedTo !== b.assignedTo) {
        return (a.assignedTo || "").localeCompare(b.assignedTo || "");
      }
      return (a.position || 0) - (b.position || 0);
    });
  }

  async getAssemblyCard(id: string): Promise<AssemblyCard | undefined> {
    const [card] = await db.select().from(assemblyCards).where(eq(assemblyCards.id, id));
    return card || undefined;
  }

  async getAssemblyCardByNumber(cardNumber: string): Promise<AssemblyCard | undefined> {
    const [card] = await db.select().from(assemblyCards).where(eq(assemblyCards.cardNumber, cardNumber));
    return card || undefined;
  }

  async createAssemblyCard(card: InsertAssemblyCard): Promise<AssemblyCard> {
    const cardData = {
      ...card,
      status: card.status || "scheduled",
      dependencies: card.dependencies || [],
      precedents: card.precedents || [],
      position: card.position || 0,
      elapsedTime: card.elapsedTime || 0,
      grounded: card.grounded ?? false
    };
    const [created] = await db.insert(assemblyCards).values(cardData).returning();
    return created;
  }

  async updateAssemblyCard(update: UpdateAssemblyCard): Promise<AssemblyCard | undefined> {
    const existing = await this.getAssemblyCard(update.id);
    if (!existing) return undefined;
    
    const updateData: any = { ...update };
    
    // Handle explicit null values for optional fields
    if ('startTime' in update) {
      updateData.startTime = update.startTime ?? null;
    }
    if ('elapsedTime' in update) {
      updateData.elapsedTime = update.elapsedTime ?? 0;
    }
    if ('pickingStartTime' in update) {
      updateData.pickingStartTime = update.pickingStartTime ?? null;
    }
    if ('actualDuration' in update) {
      updateData.actualDuration = update.actualDuration ?? null;
    }
    
    // Status change logic (same as MemStorage)
    if (update.status) {
      if (update.status === "assembling") {
        if (!('startTime' in update)) {
          updateData.startTime = new Date();
        }
      } else if (update.status === "picking") {
        if (!('pickingStartTime' in update)) {
          updateData.pickingStartTime = new Date();
        }
      } else if (update.status === "paused" && existing.status === "assembling") {
        if (existing.startTime) {
          const currentTime = new Date();
          const sessionDuration = Math.floor((currentTime.getTime() - existing.startTime.getTime()) / 1000);
          updateData.elapsedTime = (existing.elapsedTime || 0) + sessionDuration;
          updateData.startTime = null;
        }
      } else if (update.status === "completed") {
        if (existing.status === "assembling" && existing.startTime) {
          const currentTime = new Date();
          const sessionDuration = Math.floor((currentTime.getTime() - existing.startTime.getTime()) / 1000);
          const totalElapsed = (existing.elapsedTime || 0) + sessionDuration;
          updateData.elapsedTime = totalElapsed;
          if (!('actualDuration' in update) && totalElapsed > 0) {
            updateData.actualDuration = Math.round((totalElapsed / 3600) * 100) / 100;
          }
        } else if (!('actualDuration' in update) && existing.elapsedTime) {
          updateData.actualDuration = Math.round((existing.elapsedTime / 3600) * 100) / 100;
        }
        updateData.endTime = new Date();
        updateData.startTime = null;
      }
    }
    
    const [updated] = await db.update(assemblyCards).set(updateData).where(eq(assemblyCards.id, update.id)).returning();
    return updated || undefined;
  }

  async deleteAssemblyCard(id: string): Promise<boolean> {
    const result = await db.delete(assemblyCards).where(eq(assemblyCards.id, id)).returning();
    return result.length > 0;
  }

  async validateDependencies(cardNumber: string, dependencies: string[]): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (dependencies.includes(cardNumber)) {
      issues.push("Card cannot depend on itself");
    }
    
    for (const depNumber of dependencies) {
      const depCard = await this.getAssemblyCardByNumber(depNumber);
      if (!depCard) {
        issues.push(`Dependency card ${depNumber} does not exist`);
      }
    }
    
    return { valid: issues.length === 0, issues };
  }

  // Andon Issues
  async getAndonIssues(): Promise<AndonIssue[]> {
    return await db.select().from(andonIssues).orderBy(desc(andonIssues.createdAt));
  }

  async getAndonIssue(id: number): Promise<AndonIssue | undefined> {
    const [issue] = await db.select().from(andonIssues).where(eq(andonIssues.id, id));
    return issue || undefined;
  }

  async createAndonIssue(issue: InsertAndonIssue): Promise<AndonIssue> {
    // Generate auto-incrementing issue number
    const existingIssues = await db.select({ id: andonIssues.id }).from(andonIssues);
    const nextNumber = existingIssues.length + 1;
    const issueNumber = `AI-${nextNumber.toString().padStart(3, '0')}`;
    
    const issueData = {
      ...issue,
      issueNumber,
      status: issue.status || "unresolved"
    };
    
    const [created] = await db.insert(andonIssues).values(issueData).returning();
    return created;
  }

  async updateAndonIssue(update: UpdateAndonIssue): Promise<AndonIssue | undefined> {
    const updateData: any = { updatedAt: new Date() };
    
    if (update.assignedTo !== undefined) updateData.assignedTo = update.assignedTo;
    if (update.status !== undefined) updateData.status = update.status;
    
    const [updated] = await db.update(andonIssues).set(updateData).where(eq(andonIssues.id, update.id)).returning();
    return updated || undefined;
  }

  async deleteAndonIssue(id: number): Promise<boolean> {
    const result = await db.delete(andonIssues).where(eq(andonIssues.id, id)).returning();
    return result.length > 0;
  }

  // Messaging System (using database)
  async getMessageThreads(): Promise<MessageThread[]> {
    return await db.select().from(messageThreads).orderBy(messageThreads.lastMessageAt);
  }

  async getMessageThread(id: string): Promise<MessageThread | undefined> {
    const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.id, id));
    return thread || undefined;
  }

  async getThreadWithMessages(id: string): Promise<{ thread: MessageThread; messages: Message[] } | undefined> {
    const thread = await this.getMessageThread(id);
    if (!thread) return undefined;
    
    const threadMessages = await db.select().from(messages)
      .where(eq(messages.threadId, id));
    
    return { thread, messages: threadMessages };
  }

  async createMessageThread(thread: InsertThread): Promise<MessageThread> {
    const threadData = {
      ...thread,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      isActive: true,
      upvotes: 0,
      implementationStatus: thread.implementationStatus || "idea"
    };
    const [created] = await db.insert(messageThreads).values(threadData).returning();
    return created;
  }

  async updateMessageThread(update: UpdateThread): Promise<MessageThread | undefined> {
    const [updated] = await db.update(messageThreads).set(update).where(eq(messageThreads.id, update.id)).returning();
    return updated || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const messageData = {
      ...message,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false,
      attachmentPath: message.attachmentPath ?? null
    };
    const [created] = await db.insert(messages).values(messageData).returning();
    
    // Update thread's lastMessageAt
    await db.update(messageThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(messageThreads.id, message.threadId));
    
    return created;
  }

  async voteOnThread(vote: InsertVote): Promise<{ thread: MessageThread; userVote: string }> {
    const [existingVote] = await db.select().from(threadVotes)
      .where(and(eq(threadVotes.threadId, vote.threadId), eq(threadVotes.userId, vote.userId)));
    
    if (existingVote) {
      await db.update(threadVotes).set(vote).where(eq(threadVotes.id, existingVote.id));
    } else {
      await db.insert(threadVotes).values(vote);
    }
    
    const thread = await this.getMessageThread(vote.threadId);
    if (!thread) throw new Error("Thread not found");
    
    return { thread, userVote: vote.voteType };
  }

  // Thread Participants
  async addThreadParticipants(threadId: string, userIds: string[]): Promise<void> {
    const participantData = userIds.map(userId => ({
      threadId,
      userId,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      canWrite: true
    }));
    
    // Insert only new participants (avoid duplicates)
    for (const participant of participantData) {
      try {
        await db.insert(threadParticipants).values(participant);
      } catch (error) {
        // Ignore duplicate key errors
      }
    }
  }

  async getThreadParticipants(threadId: string): Promise<ThreadParticipant[]> {
    return await db.select().from(threadParticipants).where(eq(threadParticipants.threadId, threadId));
  }

  async removeThreadParticipant(threadId: string, userId: string): Promise<void> {
    await db.delete(threadParticipants)
      .where(and(eq(threadParticipants.threadId, threadId), eq(threadParticipants.userId, userId)));
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new MemStorage();

// Initialize default data in database if tables are empty
async function initializeDatabaseData() {
  try {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      // Initialize users
      const defaultUsers = [
        { name: "John Smith", role: "production_supervisor", email: "john.smith@company.com" },
        { name: "Sarah Johnson", role: "material_handler", email: "sarah.johnson@company.com" },
        { name: "Mike Wilson", role: "assembler", email: "mike.wilson@company.com" },
        { name: "Emily Chen", role: "scheduler", email: "emily.chen@company.com" },
        { name: "David Brown", role: "admin", email: "david.brown@company.com" },
      ];
      await db.insert(users).values(defaultUsers);

      // Initialize assemblers
      const defaultAssemblers = [
        { name: "Mech Assy 1", type: "mechanical", status: "available" },
        { name: "Mech Assy 2", type: "mechanical", status: "available" },
        { name: "Mech Assy 3", type: "mechanical", status: "available" },
        { name: "Mech Assy 4", type: "mechanical", status: "available" },
        { name: "Elec Assy 1", type: "electrical", status: "available" },
        { name: "Elec Assy 2", type: "electrical", status: "available" },
        { name: "Elec Assy 3", type: "electrical", status: "available" },
        { name: "Elec Assy 4", type: "electrical", status: "available" },
        { name: "Run-in", type: "final", status: "available" },
      ];
      const createdAssemblers = await db.insert(assemblers).values(defaultAssemblers).returning();

      // Initialize assembly cards
      const mechanicalAssembler1 = createdAssemblers.find(a => a.name === "Mech Assy 1");
      const electricalAssembler1 = createdAssemblers.find(a => a.name === "Elec Assy 1");
      const runin = createdAssemblers.find(a => a.name === "Run-in");

      const defaultCards = [
        {
          cardNumber: "M4",
          name: "Base Frame",
          type: "M",
          duration: 4,
          phase: 1,
          assignedTo: mechanicalAssembler1?.id || null,
          status: "in_progress",
          dependencies: [],
          precedents: ["M5"],
          startTime: new Date(),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          position: 0,
        },
        {
          cardNumber: "S4",
          name: "Sub Assembly",
          type: "S",
          duration: 3,
          phase: 2,
          assignedTo: mechanicalAssembler1?.id || null,
          status: "scheduled",
          dependencies: [],
          precedents: ["M5"],
          startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
          position: 1,
        },
        {
          cardNumber: "E7",
          name: "Wiring Harness",
          type: "E",
          duration: 5,
          phase: 3,
          assignedTo: electricalAssembler1?.id || null,
          status: "in_progress",
          dependencies: [],
          precedents: [],
          startTime: new Date(Date.now() - 30 * 60 * 1000),
          endTime: new Date(Date.now() + 4.5 * 60 * 60 * 1000),
          position: 0,
        },
        {
          cardNumber: "E8",
          name: "Control Module",
          type: "E",
          duration: 3,
          phase: 4,
          assignedTo: runin?.id || null,
          status: "completed",
          dependencies: [],
          precedents: [],
          startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 30 * 60 * 1000),
          actualDuration: 3,
          position: 0,
        }
      ];
      await db.insert(assemblyCards).values(defaultCards);
    }
  } catch (error) {
    console.error("Error initializing database data:", error);
  }
}

// Initialize database data on startup
// initializeDatabaseData(); // Commented out while using MemStorage
