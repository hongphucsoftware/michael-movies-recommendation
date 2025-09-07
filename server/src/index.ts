import express from "express";
import path from "path";
import fs from "fs";
import api from "./routes/api"; // keep if you have it; otherwise remove this line and the app.use below

const app = express();
app.disable("x-powered-by");
app.use(express.json());

// API FIRST (comment this out if you don't have routes yet)
app.use("/api", api);

// auto-detect built client in dist/client or dist/public
const candidates = [
  path.resolve(__dirname, "../client"),
  path.resolve(__dirname, "../public"),
];
const clientDir =
  candidates.find(p => fs.existsSync(path.join(p, "index.html"))) || candidates[0];

app.use(express.static(clientDir));
app.get("*", (_req, res) => res.sendFile(path.join(clientDir, "index.html")));

const PORT = Number(process.env.PORT || 3000);          // ✅ use Replit PORT
app.listen(PORT, "0.0.0.0", () => console.log("Server on", PORT, "clientDir:", clientDir));