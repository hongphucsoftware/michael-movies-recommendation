import express from "express";
import path from "path";
import fs from "fs";
import api from "./routes/api";

const app = express();
app.disable("x-powered-by");
app.use(express.json());

// API BEFORE static
app.use("/api", api);

// Detect built client in dist/client OR dist/public
const candidates = [
  path.resolve(__dirname, "../client"),
  path.resolve(__dirname, "../public")
];
const clientDir = candidates.find(p => fs.existsSync(path.join(p, "index.html"))) || candidates[0];

app.use(express.static(clientDir));
app.get("*", (_req, res) => res.sendFile(path.join(clientDir, "index.html")));

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, "0.0.0.0", () => console.log("PickAFlick simplified server on", PORT, "clientDir:", clientDir));