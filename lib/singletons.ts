import { AIExtractionService } from "./ai/extraction.service";
import { BaileysService } from "./whatsapp/baileys.service";
import { GroupConsentService } from "./whatsapp/group-consent.service";
import { SessionStore } from "./whatsapp/session.store";
import { AntibanGuard } from "./whatsapp/antiban.guard";

// Initialize services
const aiService = new AIExtractionService();
const consentService = new GroupConsentService();
const sessionStore = new SessionStore();
const antibanGuard = new AntibanGuard();

// Export singletons
export const baileysService = new BaileysService(
  aiService,
  consentService,
  sessionStore,
  antibanGuard
);

export const groupConsentService = consentService;
