/**
 * ANTIBAN GUARD
 * ─────────────
 * Tracks reconnect history per user and enforces exponential back-off.
 */

export class AntibanGuard {
  private reconnectHistory = new Map<string, number[]>(); // userId → timestamps

  private readonly BASE_DELAY_MS   = 5_000;   //  5 seconds
  private readonly MAX_DELAY_MS    = 300_000;  //  5 minutes
  private readonly MAX_RECONNECTS  = 10;       // beyond this → warn

  /**
   * Returns how long to wait before reconnecting, based on how many
   * reconnects have happened in the last hour. Uses exponential back-off.
   */
  getReconnectDelay(userId: string): number {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const history = (this.reconnectHistory.get(userId) ?? [])
      .filter((t) => now - t < oneHour);

    history.push(now);
    this.reconnectHistory.set(userId, history);

    const attempt = Math.min(history.length, 10);
    // Exponential: 5s, 10s, 20s, 40s … capped at 5 min
    const delay = Math.min(this.BASE_DELAY_MS * Math.pow(2, attempt - 1), this.MAX_DELAY_MS);

    // Add ±20% jitter so multiple users don't reconnect simultaneously
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.round(delay + jitter);
  }

  isSuspiciouslyFrequent(userId: string): boolean {
    const history = this.reconnectHistory.get(userId) ?? [];
    return history.length >= this.MAX_RECONNECTS;
  }
}
