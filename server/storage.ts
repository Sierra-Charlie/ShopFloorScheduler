import { type Assembler, type InsertAssembler, type AssemblyCard, type InsertAssemblyCard, type UpdateAssemblyCard } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
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
}

export class MemStorage implements IStorage {
  private assemblers: Map<string, Assembler>;
  private assemblyCards: Map<string, AssemblyCard>;

  constructor() {
    this.assemblers = new Map();
    this.assemblyCards = new Map();
    this.initializeData();
  }

  private initializeData() {
    // Initialize assemblers
    const defaultAssemblers: InsertAssembler[] = [
      { name: "Turbo 505", type: "mechanical", status: "available" },
      { name: "Precision 200", type: "electrical", status: "available" },
      { name: "Assembly 300", type: "final", status: "busy" },
      { name: "QC Station", type: "qc", status: "available" },
    ];

    defaultAssemblers.forEach(assembler => {
      const id = randomUUID();
      this.assemblers.set(id, { ...assembler, id, status: assembler.status || "available" });
    });

    // Initialize assembly cards
    const turbo505Id = Array.from(this.assemblers.values()).find(a => a.name === "Turbo 505")?.id;
    const precision200Id = Array.from(this.assemblers.values()).find(a => a.name === "Precision 200")?.id;
    const assembly300Id = Array.from(this.assemblers.values()).find(a => a.name === "Assembly 300")?.id;

    const defaultCards: InsertAssemblyCard[] = [
      {
        cardNumber: "M4",
        name: "Base Frame",
        type: "M",
        duration: 4,
        phase: 1,
        assignedTo: turbo505Id,
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
        assignedTo: turbo505Id,
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
        assignedTo: turbo505Id,
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
        assignedTo: precision200Id,
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
        assignedTo: precision200Id,
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
        assignedTo: assembly300Id,
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
        endTime: card.endTime || null
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
    const newAssembler: Assembler = { ...assembler, id, status: assembler.status || "available" };
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
      endTime: card.endTime || null
    };
    this.assemblyCards.set(id, newCard);
    return newCard;
  }

  async updateAssemblyCard(update: UpdateAssemblyCard): Promise<AssemblyCard | undefined> {
    const existing = this.assemblyCards.get(update.id);
    if (!existing) return undefined;
    
    const updated: AssemblyCard = { ...existing, ...update };
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
}

export const storage = new MemStorage();
