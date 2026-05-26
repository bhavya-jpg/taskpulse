# WhatsApp Integration: TaskPulse AI

This document explains how TaskPulse AI integrates with WhatsApp using the Baileys library to extract tasks while maintaining a privacy-first, anti-ban architecture.

## 🏗 Architecture Overview

TaskPulse AI uses a **read-only linked device** pattern. Instead of a standalone bot, the system connects as a secondary device (like WhatsApp Web), which is significantly more resilient to bans.

### Core Components

1.  **Baileys Engine (`baileys.service.ts`)**:
    *   Connects using `@whiskeysockets/baileys`.
    *   Listens to `messages.upsert` events.
    *   **Mark-as-Read Suppression**: Never sends read receipts to avoid "bot-like" behavior.
    *   **Active Hours**: Only connects during business hours (8 AM – 9 PM IST) to mimic human activity.

2.  **Privacy Layer (`group-consent.service.ts`)**:
    *   **Hard Limit**: Enforces a maximum of 5 groups per user.
    *   **Filtering**: Messages from any chat or group NOT explicitly approved by the user are dropped at the library level before reaching any logic or AI.

3.  **AI Pipeline (`extraction.service.ts`)**:
    *   **Tier 1 (Regex Filter)**: Fast, free pattern matching to discard "noted", "👍", or greetings.
    *   **Tier 2 (Gemini)**: Uses **Gemini 1.5 Flash** to extract structured JSON (Task Title, Priority, Deadline, Assignee) from the message and its surrounding context.

4.  **Anti-Ban Guard (`antiban.guard.ts`)**:
    *   Implements **Exponential Back-off** for reconnections.
    *   Adds **Human-like Jitter** (random delays) before processing messages.
    *   Limits processing to 30 messages per minute.

## 🔄 Task Generation Flow

1.  **Incoming Message**: A message arrives in an approved WhatsApp group.
2.  **Validation**: The Baileys service checks if the group is consented and passes rate limits.
3.  **Context Building**: The service fetches the last 4 messages in the group to provide "thread context" to the AI.
4.  **AI Extraction**:
    *   Gemini analyzes the message + context + sender role (Admin/Member).
    *   A confidence score is calculated.
5.  **Dashboard Delivery**:
    *   If a task is found, it's saved to Supabase.
    *   A Server-Sent Event (SSE) is pushed to the frontend.
    *   The task appears live on the dashboard without a page refresh.

## 🛠 Setup & Deployment

1.  **Database**: Run `schema.sql` in your Supabase SQL Editor.
2.  **Environment**: Add `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local`.
3.  **Connection**: 
    *   Go to the **WhatsApp** tab on the dashboard.
    *   Click **Setup WhatsApp**.
    *   Scan the QR code with your phone.
    *   Select the groups you want TaskPulse to monitor.

## 🔒 Privacy Guarantee

*   **Raw Content Purge**: A database trigger automatically purges raw message text from the `tasks` table after 30 days.
*   **No Permanent Logs**: The system does not store logs of non-task messages.
*   **Read-Only**: The integration is structurally incapable of sending messages; no `sendMessage` calls exist in the codebase.
