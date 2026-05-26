# 💼 TaskPulse Client Command Center

## 1. Executive Summary
- **What is it?** A unified dashboard and command station inside TaskPulse designed for founders to manage multiple client accounts in one place.
- **Why was it built?** In agencies, tasks can get highly scattered across emails, Slack messages, meetings, and team members. The Client Command Center aggregates this data into operational hubs, giving founders an immediate overview of account health, overdue tasks, active stakeholders, and client-facing dependencies.
- **Visual Integration**: Instead of cluttering the main navigation, the feature is promoted via a gorgeous dashboard banner leading to a dedicated sub-route (`/founder/clients`).

---

## 2. Who Has Access?
- **Access Level**: **Founders Only**.
- **Role-Based Security**: TaskPulse defines roles during the onboarding flow (e.g., `founder` vs `employee`). Since this workspace deals with sensitive billing accounts, contract health, overall client delivery, and strategic stakeholders, it is restricted to the **Founder Dashboard** and the `/founder` path prefix.
- **Entry Points**:
  1. **Dashboard Promo Banner**: Situated directly on the Founder Dashboard (`/founder`) right below the blockers list and above the Manual Task Creator. It features a modern card with a dynamic radial gradient, a teal accent scheme, a "New" badge, and an actionable "Open Command Center" CTA.
  2. **Direct Routing**: Accessible via `/founder/clients` for founders authenticated with appropriate roles.

---

## 3. Core Capabilities: What Can a Founder Do?

The Client Command Center divides client operations into two major view layers: **The Portfolio Grid (Client Cards)** and **The Client Workspace**.

### A. The Portfolio Grid (Client Cards)
When entering `/founder/clients`, the founder is greeted with a sleek responsive grid where each card acts as a mini command center.
- **Immediate Account Health**: The card instantly answers:
  - **Active Tasks**: Current in-flight deliverables.
  - **Completed**: Total tasks achieved.
  - **Pending From Client**: Blocks waiting on client assets or approvals.
  - **Overdue**: Critical tasks past their due dates.
- **Dynamic Visuals**: A smooth, themed progress bar matches the client's visual identity, showing the ratio of completed tasks to active work.
- **Connected Sources Indicator**: Displays icons of where the client's tasks are coming from (Slack, Gmail, Zoom meetings, Google Drive, or Calendar).
- **Task Preview Feed**: Displays a mini-table of the top 4 active tasks (with priority chips, assignees, and exact statuses) so founders don't have to open the full account to see immediate priorities.
- **Quick Actions**: Buttons to instantly open the workspace or add a new stakeholder.

### B. The Client Workspace (The 6-Tab Console)
Clicking **Open Workspace** on any client card expands a comprehensive management deck featuring six dedicated tabs:

#### 1. Overview Tab (Account Pulse)
- **Project Health Meter**: A dynamic percentage showing operational health.
- **Activity Timeline**: A vertical feed showing recent updates, created tasks, and stakeholder assignments.
- **AI-Generated Summary**: An AI overview analyzing current progress, bottlenecks, and client sentiment.
- **AI Task Ingestion Panel**: A smart ingestion card. If a client sends an email or Slack message with multiple requests, the founder can paste the raw text here. Clicking "Extract Tasks" triggers an animated parser that parses sentences and spits out structured, suggested tasks containing:
  - Task Title
  - Estimated Due Date (auto-calculates based on keywords like "ASAP", "Friday", "next week")
  - Suggested Stakeholder assignment
  - Priority (High/Medium/Low based on urgency indicators)
  - Origin Source (Gmail/Slack/Manual)

#### 2. Tasks Tab (Operational Grid)
- **Master Account Grid**: A complete, filterable table of all tasks associated with this client.
- **Advanced Filtering**: Toggle tasks by workflow statuses (e.g., *Needs Review*, *To Do*, *In Progress*, *Internal Review*, *Waiting for Client*, *Blocked*, *Completed*).
- **Source Context**: Columns tracking where the task originated (Gmail, Slack, etc.) with clickable integrations.

#### 3. Stakeholders Tab (People & Account Map)
- **Stakeholder Registry**: A list of key people linked to the account—both internal agency staff and external client-side contacts.
- **Operational Roles & Categories**:
  - **Roles**: *Account Manager*, *Strategist*, *Designer*, *Editor*, *Performance Marketer*, *Client POC* (Point of Contact), *Founder*, *Vendor*, *Freelancer*.
  - **Categories**: *Design*, *Content*, *Video*, *Reporting*, *Strategy*, *Performance*.
- **Metrics Table**: Shows exactly how many tasks are Assigned, Pending, or Completed for each stakeholder.
- **Task Breakdown Accordions**: Expand any stakeholder row to see their precise active tasks.
- **Add Stakeholder Modal**: An intuitive overlay for adding names, emails/Slack IDs, roles, and categories.

#### 4. Meetings Tab (Strategic Placeholder)
- A clean, empty-state placeholder styled with modern graphics and typography. Designed for future integrations with calendar events, audio recording uploads, and AI meeting transcripts.

#### 5. Files Tab (Asset Hub Placeholder)
- A premium styled placeholder ready for centralizing design briefs, copy documents, media files, and invoice drafts.

