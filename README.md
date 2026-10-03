# David Agent (v4.2.0)

> **David** is an autonomous terminal and PowerShell AI agent powered by a unified 4-model architecture with self-healing execution and extensible skill packs.

---

## ⚡ Quick Install

In your Windows PowerShell or terminal:

```powershell
npm install -g git+https://github.com/seun22470-ui/inject.git
```

### Run David:

```powershell
david
# or
david-agent
```

---

## 🧠 4 Internal Models in One Agent (David)

David operates as a single unified identity containing four specialized internal models:

1. **`INJECT` (Commander & Generator)**
   - System architect, file writer, dynamic multi-language code execution.
2. **`CODE REVIEWER` (Self-Healing & Auditor)**
   - Catches syntax & runtime errors, executes the `/heal` self-healing repair loop.
3. **`ACCUMULATE` (Harvester & Web Researcher)**
   - Live web search for code tutorials, DuckDuckGo parser, and installable validated skill packs (`/packs`).
4. **`DIGEST` (Memory & AST Analyzer)**
   - Generates project folder tree maps, tracks dependencies, and summarizes logs.

---

## 🛠️ Essential Commands

| Command | Description |
| :--- | :--- |
| `david` | Launch David CLI |
| `/models` | View all 4 internal models |
| `/model <name>` | Switch active model (`/model reviewer`, `/model accumulate`, etc.) |
| `/heal <code>` | Run code through self-healing correction loop |
| `/packs` | Search installable validated skill packs |
| `/pack install <id>` | Install pack into David's active registry |
| `/serve [dir] [port]` | Start embedded local HTTP server preview |
| `/skills` | List all registered skills |
| `/run <cmd>` | Run shell or terminal command |
| `/help` | View complete help menu |
| `/exit` | Exit David |
