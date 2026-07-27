---
name: server-manager
description: Manage all web servers, dev servers, database services, API ports, process tracking, and server diagnostics across the application environment (Vite dev server, Node.js, PostgreSQL, MongoDB, Redis/Memurai, Ollama AI, port conflict resolution, and background task management).
---

# Universal Server Manager Agent Skill

This agent skill orchestrates, monitors, and manages all servers, API services, database engines, and dev environments for the application.

---

## 1. Supported Server Architecture & Services

### ⚡ **Web & Application Development Servers**
- **Vite React Dev Server**: Primary frontend server (Default port: `3000` / Fallback port: `3001`).
- **Node.js Application Server**: Backend services and API endpoints.

### 🗄️ **Database & Caching Engines**
- **PostgreSQL Database**: Relational database engine (`localhost:5432`).
- **MongoDB Database**: Document database engine (`localhost:27017`).
- **Redis / Memurai Service**: In-memory cache & pub-sub store (`localhost:6379`).

### 🤖 **AI & Local LLM Servers**
- **Ollama Local AI Model Server**: Local inference service (`localhost:11434`).

---

## 2. Server Management Workflows

### 🔍 **Step 1: Active Port & Listener Diagnostics**
Check listening ports across all network interfaces to verify active server status:
```cmd
netstat -ano | findstr LISTENING
```
Or via PowerShell:
```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 3000 } | Select-Object LocalAddress, LocalPort, OwningProcess
```

### 🆔 **Step 2: Process Identification & Mapping**
Map active listening PIDs (Process IDs) to exact executable commands:
```powershell
Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq <PID> } | Select-Object ProcessId, ParentProcessId, Name, CommandLine
```

### ⚡ **Step 3: Dev Server Management (`npm run dev`)**
- Start Vite dev server in non-blocking mode: `npm run dev`.
- Detect automatically assigned port (`3000`, `3001`, `3002`).
- Monitor background execution via `manage_task` (actions: `list`, `status`).

### 🛠️ **Step 4: Port Conflict Resolution & Graceful Termination**
If a port collision occurs (e.g., port 3000 occupied by orphaned process):
- Identify the occupying PID via `netstat` or `Get-NetTCPConnection`.
- Terminate process cleanly:
  ```powershell
  Stop-Process -Id <PID> -Force
  ```
- Re-launch dev server clean on desired port.

---

## 3. Server Health & Monitoring Guidelines

1. **Never Block Execution**: Always launch long-running servers in non-blocking mode (`WaitMsBeforeAsync: 5000`) and interact via background task management (`manage_task`).
2. **Synthesize Findings Clearly**: When answering server status queries, list exact server URLs (`http://localhost:<PORT>`), framework names, process IDs, and health status.
3. **Automatic Fallback Handling**: Recognize that Vite will automatically increment port numbers if the base port is busy (`3000` → `3001`), and inform the user of the active listening URL.


# Server Management Agent Skill
