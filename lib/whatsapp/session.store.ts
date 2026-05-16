import { supabaseAdmin } from "../supabase-admin";

export class SessionStore {
  /**
   * Updates the group name in the database when it changes on WhatsApp.
   */
  async updateGroupName(userId: string, jid: string, newName: string): Promise<void> {
    await supabaseAdmin
      .from("whatsapp_consented_groups")
      .update({ group_name: newName })
      .eq("user_id", userId)
      .eq("group_jid", jid);
  }
}