#### 6. Activity Log Tab (Audit Trail)
- A granular, chronological history tracking state changes, status shifts, and timeline milestones specific to that client's account, complete with source badge icons.

---

## 4. How Others Can Understand & Use This Feature
To ensure alignment across the agency, here is how different roles interface with the Client Command Center:

### 👥 For Agency Employees (Account Managers, Creatives, Strategists)
- **No Extra Work Required**: Employees do not need to do anything differently! They continue creating and updating tasks in their standard dashboard.
- **Automatic Association**: The system reads the task's `client` field (mapped from the source group name) and automatically pulls it into the Client Command Center.
- **Account Cleanliness**: If an employee needs to mark a task as blocked by the client, they simply flag it. The Client Command Center immediately lists it under **"Pending From Client"** and tags it with a **"Waiting for Client"** status, alerting the founder to step in.

### 🔌 For External Stakeholders & Clients
- **Operational Mapping Only (No Logins)**: Stakeholders **do not** log into the system or have user accounts (no password management, no permission setup needed).
- **Clear Accountability**: By mapping external client stakeholders to tasks (e.g., tagging a client-side manager on a "Feedback Needed" task), agency employees and founders can clearly track who is holding up a deliverable.
- **Future-Ready**: This registry forms the structural framework for sending automated email updates or Slack notifications directly to client-side stakeholders in future updates.

### 💻 For Developers & Maintainers
- **Route Location**: Built using the Next.js App Router under `app/founder/clients/page.tsx`.
- **Main Dashboard Integration**: Banner integrated within `app/founder/page.tsx` as an animated block.
- **Data Model Integration**:
  - **Tasks**: Tasks are fetched dynamically from the existing `/api/tasks` database.
  - **Client Extraction**: Client names are dynamically grouped based on unique names in the task database (via `source_group_name`).
  - **Stakeholders Table**: A database table has been modeled and pre-written in `supabase_schema_updates.sql` under the `stakeholders` schema:
    ```sql
    CREATE TABLE IF NOT EXISTS stakeholders (
      id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      company      text NOT NULL,
      client_name  text NOT NULL,
      name         text NOT NULL,
      email        text,
      slack_id     text,
      role         text NOT NULL,
      category     text,
      created_at   timestamptz DEFAULT now()
    );
    ALTER TABLE stakeholders DISABLE ROW LEVEL SECURITY;
    ```
  - **Client-Side Storage**: In the current iteration, stakeholder mappings are stored and loaded from `localStorage` keyed by client company name. This allows instant frontend interactions without database lag, and matches the SQL structure perfectly for an easy sync in the next phase.

---

## 5. Guide: Step-by-Step Operations

### How to Onboard a New Client Account
1. **Assign a Client Name to a Task**: Ensure that new tasks created have their "Source Group" or "Client" field filled (e.g., "Nike" or "Stripe").
2. **Access the Page**: Click **Open Command Center** from the Founder Dashboard banner.
3. **See the New Client Card**: The system dynamically scans your tasks, spots the new client name, calculates stats, and creates a tailored, beautiful card automatically!
4. **Map the Stakeholders**:
   - Click **Add Stakeholder** on the client card.
   - Enter the name and email of your agency contact or the client's internal lead.
   - Select their operational role and department category.
   - Save! The stakeholder will now appear inside the workspace under the **Stakeholders** tab.
5. **Open Workspace**: Click **Open Workspace** on the client card to access the 6-tab console and start managing.
6. **Use AI Extraction**: Have a long email thread from the client? Paste it in the **AI Task Extraction** textarea in the Overview tab, click **Extract Tasks**, and watch the AI instantly break down actionable todo items, assign them to your stakeholders, and schedule due dates!

---

## 6. Workflow & Status Cheat Sheet
Task statuses inside the Command Center map to modern agency milestones:

| Status | Code Condition | Meaning |
|---|---|---|
| **Needs Review** | `confidence < 85%` | The task has been parsed by AI or a junior employee but hasn't been approved yet. |
| **To Do** | Standard initial state | Deliverable is queued and ready for assignment. |
| **In Progress** | Standard in-progress | Assigned creative/developer is actively working. |
| **Internal Review** | Mapped review state | Creative is done; senior account team is reviewing quality before showing the client. |
| **Waiting for Client** | Client dependencies | Deliverable is pending feedback, copy, passwords, or invoice payments from the client side. |
| **Blocked** | `isBlocked === true` | Work is stopped due to technical or operational showstoppers. |
| **Completed** | `status === 'done'` | Mapped from completed tasks. |

---

## 7. Future Growth Roadmap
For developers wanting to build onto this core system:
1. **Production DB Migration**: Transition stakeholder state from browser `localStorage` to the PostgreSQL `stakeholders` table in Supabase (the table schema is already created in `supabase_schema_updates.sql`).
2. **Dynamic Ingestion API**: Connect the AI Ingestion panel directly to a Google OAuth/Gmail API or Slack Webhook to stream incoming client requests straight into the dashboard in real-time.
3. **Client-Facing Viewports**: Build a secondary view (`/client/dashboard`) allowing client-side stakeholders to log in and see their **"Waiting for Client"** tasks directly, with easy download lists for files.

---
*Document prepared for TaskPulse Team. Keep this file updated as features evolve.*
