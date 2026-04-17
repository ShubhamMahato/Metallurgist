import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";
import * as Handlebars from "handlebars";
import puppeteer from "puppeteer";
import crypto from "crypto";
import { reportTemplate } from "./reportTemplate";

// --- Database Setup (Repository Pattern) ---
let dbPath = "/home/pi/data/intake.db";
const dbDir = path.dirname(dbPath);

// Ensure directory exists or fallback
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (err) {
  console.error(
    `Failed to create database directory: ${dbDir}. Falling back to local.`,
  );
  dbPath = path.resolve("intake.db");
}

let db: Database.Database;
try {
  db = new Database(dbPath);
} catch (err) {
  console.error(`Failed to open database at ${dbPath}, falling back to local.`);
  db = new Database(path.resolve("intake.db"));
}
db.pragma("foreign_keys = ON");

// Refactor: Drop old table if it exists with old schema to apply new normalized structure
try {
  const tableInfo = db
    .prepare("PRAGMA table_info(intake_records)")
    .all() as any[];
  const hasOldColumns = tableInfo.some(
    (col) => col.name === "name" || col.name === "phone_number",
  );
  if (hasOldColumns) {
    db.exec("DROP TABLE intake_records");
  }
} catch (e) {
  // Table might not exist yet
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS intake_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    name TEXT,
    phone_number TEXT,
    gold_weight REAL NOT NULL,
    gold_price_at_entry REAL NOT NULL,
    is_completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS final_metal_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    intake_id TEXT NOT NULL,
    total_value REAL NOT NULL,
    purity_percentage REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (intake_id) REFERENCES intake_records(id)
  );

  CREATE TABLE IF NOT EXISTS final_metal_breakdown (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    final_result_id TEXT NOT NULL,
    metal_id TEXT NOT NULL,
    value REAL NOT NULL,
    percentage REAL,
    FOREIGN KEY (final_result_id) REFERENCES final_metal_results(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
  CREATE INDEX IF NOT EXISTS idx_intake_records_user_id ON intake_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_final_results_user_id ON final_metal_results(user_id);
`);

// Migration: Ensure all tables have the correct columns for multi-tenancy
try {
  const tables = ["customers", "intake_records", "final_metal_results"];
  tables.forEach((table) => {
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as any[];

    // Add user_id if missing
    if (!tableInfo.some((col) => col.name === "user_id")) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
    }

    // Add updated_at if missing
    if (!tableInfo.some((col) => col.name === "updated_at")) {
      db.exec(
        `ALTER TABLE ${table} ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
      );
    }
  });

  // Specific migration for intake_records name/phone_number if requested
  const intakeInfo = db
    .prepare("PRAGMA table_info(intake_records)")
    .all() as any[];
  if (!intakeInfo.some((col) => col.name === "name")) {
    db.exec("ALTER TABLE intake_records ADD COLUMN name TEXT");
  }
  if (!intakeInfo.some((col) => col.name === "phone_number")) {
    db.exec("ALTER TABLE intake_records ADD COLUMN phone_number TEXT");
  }
} catch (e) {
  console.error("Migration error:", e);
}

const CustomerRepository = {
  findByPhoneNumber: (userId: string, phoneNumber: string) => {
    return db
      .prepare("SELECT * FROM customers WHERE user_id = ? AND phone_number = ?")
      .get(userId, phoneNumber) as any;
  },
  create: (customer: {
    id: string;
    userId: string;
    name: string;
    phoneNumber: string;
  }) => {
    const stmt = db.prepare(
      "INSERT INTO customers (id, user_id, name, phone_number) VALUES (?, ?, ?, ?)",
    );
    stmt.run(customer.id, customer.userId, customer.name, customer.phoneNumber);
    return customer;
  },
};

