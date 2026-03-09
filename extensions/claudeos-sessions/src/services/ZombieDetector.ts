import { Session, SessionStatus } from '../types';

/**
 * Zombie session detection configuration
 */
const ZOMBIE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Service for detecting "zombie" sessions
 *
 * A zombie session is one that's stuck in ACTIVE state but hasn't had
 * any activity for an extended period (likely due to a crash or connection loss).
 */
export class ZombieDetector {
  /**
   * Detect all zombie sessions from a list of sessions
   *
   * @param sessions - Array of sessions to check
   * @returns Array of session IDs that are zombies
   */
  detectZombies(sessions: Session[]): string[] {
    const zombieIds: string[] = [];

    for (const session of sessions) {
      if (this.isZombie(session)) {
        zombieIds.push(session.id);
      }
    }

    return zombieIds;
  }

  /**
   * Check if a single session is a zombie
   *
   * A session is considered a zombie if:
   * - Status is ACTIVE
   * - AND (current time - lastModified) > 5 minutes
   *
   * @param session - Session to check
   * @returns True if session is a zombie
   */
  isZombie(session: Session): boolean {
    // Only ACTIVE sessions can be zombies
    if (session.status !== SessionStatus.ACTIVE) {
      return false;
    }

    // Check if last activity was too long ago
    const now = new Date();
    const lastModified = new Date(session.lastModified);
    const timeSinceActivity = now.getTime() - lastModified.getTime();

    return timeSinceActivity > ZOMBIE_THRESHOLD_MS;
  }

  /**
   * Get the time since last activity for a session in milliseconds
   *
   * @param session - Session to check
   * @returns Time in milliseconds since last activity
   */
  getTimeSinceActivity(session: Session): number {
    const now = new Date();
    const lastModified = new Date(session.lastModified);
    return now.getTime() - lastModified.getTime();
  }

  /**
   * Get the zombie threshold in milliseconds
   *
   * @returns Zombie threshold in milliseconds
   */
  getThresholdMs(): number {
    return ZOMBIE_THRESHOLD_MS;
  }
}
