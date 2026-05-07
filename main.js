const express = require("express");
const path = require("path");
const { initializeDb } = require("./src/db");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const mainPage = path.join(__dirname, "src/views", "index.html");
const addNewStaffPage = path.join(__dirname, "src/views", "addNewStaff.html");

app.get("/", (req, res) => {
  res.sendFile(mainPage);
});

app.get("/add-new-staff", (req, res) => {
  res.sendFile(addNewStaffPage);
});

async function startServer() {
  const db = await initializeDb();

  app.get("/api/search", async (req, res) => {
    const { category, q, locationId } = req.query;
    if (!category || !q) {
      return res.status(400).json({ error: "Category and query are required" });
    }

    let table;
    switch (category) {
      case 'team': table = 'teams'; break;
      case 'staff': table = 'staff'; break;
      case 'location': table = 'locations'; break;
      case 'shift': table = 'shifts'; break;
      default: return res.status(400).json({ error: "Invalid category" });
    }

    try {
      let results;
      if (category === 'staff') {
        // Prioritize staff by location if locationId is provided
        if (locationId) {
          results = await db.all(
            `SELECT * FROM staff 
             WHERE name LIKE ? 
             ORDER BY CASE WHEN default_location_id = ? THEN 0 ELSE 1 END, name ASC 
             LIMIT 10`,
            [`%${q}%`, locationId]
          );
        } else {
          results = await db.all(
            `SELECT * FROM staff WHERE name LIKE ? LIMIT 10`,
            [`%${q}%`]
          );
        }
      } else {
        results = await db.all(
          `SELECT * FROM ${table} WHERE name LIKE ? LIMIT 10`,
          [`%${q}%`]
        );
      }
      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to search" });
    }
  });

  app.get("/api/locations", async (req, res) => {
    const data = await db.all("SELECT * FROM locations ORDER BY name ASC");
    res.json(data);
  });

  app.get("/api/teams", async (req, res) => {
    const data = await db.all("SELECT * FROM teams ORDER BY name ASC");
    res.json(data);
  });

  app.get("/api/staff/:id", async (req, res) => {
    const data = await db.get("SELECT * FROM staff WHERE id = ?", [req.params.id]);
    if (data) res.json(data);
    else res.status(404).json({ error: "Staff not found" });
  });

  app.post("/api/staff", async (req, res) => {
    const { name, phone, default_location_id, team_id } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    try {
      // Check for duplicates manually to provide a clearer message
      const existing = await db.get("SELECT id FROM staff WHERE name = ? AND phone = ?", [name, phone]);
      if (existing) {
        return res.status(409).json({ error: "A staff member with this name and phone number already exists." });
      }

      await db.run(
        "INSERT INTO staff (name, phone, default_location_id, team_id) VALUES (?, ?, ?, ?)", 
        [name, phone, default_location_id, team_id]
      );
      res.status(201).json({ message: "Staff added successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to add staff" });
    }
  });

  app.put("/api/staff/:id", async (req, res) => {
    const { name, phone, default_location_id, team_id } = req.body;
    try {
      await db.run(
        "UPDATE staff SET name = ?, phone = ?, default_location_id = ?, team_id = ? WHERE id = ?",
        [name, phone, default_location_id, team_id, req.params.id]
      );
      res.json({ message: "Staff updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update staff" });
    }
  });

  app.delete("/api/staff/:id", async (req, res) => {
    try {
      await db.run("DELETE FROM staff WHERE id = ?", [req.params.id]);
      res.json({ message: "Staff deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete staff" });
    }
  });

  app.listen(port, () => {
    console.log(
      `Roster Message Maker app listening at http://localhost:${port}`,
    );
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
