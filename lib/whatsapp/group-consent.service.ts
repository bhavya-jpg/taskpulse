/**
 * GROUP CONSENT SERVICE
 * ──────────────────────
 * Manages which WhatsApp groups a user has explicitly approved for monitoring.
 */

import { supabaseAdmin } from "../supabase-admin";

export const MAX_GROUPS_PER_USER = 5;

export interface ApprovedGroup {
  jid: string;
  groupName: string;
  approvedAt: Date;
}

export class GroupConsentService {
  private cache = new Map<string, { jids: string[]; cachedAt: number }>();
  private CACHE_TTL_MS = 2 * 60 * 1000; // 2-minute cache

  async getApprovedGroups(userId: string): Promise<string[]> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.jids;
    }
    const { data } = await supabaseAdmin
      .from("whatsapp_consented_groups")
      .select("group_jid")
      .eq("user_id", userId)
      .eq("is_active", true);

    const jids = (data ?? []).map((r: any) => r.group_jid);
    this.cache.set(userId, { jids, cachedAt: Date.now() });
    return jids;
  }

  async addGroup(userId: string, jid: string, groupName: string): Promise<void> {
    const existing = await this.getApprovedGroups(userId);
    if (existing.length >= MAX_GROUPS_PER_USER) {
      throw new Error(`Maximum of ${MAX_GROUPS_PER_USER} groups allowed per user`);
    }
    if (existing.includes(jid)) return; // Already added

    await supabaseAdmin.from("whatsapp_consented_groups").upsert({
      user_id: userId,
      group_jid: jid,
      group_name: groupName,
      is_active: true,
      consented_at: new Date().toISOString(),
    });

    this.cache.delete(userId); // Invalidate cache
  }

  async removeGroup(userId: string, jid: string): Promise<void> {
    await supabaseAdmin
      .from("whatsapp_consented_groups")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("group_jid", jid);

    this.cache.delete(userId);
  }

  async listApprovedGroupDetails(userId: string): Promise<ApprovedGroup[]> {
    const { data } = await supabaseAdmin
      .from("whatsapp_consented_groups")
      .select("group_jid, group_name, consented_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("consented_at", { ascending: true });

    return (data ?? []).map((r: any) => ({
      jid:       r.group_jid,
      groupName: r.group_name,
      approvedAt: new Date(r.consented_at),
    }));
  }

  async updateGroupName(userId: string, jid: string, newName: string): Promise<void> {
    await supabaseAdmin
      .from("whatsapp_consented_groups")
      .update({ group_name: newName })
      .eq("user_id", userId)
      .eq("group_jid", jid);
    this.cache.delete(userId);
  }
}
