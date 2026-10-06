import { getDbPool } from "@/lib/db";
import { supabaseServer } from "@/lib/supabase/server";

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "task"
  | "project"
  | "approval"
  | "field";

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string | null;
}

export interface CreateNotificationInput {
  organizationId?: string;
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Tạo thông báo mới và phát sóng Realtime qua Supabase WebSocket
   */
  static async createNotification(input: CreateNotificationInput): Promise<NotificationDto> {
    const pool = getDbPool();

    // Lấy organization_id nếu chưa truyền vào
    let orgId = input.organizationId;
    if (!orgId) {
      const orgRes = await pool.query(
        `SELECT organization_id FROM erp.memberships WHERE user_id = $1 LIMIT 1`,
        [input.userId]
      );
      orgId = orgRes.rows[0]?.organization_id;
      if (!orgId) {
        const defaultOrg = await pool.query(`SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1`);
        orgId = defaultOrg.rows[0]?.id;
      }
    }

    const res = await pool.query(
      `INSERT INTO erp.notifications (
         organization_id, user_id, title, message, type, link, metadata, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       RETURNING id, user_id, title, message, type, link, is_read, metadata, created_at, read_at`,
      [
        orgId,
        input.userId,
        input.title,
        input.message,
        input.type || "info",
        input.link || null,
        JSON.stringify(input.metadata || {}),
      ]
    );

    const r = res.rows[0];
    const notif: NotificationDto = {
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      type: r.type as NotificationType,
      link: r.link,
      isRead: r.is_read,
      metadata: r.metadata,
      createdAt: r.created_at.toISOString(),
      readAt: r.read_at ? r.read_at.toISOString() : null,
    };

    // Phát sóng WebSocket Realtime cho người dùng đang mở App
    try {
      const channel = supabaseServer.channel("erp-realtime-notifications");
      await channel.send({
        type: "broadcast",
        event: "new_notification",
        payload: notif,
      });
    } catch (realtimeErr) {
      console.warn("[REALTIME] Không thể gửi broadcast thông báo:", realtimeErr);
    }

    return notif;
  }

  /**
   * Truy vấn danh sách thông báo và số lượng chưa đọc của người dùng
   */
  static async listUserNotifications(
    userId: string,
    limit = 30,
    onlyUnread = false
  ): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
    const pool = getDbPool();

    let sql = `
      SELECT id, user_id, title, message, type, link, is_read, metadata, created_at, read_at
      FROM erp.notifications
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (onlyUnread) {
      sql += ` AND is_read = false`;
    }

    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const [listRes, countRes] = await Promise.all([
      pool.query(sql, params),
      pool.query(
        `SELECT COUNT(id) as unread_count 
         FROM erp.notifications 
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      ),
    ]);

    const notifications: NotificationDto[] = listRes.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      type: r.type as NotificationType,
      link: r.link,
      isRead: r.is_read,
      metadata: r.metadata,
      createdAt: r.created_at.toISOString(),
      readAt: r.read_at ? r.read_at.toISOString() : null,
    }));

    const unreadCount = Number(countRes.rows[0]?.unread_count || 0);

    return { notifications, unreadCount };
  }

  /**
   * Đánh dấu 1 thông báo đã đọc
   */
  static async markAsRead(id: string, userId: string): Promise<void> {
    const pool = getDbPool();
    await pool.query(
      `UPDATE erp.notifications 
       SET is_read = true, read_at = now() 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
  }

  /**
   * Đánh dấu toàn bộ thông báo đã đọc
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const pool = getDbPool();
    await pool.query(
      `UPDATE erp.notifications 
       SET is_read = true, read_at = now() 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }
}