const IntakeRepository = {
  save: (record: {
    id: string;
    userId: string;
    customerId: string;
    name: string;
    phoneNumber: string;
    goldWeight: number;
    goldPriceAtEntry: number;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO intake_records (id, user_id, customer_id, name, phone_number, gold_weight, gold_price_at_entry, is_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    stmt.run(
      record.id,
      record.userId,
      record.customerId,
      record.name,
      record.phoneNumber,
      record.goldWeight,
      record.goldPriceAtEntry,
    );
    return record;
  },
  findAllPending: (userId: string, search?: string) => {
    let query = `
      SELECT i.*, c.name, c.phone_number 
      FROM intake_records i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.user_id = ? AND i.is_completed = 0
    `;
    const params: any[] = [userId];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.phone_number LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }

    query += ` ORDER BY i.created_at DESC`;
    return db.prepare(query).all(...params) as any[];
  },
  markAsCompleted: (userId: string, id: string) => {
    const stmt = db.prepare(
      "UPDATE intake_records SET is_completed = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id = ?",
    );
    return stmt.run(userId, id);
  },
};

const UserRepository = {
  findById: (id: string) => {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  },
  findByEmail: (email: string) => {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  },
  create: (user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    passwordHash?: string;
  }) => {
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, phone_number, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      user.id,
      user.name,
      user.email,
      user.phoneNumber,
      user.passwordHash || null,
    );
    return user;
  },
};

