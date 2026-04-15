import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
// @ts-ignore
import Database from "better-sqlite3";
import fs from "fs";


// --- Database Setup (Repository Pattern) ---
const dbPath = "/home/pi/data/intake.db";
const dbDir = path.dirname(dbPath);

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create database directory: ${dbDir}. Falling back to local directory.`);
    // Fallback if the requested path is not writable in this environment
  }
}

// Using SQLite for production-ready local persistence
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Refactor: Drop old table if it exists with old schema to apply new normalized structure
try {
  const tableInfo = db.prepare("PRAGMA table_info(intake_records)").all() as any[];
  const hasOldColumns = tableInfo.some(col => col.name === 'name' || col.name === 'phone_number');
  if (hasOldColumns) {
    db.exec("DROP TABLE intake_records");
  }
} catch (e) {
  // Table might not exist yet
}

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS intake_records (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    gold_weight REAL NOT NULL,
    gold_price_at_entry REAL NOT NULL,
    is_completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

// Migration: Add is_completed if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(intake_records)").all() as any[];
  const hasCompletedColumn = tableInfo.some(col => col.name === 'is_completed');
  if (!hasCompletedColumn) {
    db.exec("ALTER TABLE intake_records ADD COLUMN is_completed BOOLEAN DEFAULT 0");
  }
} catch (e) {
  console.error("Migration error:", e);
}

const CustomerRepository = {
  findByPhoneNumber: (phoneNumber: string) => {
    return db.prepare("SELECT * FROM customers WHERE phone_number = ?").get(phoneNumber) as any;
  },
  create: (customer: { id: string; name: string; phoneNumber: string }) => {
    const stmt = db.prepare("INSERT INTO customers (id, name, phone_number) VALUES (?, ?, ?)");
    stmt.run(customer.id, customer.name, customer.phoneNumber);
    return customer;
  }
};

const IntakeRepository = {
  save: (record: { id: string; customerId: string; goldWeight: number; goldPriceAtEntry: number }) => {
    const stmt = db.prepare(`
      INSERT INTO intake_records (id, customer_id, gold_weight, gold_price_at_entry, is_completed)
      VALUES (?, ?, ?, ?, 0)
    `);
    stmt.run(record.id, record.customerId, record.goldWeight, record.goldPriceAtEntry);
    return record;
  },
  findAllPending: (search?: string) => {
    let query = `
      SELECT i.*, c.name, c.phone_number 
      FROM intake_records i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.is_completed = 0
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.phone_number LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }

    query += ` ORDER BY i.created_at DESC`;
    return db.prepare(query).all(...params) as any[];
  },
  markAsCompleted: (id: string) => {
    const stmt = db.prepare("UPDATE intake_records SET is_completed = 1 WHERE id = ?");
    return stmt.run(id);
  }
};

// --- Service Layer ---
const IntakeService = {
  createIntake: (data: { name: string; phoneNumber: string; goldWeight: number }) => {
    // 1. Check if customer exists
    let customer = CustomerRepository.findByPhoneNumber(data.phoneNumber);

    // 2. If not, create new customer
    if (!customer) {
      customer = CustomerRepository.create({
        id: crypto.randomUUID(),
        name: data.name,
        phoneNumber: data.phoneNumber
      });
    }

    // 3. Capture current gold price (mocked as requested)
    const mockGoldPrice = 75.50; 
    
    // 4. Insert intake record with customer_id
    const record = {
      id: crypto.randomUUID(),
      customerId: customer.id,
      goldWeight: data.goldWeight,
      goldPriceAtEntry: mockGoldPrice,
      createdAt: new Date().toISOString()
    };
    
    return IntakeRepository.save(record);
  },
  getPendingIntakes: (search?: string) => {
    return IntakeRepository.findAllPending(search);
  },
  completeIntake: (id: string) => {
    return IntakeRepository.markAsCompleted(id);
  }
};

// --- Controller Layer ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes with /api context path
  const apiRouter = express.Router();

  apiRouter.post("/intake", (req, res) => {
    try {
      const { name, phoneNumber, goldWeight } = req.body;
      
      if (!name || !phoneNumber || goldWeight === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const savedRecord = IntakeService.createIntake({ name, phoneNumber, goldWeight });
      
      res.status(201).json({
        id: savedRecord.id,
        message: "Intake recorded successfully"
      });
    } catch (error) {
      console.error("Error in intake:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  apiRouter.get("/intake", (req, res) => {
    try {
      const { search } = req.query;
      const records = IntakeService.getPendingIntakes(search as string);
      res.json(records);
    } catch (error) {
      console.error("Error fetching intakes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  apiRouter.patch("/intake/:id/complete", (req, res) => {
    try {
      const { id } = req.params;
      IntakeService.completeIntake(id);
      res.json({ message: "Intake marked as completed" });
    } catch (error) {
      console.error("Error completing intake:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