const FinalResultRepository = {
  saveWithTransaction: (data: {
    id: string;
    userId: string;
    customerId: string;
    intakeId: string;
    totalValue: number;
    purityPercentage: number;
    metals: { metal_id: string; value: number; percentage?: number }[];
  }) => {
    const transaction = db.transaction((payload) => {
      // 1. Insert into final_metal_results
      const headerStmt = db.prepare(`
        INSERT INTO final_metal_results (id, user_id, customer_id, intake_id, total_value, purity_percentage)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      headerStmt.run(
        payload.id,
        payload.userId,
        payload.customerId,
        payload.intakeId,
        payload.totalValue,
        payload.purityPercentage,
      );

      // 2. Insert into final_metal_breakdown
      const breakdownStmt = db.prepare(`
        INSERT INTO final_metal_breakdown (final_result_id, metal_id, value, percentage)
        VALUES (?, ?, ?, ?)
      `);

      for (const metal of payload.metals) {
        breakdownStmt.run(
          payload.id,
          metal.metal_id,
          metal.value,
          metal.percentage || null,
        );
      }
    });

    transaction(data);
    return { id: data.id };
  },
  getReportData: (reportId: string) => {
    // PUBLIC endpoint, so ID must be validated or hard to guess
    const header = db
      .prepare(
        `
      SELECT 
        r.id as report_id,
        r.total_value as total_aggregate,
        r.purity_percentage,
        r.created_at as date,
        c.name as customer_name,
        c.phone_number,
        i.gold_weight
      FROM final_metal_results r
      JOIN customers c ON r.customer_id = c.id
      JOIN intake_records i ON r.intake_id = i.id
      WHERE r.id = ?
    `,
      )
      .get(reportId) as any;

    if (!header) return null;

    const breakdown = db
      .prepare(
        `
      SELECT 
        metal_id as metal,
        metal_id as symbol, -- Placeholder for symbol mapping if needed
        value
      FROM final_metal_breakdown
      WHERE final_result_id = ?
    `,
      )
      .all(reportId) as any[];

    // Map symbols if needed or use metal_id as name
    const metals = breakdown.map((m) => ({
      metal: m.metal.charAt(0).toUpperCase() + m.metal.slice(1),
      symbol: m.symbol.substring(0, 2).toUpperCase(),
      value: parseFloat(m.value).toFixed(3),
    }));

    return {
      ...header,
      date: new Date(header.date).toLocaleDateString("en-GB"),
      metals,
    };
  },
};

// --- Service Layer ---
const IntakeService = {
  createIntake: (
    userId: string,
    data: { name: string; phoneNumber: string; goldWeight: number },
  ) => {
    // 1. Check if customer exists for THIS user
    let customer = CustomerRepository.findByPhoneNumber(
      userId,
      data.phoneNumber,
    );

    // 2. If not, create new customer for THIS user
    if (!customer) {
      customer = CustomerRepository.create({
        id: crypto.randomUUID(),
        userId,
        name: data.name,
        phoneNumber: data.phoneNumber,
      });
    }

    // 3. Capture current gold price (mocked as requested)
    const mockGoldPrice = 75.5;

    // 4. Insert intake record with customer_id and user_id
    const record = {
      id: crypto.randomUUID(),
      userId,
      customerId: customer.id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      goldWeight: data.goldWeight,
      goldPriceAtEntry: mockGoldPrice,
      createdAt: new Date().toISOString(),
    };

    return IntakeRepository.save(record);
  },
  getPendingIntakes: (userId: string, search?: string) => {
    return IntakeRepository.findAllPending(userId, search);
  },
  completeIntake: (userId: string, id: string) => {
    return IntakeRepository.markAsCompleted(userId, id);
  },
};

// --- Controller Layer ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes with /api context path
  const apiRouter = express.Router();

  // Auth Routes
  apiRouter.post("/auth/register", (req, res) => {
    try {
      const { name, email, phoneNumber, password } = req.body;
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      const existing = UserRepository.findByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }

      const newUser = UserRepository.create({
        id: crypto.randomUUID(),
        name,
        email,
        phoneNumber,
        passwordHash: password, // TODO: Hash password
      });

      res
        .status(201)
        .json({ id: newUser.id, name: newUser.name, email: newUser.email });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  apiRouter.post("/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      const user = UserRepository.findByEmail(email);

      // Simple validation for mock auth
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Simple Auth Middleware
  const authMiddleware = (req: any, res: any, next: any) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.userId = userId;
    next();
  };

  apiRouter.use(["/intake", "/final-results"], authMiddleware);

  // PUBLIC REPORT ENDPOINT
  apiRouter.get("/report/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const reportData = FinalResultRepository.getReportData(id);

      if (!reportData) {
        return res.status(404).send("Report not found");
      }

      const template = Handlebars.compile(reportTemplate);
      const html = template(reportData);

      // Generate PDF
      const browser = await puppeteer.launch({
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--single-process",
        ],
        headless: true,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="report_${id}.pdf"`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).send("Failed to generate PDF report");
    }
  });

  apiRouter.post("/final-results/save", (req: any, res) => {
    try {
      const { customerId, intakeId, totalValue, purityPercentage, metals } =
        req.body;

      if (!customerId || !intakeId || totalValue === undefined || !metals) {
        return res
          .status(400)
          .json({ message: "Missing required final results data" });
      }

      const result = FinalResultRepository.saveWithTransaction({
        id: crypto.randomUUID(),
        userId: req.userId,
        customerId,
        intakeId,
        totalValue,
        purityPercentage,
        metals,
      });

      res.status(201).json({
        id: result.id,
        message: "Final report saved successfully",
      });
    } catch (error) {
      console.error("Error saving final results:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  apiRouter.post("/intake", (req: any, res) => {
    try {
      const { name, phoneNumber, goldWeight } = req.body;

      if (!name || !phoneNumber || goldWeight === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const savedRecord = IntakeService.createIntake(req.userId, {
        name,
        phoneNumber,
        goldWeight,
      });

      res.status(201).json({
        id: savedRecord.id,
        message: "Intake recorded successfully",
      });
    } catch (error) {
      console.error("Error in intake:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  apiRouter.get("/intake", (req: any, res) => {
    try {
      const { search } = req.query;
      const records = IntakeService.getPendingIntakes(
        req.userId,
        search as string,
      );
      res.json(records);
    } catch (error) {
      console.error("Error fetching intakes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  apiRouter.patch("/intake/:id/complete", authMiddleware, (req: any, res) => {
    try {
      const { id } = req.params;
      IntakeService.completeIntake(req.userId, id);
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
    const distPath = path.resolve("dist");
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
