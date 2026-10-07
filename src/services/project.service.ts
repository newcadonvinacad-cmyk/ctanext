/**
 * DỊCH VỤ DỰ ÁN, ĐIỀU ĐỘ WBS, HIỆN TRƯỜNG GPS & ĐỘI XE (PROJECT & FLEET SERVICE)
 * Triển khai theo quy chuẩn M11, M12, M13, M14, M15 trong docs/DANH_SACH_MAN_HINH_HE_THONG.md
 * và ma trận phân quyền docs/MA_TRAN_PHAN_QUYEN_DONG.md
 */

import { getDbPool, getCachedOrgId } from "@/lib/db";
import { getNextDocumentCode } from "@/lib/sequences";
import { ScopeKind } from "@/types/iam";
import { NotificationService } from "@/services/notification.service";

// ==========================================
// ĐỊNH NGHĨA TYPES & DTOS
// ==========================================

export type ProjectStatus =
  | "planning"
  | "survey"
  | "production"
  | "transport"
  | "installation"
  | "acceptance"
  | "warranty"
  | "completed"
  | "cancelled";

export type TaskStatus =
  | "todo"
  | "doing"
  | "awaiting_acceptance"
  | "done"
  | "cancelled";

export interface ProjectDto {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string | null;
  dueDate: string | null;
  status: ProjectStatus;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string | null;
  managerMembershipId: string;
  managerName: string | null;
  templateVersionId: string | null;
  templateName: string | null;
  progressPercent: number;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  warrantyMonths?: number;
  warrantyUntil?: string | null;
  maintenanceNotes?: string | null;
}

export interface ProjectMemberDto {
  id: string;
  duty: string;
  validFrom: string;
  validTo: string | null;
  projectId: string;
  membershipId: string;
  employeeId: string | null;
  employeeCode: string | null;
  employeeName: string | null;
  employeePhone: string | null;
  userName: string | null;
}

export interface ProjectMaterialDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  unitCode: string;
  unitName: string;
  issuedQty: number;
  totalCost: number;
  documentsCount: number;
}

export interface ProjectFinancialSummaryDto {
  projectId: string;
  contractTotal: number;
  orders: Array<{ id: string; code: string; total: number; status: string }>;
  materialCost: number;
  disbursementsTotal: number;
  receiptsTotal: number;
  receivablesTotal: number;
  grossProfit: number;
  grossProfitMargin: number;
  budgetedCost: number;
  budgetedMaterialCost: number;
  budgetedLaborCost: number;
  budgetedOtherCost: number;
  budgetedMargin: number;
  actualTotalCost: number;
  costVariance: number;
  profitHealth: "excellent" | "good" | "warning" | "danger";
  profitHealthLabel: string;
  payments: Array<{
    id: string;
    code: string;
    direction: "receipt" | "disbursement";
    amount: number;
    status: string;
    purpose: string;
    paidAt: string | null;
    accountName?: string | null;
  }>;
}

export interface WorkReportDetailDto {
  id: string;
  taskId: string;
  taskTitle: string;
  taskCode: string;
  workDate: string;
  status: string;
  authorName: string;
  authorCode: string;
  workSummary: string;
  materialsList: Array<{ name: string; qty: string; checked: boolean }>;
  completionPercentage: number;
  submittedAt: string;
}

export interface TaskAssigneeDto {
  id: string;
  employeeId: string;
  code: string;
  name: string;
  phone: string | null;
}

export interface CreateWorkReportInput {
  taskId: string;
  projectId?: string;
  workDate?: string;
  notes?: string;
  speechText?: string;
  materials?: Array<{ name: string; qty: string; checked: boolean }>;
  answers?: Record<string, any>;
  completionPercentage?: number;
}

export interface WorkReportDto {
  id: string;
  taskId: string;
  workDate: string;
  status: string;
  answers: Record<string, any>;
  authorEmployeeId: string;
  submittedAt: string;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface TaskSafetyItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskPhotoEvidence {
  url: string;
  stage: "before" | "during" | "after_night" | "general";
  caption?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface TaskMaterialQuota {
  materialName: string;
  quantity: number;
  unit: string;
  actualQuantity?: number;
}

export interface WbsTaskDto {
  id: string;
  code: string;
  title: string;
  status: TaskStatus;
  dueAt: string | null;
  startAt?: string | null;
  isField?: boolean;
  weight: number;
  progressMode: "manual" | "children";
  progressPercent: number;
  projectId: string;
  parentId: string | null;
  assignees: TaskAssigneeDto[];
  children?: WbsTaskDto[];
  category?: string;
  checklist?: TaskChecklistItem[];
  safetyChecklist?: TaskSafetyItem[];
  photoEvidence?: TaskPhotoEvidence[];
  materialsQuota?: TaskMaterialQuota[];
  pieceRateType?: string;
  pieceRateAmount?: number;
  pieceRateUnit?: string;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
}

export interface TaskItemDto {
  id: string;
  code: string;
  title: string;
  status: TaskStatus;
  dueAt: string | null;
  startAt?: string | null;
  isField: boolean;
  weight: number;
  progressPercent: number;
  projectId: string;
  projectCode: string;
  projectName: string;
  stageId: string | null;
  stageCode: string | null;
  stageName: string | null;
  assignees: TaskAssigneeDto[];
  createdAt: string;
  category?: string;
  checklist?: TaskChecklistItem[];
  safetyChecklist?: TaskSafetyItem[];
  photoEvidence?: TaskPhotoEvidence[];
  materialsQuota?: TaskMaterialQuota[];
  pieceRateType?: string;
  pieceRateAmount?: number;
  pieceRateUnit?: string;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
}

export interface ProjectTemplateStage {
  name: string;
  tasks: {
    title: string;
    weight: number;
    mode: "manual" | "children";
  }[];
}

import { STANDARD_SIGNAGE_STAGES } from "@/constants/project-stages";
export { STANDARD_SIGNAGE_STAGES };

export interface ProjectTemplateDto {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  versionId: string;
  revisionNo: number;
  definition: {
    stages: ProjectTemplateStage[];
  };
  createdAt: string;
}

export interface FieldEventDto {
  id: string;
  type: "check_in" | "check_out";
  occurredAt: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  employeeId: string;
  employeeName: string;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
  distanceMeters?: number;
  isWithinRange?: boolean;
}

export interface AcceptanceDto {
  id: string;
  code: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "completed";
  acceptedAt: string | null;
  customerSignerName: string | null;
  projectId: string;
  projectName: string;
  customerName: string;
  signatureFileId: string | null;
  signatureData?: string | null;
  createdAt: string;
}

export interface VehicleDto {
  id: string;
  code: string;
  plateNo: string;
  isActive: boolean;
}

export interface TripDto {
  id: string;
  code: string;
  status: "draft" | "scheduled" | "dispatched" | "completed" | "cancelled";
  plannedDeparture: string | null;
  vehicleId: string;
  vehiclePlate: string;
  driverEmployeeId: string;
  driverName: string;
  projectId: string | null;
  projectName: string | null;
  stops: {
    id: string;
    sequence: number;
    address: string;
    arrivedAt: string | null;
    deliveryStatus: "pending" | "delivered" | "failed";
  }[];
  createdAt: string;
}

// ==========================================
// CÔNG THỨC HAVERSINE TÍNH KHOẢNG CÁCH GPS
// ==========================================
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// ==========================================
// PROJECT & FLEET SERVICE CLASS
// ==========================================
export class ProjectService {
  private static async getOrgId(): Promise<string> {
    return getCachedOrgId("SIGNAGE");
  }

  // ------------------------------------------
  // M11: DANH SÁCH DỰ ÁN & KANBAN
  // ------------------------------------------
  static async listProjects(
    filters?: {
      status?: string;
      search?: string;
      customerId?: string;
    },
    authContext?: {
      userId: string;
      scope?: ScopeKind;
    }
  ): Promise<ProjectDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.address,
        p.latitude,
        p.longitude,
        p.start_date,
        p.due_date,
        p.status,
        p.customer_id,
        pt.code as customer_code,
        pt.name as customer_name,
        pt.phone as customer_phone,
        p.manager_membership_id,
        u.name as manager_name,
        p.template_version_id,
        tpl.name as template_name,
        p.created_at,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
        COALESCE(
          AVG(t.progress_percent), 
          0
        ) as avg_progress
      FROM erp.projects p
      JOIN erp.partners pt ON pt.id = p.customer_id
      LEFT JOIN erp.memberships m ON m.id = p.manager_membership_id
      LEFT JOIN public."user" u ON u.id = m.user_id
      LEFT JOIN erp.project_template_versions ptv ON ptv.id = p.template_version_id
      LEFT JOIN erp.project_templates tpl ON tpl.id = ptv.template_id
      LEFT JOIN erp.tasks t ON t.project_id = p.id AND t.parent_id IS NULL
      WHERE p.organization_id = $1
    `;
    const params: any[] = [orgId];

    // IAM-SCOPE: Áp dụng ranh giới Scope (ORG vs ASSIGNED vs OWN)
    if (authContext?.userId && authContext?.scope && authContext.scope !== "ORG") {
      const uRes = await pool.query(
        `SELECT m.id as membership_id, e.id as employee_id 
         FROM erp.memberships m 
         LEFT JOIN erp.employees e ON e.membership_id = m.id 
         WHERE m.user_id = $1 AND m.organization_id = $2 
         LIMIT 1`,
        [authContext.userId, orgId]
      );

      const memId = uRes.rows[0]?.membership_id;
      const empId = uRes.rows[0]?.employee_id;

      if (!memId) {
        // Tài khoản không có membership hợp lệ thì trả danh sách rỗng
        return [];
      }

      if (authContext.scope === "ASSIGNED") {
        params.push(memId);
        const memIdx = params.length;
        params.push(authContext.userId);
        const userIdx = params.length;
        params.push(empId || "00000000-0000-0000-0000-000000000000");
        const empIdx = params.length;

        sql += ` AND (
          p.manager_membership_id = $${memIdx}
          OR p.created_by = $${userIdx}
          OR EXISTS (
            SELECT 1 FROM erp.project_members pm 
            WHERE pm.project_id = p.id AND pm.membership_id = $${memIdx} AND (pm.valid_to IS NULL OR pm.valid_to > now())
          )
          OR EXISTS (
            SELECT 1 FROM erp.tasks tsk 
            JOIN erp.task_assignees ta ON ta.task_id = tsk.id AND (ta.valid_to IS NULL OR ta.valid_to > now())
            WHERE tsk.project_id = p.id AND ta.employee_id = $${empIdx}
          )
        )`;
      } else if (authContext.scope === "OWN") {
        params.push(memId);
        const memIdx = params.length;
        params.push(authContext.userId);
        const userIdx = params.length;
        sql += ` AND (p.manager_membership_id = $${memIdx} OR p.created_by = $${userIdx})`;
      }
    }

    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND p.status = $${params.length}`;
    }
    if (filters?.customerId) {
      params.push(filters.customerId);
      sql += ` AND p.customer_id = $${params.length}`;
    }
    if (filters?.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (LOWER(p.name) LIKE $${params.length} OR LOWER(p.code) LIKE $${params.length} OR LOWER(pt.name) LIKE $${params.length})`;
    }

    sql += `
      GROUP BY p.id, pt.code, pt.name, pt.phone, u.name, tpl.name
      ORDER BY p.created_at DESC
    `;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      address: r.address,
      latitude: r.latitude ? Number(r.latitude) : null,
      longitude: r.longitude ? Number(r.longitude) : null,
      startDate: r.start_date ? new Date(r.start_date).toISOString().split("T")[0] : null,
      dueDate: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : null,
      status: r.status as ProjectStatus,
      customerId: r.customer_id,
      customerCode: r.customer_code,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      managerMembershipId: r.manager_membership_id,
      managerName: r.manager_name,
      templateVersionId: r.template_version_id,
      templateName: r.template_name,
      progressPercent: Math.round(Number(r.avg_progress) || 0),
      totalTasks: Number(r.total_tasks) || 0,
      completedTasks: Number(r.completed_tasks) || 0,
      createdAt: r.created_at.toISOString(),
    }));
  }

  // ------------------------------------------
  // M12: CHI TIẾT DỰ ÁN 360° (TRUY VẤN TRỰC TIẾP TỐI ƯU INDEX)
  // ------------------------------------------
  static async getProjectById(
    id: string,
    authContext?: { userId: string; scope?: ScopeKind }
  ): Promise<ProjectDto | null> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.address,
        p.latitude,
        p.longitude,
        p.start_date,
        p.due_date,
        p.status,
        p.customer_id,
        pt.code as customer_code,
        pt.name as customer_name,
        pt.phone as customer_phone,
        p.manager_membership_id,
        u.name as manager_name,
        p.template_version_id,
        tpl.name as template_name,
        p.created_at,
        p.warranty_months,
        p.warranty_until,
        p.maintenance_notes,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
        COALESCE(AVG(t.progress_percent), 0) as avg_progress
      FROM erp.projects p
      JOIN erp.partners pt ON pt.id = p.customer_id
      LEFT JOIN erp.memberships m ON m.id = p.manager_membership_id
      LEFT JOIN public."user" u ON u.id = m.user_id
      LEFT JOIN erp.project_template_versions ptv ON ptv.id = p.template_version_id
      LEFT JOIN erp.project_templates tpl ON tpl.id = ptv.template_id
      LEFT JOIN erp.tasks t ON t.project_id = p.id AND t.parent_id IS NULL
      WHERE p.organization_id = $1 AND p.id = $2
    `;
    const params: any[] = [orgId, id];

    if (authContext?.userId && authContext?.scope && authContext.scope !== "ORG") {
      const uRes = await pool.query(
        `SELECT m.id as membership_id, e.id as employee_id 
         FROM erp.memberships m 
         LEFT JOIN erp.employees e ON e.membership_id = m.id 
         WHERE m.user_id = $1 AND m.organization_id = $2 
         LIMIT 1`,
        [authContext.userId, orgId]
      );
      const memId = uRes.rows[0]?.membership_id;
      const empId = uRes.rows[0]?.employee_id;

      if (!memId) return null;

      if (authContext.scope === "ASSIGNED") {
        params.push(memId);
        const memIdx = params.length;
        params.push(authContext.userId);
        const userIdx = params.length;
        params.push(empId || "00000000-0000-0000-0000-000000000000");
        const empIdx = params.length;

        sql += ` AND (
          p.manager_membership_id = $${memIdx}
          OR p.created_by = $${userIdx}
          OR EXISTS (
            SELECT 1 FROM erp.project_members pm 
            WHERE pm.project_id = p.id AND pm.membership_id = $${memIdx} AND (pm.valid_to IS NULL OR pm.valid_to > now())
          )
          OR EXISTS (
            SELECT 1 FROM erp.tasks tsk 
            JOIN erp.task_assignees ta ON ta.task_id = tsk.id AND (ta.valid_to IS NULL OR ta.valid_to > now())
            WHERE tsk.project_id = p.id AND ta.employee_id = $${empIdx}
          )
        )`;
      } else if (authContext.scope === "OWN") {
        params.push(memId);
        const memIdx = params.length;
        params.push(authContext.userId);
        const userIdx = params.length;
        sql += ` AND (p.manager_membership_id = $${memIdx} OR p.created_by = $${userIdx})`;
      }
    }

    sql += `
      GROUP BY p.id, pt.code, pt.name, pt.phone, u.name, tpl.name, p.warranty_months, p.warranty_until, p.maintenance_notes
      LIMIT 1
    `;

    const res = await pool.query(sql, params);
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      address: r.address,
      latitude: r.latitude ? Number(r.latitude) : null,
      longitude: r.longitude ? Number(r.longitude) : null,
      startDate: r.start_date ? new Date(r.start_date).toISOString().split("T")[0] : null,
      dueDate: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : null,
      status: r.status as ProjectStatus,
      customerId: r.customer_id,
      customerCode: r.customer_code,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      managerMembershipId: r.manager_membership_id,
      managerName: r.manager_name,
      templateVersionId: r.template_version_id,
      templateName: r.template_name,
      progressPercent: Math.round(Number(r.avg_progress) || 0),
      totalTasks: Number(r.total_tasks) || 0,
      completedTasks: Number(r.completed_tasks) || 0,
      createdAt: r.created_at.toISOString(),
      warrantyMonths: r.warranty_months ? Number(r.warranty_months) : 12,
      warrantyUntil: r.warranty_until ? new Date(r.warranty_until).toISOString().split("T")[0] : null,
      maintenanceNotes: r.maintenance_notes || null,
    };
  }

  static async updateProjectStatus(id: string, status: ProjectStatus, userId: string): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    await pool.query(
      `UPDATE erp.projects 
       SET status = $1, updated_at = now(), updated_by = $2
       WHERE organization_id = $3 AND id = $4`,
      [status, userId, orgId, id]
    );

    // Phát thông báo Realtime tới Quản lý dự án (PM)
    try {
      const projRes = await pool.query(
        `SELECT code, name, manager_membership_id FROM erp.projects WHERE id = $1 LIMIT 1`,
        [id]
      );
      const proj = projRes.rows[0];
      if (proj?.manager_membership_id) {
        const mRes = await pool.query(
          `SELECT user_id FROM erp.memberships WHERE id = $1 LIMIT 1`,
          [proj.manager_membership_id]
        );
        const targetUserId = mRes.rows[0]?.user_id;
        if (targetUserId && targetUserId !== userId) {
          NotificationService.createNotification({
            userId: targetUserId,
            title: "Công trình chuyển giai đoạn",
            message: `Dự án "${proj.code} - ${proj.name}" vừa được chuyển sang giai đoạn [${status.toUpperCase()}]`,
            type: "project",
            link: `/du-an/${id}`,
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn("[NOTIFICATION] Lỗi gửi thông báo chuyển giai đoạn:", err);
    }
  }

  static async updateProjectDetails(
    id: string,
    data: {
      name?: string;
      address?: string;
      customerId?: string;
      startDate?: string;
      dueDate?: string;
      managerMembershipId?: string;
      latitude?: number;
      longitude?: number;
    },
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const updates: string[] = ["updated_at = now()", "updated_by = $1"];
    const params: any[] = [userId, orgId, id];

    if (data.name !== undefined) {
      params.push(data.name);
      updates.push(`name = $${params.length}`);
    }
    if (data.address !== undefined) {
      params.push(data.address);
      updates.push(`address = $${params.length}`);
    }
    if (data.customerId !== undefined) {
      params.push(data.customerId);
      updates.push(`customer_id = $${params.length}`);
    }
    if (data.startDate !== undefined) {
      params.push(data.startDate || null);
      updates.push(`start_date = $${params.length}`);
    }
    if (data.dueDate !== undefined) {
      params.push(data.dueDate || null);
      updates.push(`due_date = $${params.length}`);
    }
    if (data.managerMembershipId !== undefined) {
      params.push(data.managerMembershipId);
      updates.push(`manager_membership_id = $${params.length}`);
    }
    if (data.latitude !== undefined) {
      params.push(data.latitude || null);
      updates.push(`latitude = $${params.length}`);
    }
    if (data.longitude !== undefined) {
      params.push(data.longitude || null);
      updates.push(`longitude = $${params.length}`);
    }

    const sql = `UPDATE erp.projects SET ${updates.join(", ")} WHERE organization_id = $2 AND id = $3`;
    await pool.query(sql, params);
  }

  static async closeProject(id: string, status: "completed" | "cancelled", userId: string): Promise<void> {
    await this.updateProjectStatus(id, status, userId);
  }

  static async createProject(
    data: {
      code?: string;
      name: string;
      address: string;
      latitude?: number;
      longitude?: number;
      startDate?: string;
      dueDate?: string;
      customerId: string;
      managerMembershipId?: string;
      templateVersionId?: string;
      createCustomWorkflow?: boolean;
      customStages?: ProjectTemplateStage[];
    },
    userId: string
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    // Lấy default manager nếu chưa chọn
    let managerMemId = data.managerMembershipId;
    if (!managerMemId) {
      const memRes = await pool.query(
        "SELECT id FROM erp.memberships WHERE organization_id = $1 LIMIT 1",
        [orgId]
      );
      managerMemId = memRes.rows[0]?.id || null;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // DOC-01: Cấp mã dự án tuần tự nguyên tử chống trùng lặp đa luồng
      const code = data.code || (await getNextDocumentCode(client, orgId, "project", "DA"));

      const insertRes = await client.query(
        `INSERT INTO erp.projects (
           organization_id, code, name, address, latitude, longitude,
           start_date, due_date, status, customer_id, manager_membership_id,
           template_version_id, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'survey', $9, $10, $11, $12, $12)
         RETURNING id`,
        [
          orgId,
          code,
          data.name,
          data.address,
          data.latitude || null,
          data.longitude || null,
          data.startDate || null,
          data.dueDate || null,
          data.customerId,
          managerMemId,
          data.templateVersionId || null,
          userId,
        ]
      );
      const projectId = insertRes.rows[0].id;

      // Xác định danh sách stages WBS cần sinh cho dự án
      let stagesToCreate: ProjectTemplateStage[] | null = null;
      if (data.templateVersionId) {
        const verRes = await client.query(
          "SELECT definition FROM erp.project_template_versions WHERE organization_id = $1 AND id = $2",
          [orgId, data.templateVersionId]
        );
        if (verRes.rows.length > 0 && verRes.rows[0].definition?.stages) {
          stagesToCreate = verRes.rows[0].definition.stages;
        }
      } else if (data.customStages && data.customStages.length > 0) {
        stagesToCreate = data.customStages;
      } else if (data.createCustomWorkflow) {
        stagesToCreate = [
          {
            name: "Giai đoạn 1: Khảo sát hiện trường",
            tasks: [
              { title: "Khảo sát mặt bằng & đo đạc kích thước thực tế", weight: 5, mode: "manual" },
              { title: "Kiểm tra kết cấu chịu lực & đường nguồn điện", weight: 5, mode: "manual" },
            ],
          },
          {
            name: "Giai đoạn 2: Gia công sản xuất tại xưởng",
            tasks: [
              { title: "Hàn kết cấu khung sắt hộp / mạ kẽm", weight: 15, mode: "manual" },
              { title: "Cắt CNC tấm Alu & uốn chữ nổi", weight: 15, mode: "manual" },
              { title: "Gắn module LED & đấu nối nguồn 12V", weight: 15, mode: "manual" },
            ],
          },
          {
            name: "Giai đoạn 3: Vận chuyển & Điều xe",
            tasks: [
              { title: "Bốc xếp biển hiệu & vật tư lên xe chuyên dụng", weight: 5, mode: "manual" },
              { title: "Vận chuyển đến địa điểm thi công", weight: 5, mode: "manual" },
            ],
          },
          {
            name: "Giai đoạn 4: Thi công lắp dựng hiện trường",
            tasks: [
              { title: "Dựng giàn giáo & căng dây cảnh báo an toàn", weight: 10, mode: "manual" },
              { title: "Cẩu hạ & neo dầm bu-lông chịu lực", weight: 15, mode: "manual" },
              { title: "Đấu nối tủ điện & timer tự động", weight: 5, mode: "manual" },
            ],
          },
          {
            name: "Giai đoạn 5: Nghiệm thu & Bàn giao",
            tasks: [
              { title: "Test sáng toàn bộ hệ thống ngày & đêm", weight: 5, mode: "manual" },
              { title: "Ký biên bản nghiệm thu hoàn thành công trình", weight: 5, mode: "manual" },
            ],
          },
        ];
      }

      if (stagesToCreate && stagesToCreate.length > 0) {
        let stageIdx = 1;
        for (const stage of stagesToCreate) {
          const stageCode = `TK-${code}-${stageIdx}`;
          const pTaskRes = await client.query(
            `INSERT INTO erp.tasks (
               organization_id, code, title, status, weight, progress_mode,
               progress_percent, project_id, created_by, updated_by
             )
             VALUES ($1, $2, $3, 'todo', 10, 'children', 0, $4, $5, $5)
             RETURNING id`,
            [orgId, stageCode, stage.name, projectId, userId]
          );
          const parentTaskId = pTaskRes.rows[0].id;

          let subIdx = 1;
          for (const sub of (stage.tasks || [])) {
            const subCode = `${stageCode}-${subIdx}`;
            await client.query(
              `INSERT INTO erp.tasks (
                 organization_id, code, title, status, weight, progress_mode,
                 progress_percent, project_id, parent_id, created_by, updated_by
               )
               VALUES ($1, $2, $3, 'todo', $4, 'manual', 0, $5, $6, $7, $7)`,
              [orgId, subCode, sub.title, sub.weight || 1, projectId, parentTaskId, userId]
            );
            subIdx++;
          }
          stageIdx++;
        }
      }

      await client.query("COMMIT");
      return projectId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ------------------------------------------
  // CÂY CÔNG VIỆC WBS (CHA - CON)
  // ------------------------------------------
  static async listTasks(projectId: string): Promise<WbsTaskDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      SELECT 
        t.id,
        t.code,
        t.title,
        t.status,
        t.due_at,
        t.start_at,
        t.is_field,
        t.weight,
        t.progress_mode,
        t.progress_percent,
        t.project_id,
        t.parent_id,
        t.category,
        t.checklist,
        t.safety_checklist,
        t.photo_evidence,
        t.materials_quota,
        t.piece_rate_type,
        t.piece_rate_amount,
        t.piece_rate_unit,
        t.estimated_hours,
        t.actual_hours,
        t.notes,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ta.id,
              'employeeId', e.id,
              'code', e.code,
              'name', e.name,
              'phone', e.phone
            )
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) as assignees
      FROM erp.tasks t
      LEFT JOIN erp.task_assignees ta ON ta.task_id = t.id AND ta.valid_to IS NULL
      LEFT JOIN erp.employees e ON e.id = ta.employee_id
      WHERE t.organization_id = $1 AND t.project_id = $2
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `;

    const res = await pool.query(sql, [orgId, projectId]);
    const allTasks: WbsTaskDto[] = res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      status: r.status as TaskStatus,
      dueAt: r.due_at ? r.due_at.toISOString() : null,
      startAt: r.start_at ? r.start_at.toISOString() : null,
      isField: Boolean(r.is_field),
      weight: Number(r.weight) || 1,
      progressMode: r.progress_mode as "manual" | "children",
      progressPercent: Number(r.progress_percent) || 0,
      projectId: r.project_id,
      parentId: r.parent_id,
      assignees: r.assignees || [],
      category: r.category || "general",
      checklist: Array.isArray(r.checklist) ? r.checklist : [],
      safetyChecklist: Array.isArray(r.safety_checklist) ? r.safety_checklist : [],
      photoEvidence: Array.isArray(r.photo_evidence) ? r.photo_evidence : [],
      materialsQuota: Array.isArray(r.materials_quota) ? r.materials_quota : [],
      pieceRateType: r.piece_rate_type || "hourly",
      pieceRateAmount: Number(r.piece_rate_amount) || 0,
      pieceRateUnit: r.piece_rate_unit || "",
      estimatedHours: Number(r.estimated_hours) || 0,
      actualHours: Number(r.actual_hours) || 0,
      notes: r.notes || "",
    }));

    // Xây dựng cây phân cấp Cha - Con
    const roots: WbsTaskDto[] = [];
    const taskMap = new Map<string, WbsTaskDto>();

    for (const t of allTasks) {
      t.children = [];
      taskMap.set(t.id, t);
    }

    for (const t of allTasks) {
      if (t.parentId && taskMap.has(t.parentId)) {
        taskMap.get(t.parentId)!.children!.push(t);
      } else {
        roots.push(t);
      }
    }

    return roots;
  }

  private static async recalculateParentProgress(
    clientOrPool: any,
    orgId: string,
    parentId: string,
    userId: string
  ): Promise<void> {
    const siblingsRes = await clientOrPool.query(
      `SELECT progress_percent, weight, status FROM erp.tasks 
       WHERE organization_id = $1 AND parent_id = $2`,
      [orgId, parentId]
    );

    let totalWeight = 0;
    let weightedProgress = 0;
    let allDone = siblingsRes.rows.length > 0;
    let hasAwaitingAcceptance = false;

    for (const row of siblingsRes.rows) {
      const w = Number(row.weight) || 1;
      const p = Number(row.progress_percent) || 0;
      totalWeight += w;
      weightedProgress += p * w;
      if (row.status !== "done") allDone = false;
      if (row.status === "awaiting_acceptance") hasAwaitingAcceptance = true;
    }

    const parentProgress = allDone
      ? 100
      : totalWeight > 0
      ? Math.round(weightedProgress / totalWeight)
      : 0;
    const parentStatus = allDone
      ? "done"
      : hasAwaitingAcceptance && parentProgress >= 100
      ? "awaiting_acceptance"
      : parentProgress > 0
      ? "doing"
      : "todo";

    const updateParentRes = await clientOrPool.query(
      `UPDATE erp.tasks
       SET progress_percent = $1, status = $2, updated_at = now(), updated_by = $3
       WHERE organization_id = $4 AND id = $5
       RETURNING parent_id`,
      [parentProgress, parentStatus, userId, orgId, parentId]
    );

    // Lan truyền đệ quy lên tầng cha cao hơn (nếu có)
    if (updateParentRes.rows.length > 0 && updateParentRes.rows[0].parent_id) {
      await this.recalculateParentProgress(clientOrPool, orgId, updateParentRes.rows[0].parent_id, userId);
    }
  }

  static async updateTaskProgress(
    taskId: string,
    progressPercent: number,
    status: TaskStatus,
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Cập nhật task chỉ định
      const updateRes = await client.query(
        `UPDATE erp.tasks
         SET progress_percent = $1, status = $2, updated_at = now(), updated_by = $3
         WHERE organization_id = $4 AND id = $5
         RETURNING parent_id, project_id`,
        [progressPercent, status, userId, orgId, taskId]
      );

      if (updateRes.rows.length === 0) throw new Error("Không tìm thấy công việc");
      const parentId = updateRes.rows[0].parent_id;
      const projectId = updateRes.rows[0].project_id;

      // NẾU HOÀN THÀNH ĐẦU VIỆC CHÍNH (status === 'done' hoặc progressPercent >= 100):
      // Tự động hoàn thành tất cả các đầu việc con trực thuộc đệ quy (cascade down)
      if (status === "done" || progressPercent >= 100) {
        await client.query(
          `WITH RECURSIVE subtasks AS (
             SELECT id FROM erp.tasks WHERE organization_id = $1 AND parent_id = $2
             UNION ALL
             SELECT t.id FROM erp.tasks t
             INNER JOIN subtasks s ON t.parent_id = s.id
             WHERE t.organization_id = $1
           )
           UPDATE erp.tasks
           SET status = 'done', progress_percent = 100, updated_at = now(), updated_by = $3
           WHERE organization_id = $1 AND id IN (SELECT id FROM subtasks)`,
          [orgId, taskId, userId]
        );
      }

      // Nếu có task cha, tự động tính lại tiến độ của cha
      if (parentId) {
        await this.recalculateParentProgress(client, orgId, parentId, userId);
      }

      // Cập nhật timestamp cập nhật dự án đồng bộ
      if (projectId) {
        await client.query(
          `UPDATE erp.projects
           SET updated_at = now(),
               updated_by = $1
           WHERE id = $2 AND organization_id = $3`,
          [userId, projectId, orgId]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async createTopLevelStage(
    projectId: string,
    title: string,
    userId: string,
    options?: {
      weight?: number;
      dueAt?: string | null;
      startAt?: string | null;
      isField?: boolean;
      assigneeIds?: string[];
    }
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const pRes = await client.query(
        "SELECT code FROM erp.projects WHERE organization_id = $1 AND id = $2",
        [orgId, projectId]
      );
      if (pRes.rows.length === 0) throw new Error("Không tìm thấy dự án");
      const pCode = pRes.rows[0].code;

      const countRes = await client.query(
        "SELECT COUNT(*) as count FROM erp.tasks WHERE organization_id = $1 AND project_id = $2 AND parent_id IS NULL",
        [orgId, projectId]
      );
      const stageIdx = Number(countRes.rows[0].count) + 1;
      const stageCode = `TK-${pCode}-${stageIdx}`;

      const weight = options?.weight !== undefined ? options.weight : 10;
      const dueAt = options?.dueAt || null;
      const startAt = options?.startAt || null;
      const isField = Boolean(options?.isField);

      const insertRes = await client.query(
        `INSERT INTO erp.tasks (
           organization_id, code, title, status, weight, progress_mode,
           progress_percent, project_id, parent_id, due_at, start_at, is_field, created_by, updated_by
         )
         VALUES ($1, $2, $3, 'todo', $4, 'children', 0, $5, null, $6, $7, $8, $9, $9)
         RETURNING id`,
        [orgId, stageCode, title, weight, projectId, dueAt, startAt, isField, userId]
      );
      const taskId = insertRes.rows[0].id;

      if (options?.assigneeIds && options.assigneeIds.length > 0) {
        for (const empId of options.assigneeIds) {
          if (!empId) continue;
          await client.query(
            `INSERT INTO erp.task_assignees (
               organization_id, task_id, employee_id, valid_from, created_by, updated_by
             )
             VALUES ($1, $2, $3, now(), $4, $4)`,
            [orgId, taskId, empId, userId]
          );
        }
      }

      await client.query("COMMIT");
      return taskId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateTaskDetails(
    taskId: string,
    data: {
      title?: string;
      weight?: number;
      dueAt?: string | null;
      startAt?: string | null;
      isField?: boolean;
      category?: string;
      checklist?: TaskChecklistItem[];
      safetyChecklist?: TaskSafetyItem[];
      photoEvidence?: TaskPhotoEvidence[];
      materialsQuota?: TaskMaterialQuota[];
      pieceRateType?: string;
      pieceRateAmount?: number;
      pieceRateUnit?: string;
      estimatedHours?: number;
      actualHours?: number;
      notes?: string;
    },
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const updates: string[] = ["updated_at = now()", "updated_by = $1"];
    const params: any[] = [userId, orgId, taskId];

    if (data.title !== undefined) {
      params.push(data.title);
      updates.push(`title = $${params.length}`);
    }
    if (data.weight !== undefined) {
      params.push(data.weight);
      updates.push(`weight = $${params.length}`);
    }
    if (data.dueAt !== undefined) {
      params.push(data.dueAt || null);
      updates.push(`due_at = $${params.length}`);
    }
    if (data.startAt !== undefined) {
      params.push(data.startAt || null);
      updates.push(`start_at = $${params.length}`);
    }
    if (data.isField !== undefined) {
      params.push(Boolean(data.isField));
      updates.push(`is_field = $${params.length}`);
    }
    if (data.category !== undefined) {
      params.push(data.category);
      updates.push(`category = $${params.length}`);
    }
    if (data.checklist !== undefined) {
      params.push(JSON.stringify(data.checklist));
      updates.push(`checklist = $${params.length}::jsonb`);
    }
    if (data.safetyChecklist !== undefined) {
      params.push(JSON.stringify(data.safetyChecklist));
      updates.push(`safety_checklist = $${params.length}::jsonb`);
    }
    if (data.photoEvidence !== undefined) {
      params.push(JSON.stringify(data.photoEvidence));
      updates.push(`photo_evidence = $${params.length}::jsonb`);
    }
    if (data.materialsQuota !== undefined) {
      params.push(JSON.stringify(data.materialsQuota));
      updates.push(`materials_quota = $${params.length}::jsonb`);
    }
    if (data.pieceRateType !== undefined) {
      params.push(data.pieceRateType);
      updates.push(`piece_rate_type = $${params.length}`);
    }
    if (data.pieceRateAmount !== undefined) {
      params.push(Number(data.pieceRateAmount) || 0);
      updates.push(`piece_rate_amount = $${params.length}`);
    }
    if (data.pieceRateUnit !== undefined) {
      params.push(data.pieceRateUnit);
      updates.push(`piece_rate_unit = $${params.length}`);
    }
    if (data.estimatedHours !== undefined) {
      params.push(Number(data.estimatedHours) || 0);
      updates.push(`estimated_hours = $${params.length}`);
    }
    if (data.actualHours !== undefined) {
      params.push(Number(data.actualHours) || 0);
      updates.push(`actual_hours = $${params.length}`);
    }
    if (data.notes !== undefined) {
      params.push(data.notes);
      updates.push(`notes = $${params.length}`);
    }

    const sql = `UPDATE erp.tasks SET ${updates.join(", ")} WHERE organization_id = $2 AND id = $3 RETURNING parent_id`;
    const res = await pool.query(sql, params);
    if (res.rows.length === 0) throw new Error("Không tìm thấy đầu việc");

    const parentId = res.rows[0].parent_id;
    if (parentId && data.weight !== undefined) {
      await this.recalculateParentProgress(pool, orgId, parentId, userId);
    }
  }

  static async deleteTask(taskId: string, userId: string): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const subRes = await client.query(
        "SELECT COUNT(*) as count FROM erp.tasks WHERE organization_id = $1 AND parent_id = $2",
        [orgId, taskId]
      );
      if (Number(subRes.rows[0].count) > 0) {
        throw new Error("Không thể xóa giai đoạn đang có công việc con");
      }

      const repRes = await client.query(
        "SELECT COUNT(*) as count FROM erp.work_reports WHERE organization_id = $1 AND task_id = $2",
        [orgId, taskId]
      );
      if (Number(repRes.rows[0].count) > 0) {
        throw new Error("Không thể xóa công việc đã có báo cáo hiện trường phát sinh");
      }

      const tRes = await client.query(
        "SELECT parent_id FROM erp.tasks WHERE organization_id = $1 AND id = $2",
        [orgId, taskId]
      );
      if (tRes.rows.length === 0) throw new Error("Không tìm thấy công việc");
      const parentId = tRes.rows[0].parent_id;

      await client.query(
        "DELETE FROM erp.task_assignees WHERE organization_id = $1 AND task_id = $2",
        [orgId, taskId]
      );
      await client.query(
        "DELETE FROM erp.tasks WHERE organization_id = $1 AND id = $2",
        [orgId, taskId]
      );

      if (parentId) {
        await this.recalculateParentProgress(client, orgId, parentId, userId);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ------------------------------------------
  // DANH SÁCH NHÂN SỰ & PHÂN CÔNG ĐẦU VIỆC (M11 / M12)
  // ------------------------------------------
  static async listEmployees(): Promise<{ id: string; code: string; name: string; phone: string | null; membershipId: string | null }[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `SELECT id, code, name, phone, membership_id
       FROM erp.employees 
       WHERE organization_id = $1 AND is_active = true 
       ORDER BY name ASC`,
      [orgId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      phone: r.phone,
      membershipId: r.membership_id || null,
    }));
  }

  static async isUserAssigneeOfTask(taskId: string, userId: string): Promise<boolean> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const res = await pool.query(
      `SELECT 1 
       FROM erp.task_assignees ta
       JOIN erp.employees e ON e.id = ta.employee_id
       JOIN erp.memberships m ON m.id = e.membership_id
       WHERE ta.organization_id = $1 
         AND (ta.task_id = $2 OR ta.task_id = (SELECT parent_id FROM erp.tasks WHERE id = $2 AND organization_id = $1))
         AND m.user_id = $3 
         AND ta.valid_to IS NULL
       LIMIT 1`,
      [orgId, taskId, userId]
    );
    return res.rows.length > 0;
  }

  static async setTaskAssignees(
    taskId: string,
    employeeIds: string[],
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Đóng tất cả phân công đang active hiện tại của công việc này
      await client.query(
        `UPDATE erp.task_assignees
         SET valid_to = now(), updated_at = now(), updated_by = $1
         WHERE organization_id = $2 AND task_id = $3 AND valid_to IS NULL`,
        [userId, orgId, taskId]
      );

      // Thêm danh sách phân công mới
      if (employeeIds && employeeIds.length > 0) {
        for (const empId of employeeIds) {
          if (!empId) continue;
          await client.query(
            `INSERT INTO erp.task_assignees (
               organization_id, task_id, employee_id, valid_from, created_by, updated_by
             )
             VALUES ($1, $2, $3, now(), $4, $4)`,
            [orgId, taskId, empId, userId]
          );
        }
      }
      await client.query("COMMIT");

      // Gửi thông báo Realtime cho các nhân sự vừa được phân công
      if (employeeIds && employeeIds.length > 0) {
        try {
          const taskInfoRes = await pool.query(
            `SELECT t.title, t.project_id, p.name as project_name 
             FROM erp.tasks t 
             JOIN erp.projects p ON p.id = t.project_id 
             WHERE t.id = $1 LIMIT 1`,
            [taskId]
          );
          const taskInfo = taskInfoRes.rows[0];
          const userRes = await pool.query(
            `SELECT m.user_id 
             FROM erp.employees e 
             JOIN erp.memberships m ON m.id = e.membership_id 
             WHERE e.id = ANY($1::uuid[]) AND m.user_id IS NOT NULL`,
            [employeeIds]
          );
          for (const uRow of userRes.rows) {
            if (uRow.user_id !== userId) {
              NotificationService.createNotification({
                userId: uRow.user_id,
                title: "Phân công công việc mới",
                message: `Bạn được giao công việc "${taskInfo?.title || "Công việc"}" trong dự án "${taskInfo?.project_name || "Công trình"}"`,
                type: "task",
                link: `/du-an/${taskInfo?.project_id}?tab=wbs`,
              }).catch(() => {});
            }
          }
        } catch (notifErr) {
          console.warn("[NOTIFICATION] Lỗi gửi thông báo phân công:", notifErr);
        }
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async setTaskAssignee(
    taskId: string,
    employeeId: string | null,
    userId: string
  ): Promise<void> {
    await this.setTaskAssignees(taskId, employeeId ? [employeeId] : [], userId);
  }

  static async createTask(
    data: {
      projectId: string;
      parentId?: string;
      title: string;
      weight?: number;
      dueAt?: string | null;
      startAt?: string | null;
      isField?: boolean;
      employeeId?: string;
      assigneeIds?: string[];
    },
    userId: string
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const pRes = await client.query(
        "SELECT code FROM erp.projects WHERE organization_id = $1 AND id = $2",
        [orgId, data.projectId]
      );
      if (pRes.rows.length === 0) throw new Error("Không tìm thấy dự án");
      const pCode = pRes.rows[0].code;

      const countRes = await client.query(
        "SELECT COUNT(*) as count FROM erp.tasks WHERE organization_id = $1 AND project_id = $2",
        [orgId, data.projectId]
      );
      const taskCount = Number(countRes.rows[0].count) + 1;
      const taskCode = `TK-${pCode}-${taskCount}`;

      const insertRes = await client.query(
        `INSERT INTO erp.tasks (
           organization_id, code, title, status, weight, progress_mode,
           progress_percent, project_id, parent_id, due_at, start_at, is_field, created_by, updated_by
         )
         VALUES ($1, $2, $3, 'todo', $4, 'manual', 0, $5, $6, $7, $8, $9, $10, $10)
         RETURNING id`,
        [
          orgId,
          taskCode,
          data.title,
          data.weight || 1,
          data.projectId,
          data.parentId || null,
          data.dueAt || null,
          data.startAt || null,
          Boolean(data.isField),
          userId,
        ]
      );
      const taskId = insertRes.rows[0].id;

      // Phân công nhiều nhân sự nếu có
      const assigneesToInsert = data.assigneeIds && data.assigneeIds.length > 0
        ? data.assigneeIds
        : data.employeeId
        ? [data.employeeId]
        : [];

      for (const empId of assigneesToInsert) {
        if (!empId) continue;
        await client.query(
          `INSERT INTO erp.task_assignees (
             organization_id, task_id, employee_id, valid_from, created_by, updated_by
           )
           VALUES ($1, $2, $3, now(), $4, $4)`,
          [orgId, taskId, empId, userId]
        );
      }

      await client.query("COMMIT");
      return taskId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async listAllTasks(
    filters?: {
      projectId?: string;
      status?: string;
      employeeId?: string;
      search?: string;
      isField?: boolean;
    },
    authContext?: {
      userId: string;
      scope?: ScopeKind;
    }
  ): Promise<TaskItemDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        t.id,
        t.code,
        t.title,
        t.status,
        t.due_at,
        t.start_at,
        t.is_field,
        t.weight,
        t.progress_percent,
        t.created_at,
        t.category,
        t.checklist,
        t.safety_checklist,
        t.photo_evidence,
        t.materials_quota,
        t.piece_rate_type,
        t.piece_rate_amount,
        t.piece_rate_unit,
        t.estimated_hours,
        t.actual_hours,
        t.notes,
        p.id as project_id,
        p.code as project_code,
        p.name as project_name,
        pt.id as stage_id,
        pt.code as stage_code,
        pt.title as stage_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ta.id,
              'employeeId', e.id,
              'code', e.code,
              'name', e.name,
              'phone', e.phone
            )
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) as assignees
      FROM erp.tasks t
      JOIN erp.projects p ON p.id = t.project_id
      LEFT JOIN erp.tasks pt ON pt.id = t.parent_id
      LEFT JOIN erp.task_assignees ta ON ta.task_id = t.id AND ta.valid_to IS NULL
      LEFT JOIN erp.employees e ON e.id = ta.employee_id
      WHERE t.organization_id = $1
        AND (t.parent_id IS NOT NULL OR t.progress_mode = 'manual')
    `;
    const params: any[] = [orgId];

    // IAM-SCOPE LỌC CÔNG VIỆC: Nếu không phải ORG, lọc theo quyền
    if (authContext?.userId && authContext?.scope && authContext.scope !== "ORG") {
      const uRes = await pool.query(
        `SELECT m.id as membership_id, e.id as employee_id 
         FROM erp.memberships m 
         LEFT JOIN erp.employees e ON e.membership_id = m.id 
         WHERE m.user_id = $1 AND m.organization_id = $2 
         LIMIT 1`,
        [authContext.userId, orgId]
      );
      const memId = uRes.rows[0]?.membership_id;
      const empId = uRes.rows[0]?.employee_id;

      if (!memId) return [];

      params.push(memId);
      const memIdx = params.length;
      params.push(empId || "00000000-0000-0000-0000-000000000000");
      const empIdx = params.length;
      params.push(authContext.userId);
      const userIdx = params.length;

      sql += ` AND (
        p.manager_membership_id = $${memIdx}
        OR ta.employee_id = $${empIdx}
        OR t.created_by = $${userIdx}
        OR EXISTS (
          SELECT 1 FROM erp.project_members pm 
          WHERE pm.project_id = p.id AND pm.membership_id = $${memIdx} AND (pm.valid_to IS NULL OR pm.valid_to > now())
        )
      )`;
    }

    if (filters?.projectId && filters.projectId !== "all") {
      params.push(filters.projectId);
      sql += ` AND p.id = $${params.length}`;
    }
    if (filters?.status && filters.status !== "all") {
      params.push(filters.status);
      sql += ` AND t.status = $${params.length}`;
    }
    if (filters?.employeeId && filters.employeeId !== "all") {
      if (filters.employeeId === "unassigned") {
        sql += ` AND ta.id IS NULL`;
      } else {
        params.push(filters.employeeId);
        sql += ` AND ta.employee_id = $${params.length}`;
      }
    }
    if (filters?.isField !== undefined) {
      params.push(filters.isField);
      sql += ` AND t.is_field = $${params.length}`;
    }
    if (filters?.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (LOWER(t.title) LIKE $${params.length} OR LOWER(t.code) LIKE $${params.length} OR LOWER(p.name) LIKE $${params.length} OR LOWER(p.code) LIKE $${params.length})`;
    }

    sql += `
      GROUP BY t.id, p.id, pt.id
      ORDER BY 
        CASE 
          WHEN t.status = 'doing' THEN 1 
          WHEN t.status = 'awaiting_acceptance' THEN 2 
          WHEN t.status = 'todo' THEN 3 
          ELSE 4 
        END,
        t.due_at ASC NULLS LAST,
        t.created_at DESC
    `;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      status: r.status as TaskStatus,
      dueAt: r.due_at ? r.due_at.toISOString().split("T")[0] : null,
      startAt: r.start_at ? r.start_at.toISOString() : null,
      isField: Boolean(r.is_field),
      weight: Number(r.weight) || 1,
      progressPercent: Number(r.progress_percent) || 0,
      projectId: r.project_id,
      projectCode: r.project_code,
      projectName: r.project_name,
      stageId: r.stage_id,
      stageCode: r.stage_code,
      stageName: r.stage_name,
      assignees: r.assignees || [],
      createdAt: r.created_at.toISOString(),
      category: r.category || "general",
      checklist: Array.isArray(r.checklist) ? r.checklist : [],
      safetyChecklist: Array.isArray(r.safety_checklist) ? r.safety_checklist : [],
      photoEvidence: Array.isArray(r.photo_evidence) ? r.photo_evidence : [],
      materialsQuota: Array.isArray(r.materials_quota) ? r.materials_quota : [],
      pieceRateType: r.piece_rate_type || "hourly",
      pieceRateAmount: Number(r.piece_rate_amount) || 0,
      pieceRateUnit: r.piece_rate_unit || "",
      estimatedHours: Number(r.estimated_hours) || 0,
      actualHours: Number(r.actual_hours) || 0,
      notes: r.notes || "",
    }));
  }

  // ------------------------------------------
  // M13: THƯ VIỆN MẪU DỰ ÁN (TEMPLATES)
  // ------------------------------------------
  static async listTemplates(): Promise<ProjectTemplateDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      SELECT DISTINCT ON (tpl.id)
        tpl.id,
        tpl.code,
        tpl.name,
        tpl.is_active,
        tpl.created_at,
        ptv.id as version_id,
        ptv.revision_no,
        ptv.definition
      FROM erp.project_templates tpl
      JOIN erp.project_template_versions ptv ON ptv.template_id = tpl.id
      WHERE tpl.organization_id = $1 AND tpl.is_active = true
      ORDER BY tpl.id, ptv.revision_no DESC
    `;

    const res = await pool.query(sql, [orgId]);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: r.is_active,
      versionId: r.version_id,
      revisionNo: r.revision_no,
      definition: r.definition,
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async createTemplate(
    data: {
      code: string;
      name: string;
      definition: {
        stages: ProjectTemplateStage[];
      };
    },
    userId: string
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
      await client.query(`SELECT set_config('app.organization_id', $1, true)`, [orgId]);

      const code = data.code.trim().toUpperCase();
      const checkRes = await client.query(
        "SELECT id FROM erp.project_templates WHERE organization_id = $1 AND code = $2",
        [orgId, code]
      );
      if (checkRes.rows.length > 0) {
        throw new Error(`Mã mẫu quy trình [${code}] đã tồn tại trong hệ thống!`);
      }

      const tplRes = await client.query(
        `INSERT INTO erp.project_templates (organization_id, code, name, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $4)
         RETURNING id`,
        [orgId, code, data.name.trim(), userId]
      );
      const templateId = tplRes.rows[0].id;

      await client.query(
        `INSERT INTO erp.project_template_versions (
           organization_id, template_id, revision_no, definition, published_at, created_by, updated_by
         )
         VALUES ($1, $2, 1, $3, now(), $4, $4)`,
        [orgId, templateId, JSON.stringify(data.definition), userId]
      );

      await client.query("COMMIT");
      return templateId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateTemplate(
    id: string,
    data: {
      name?: string;
      definition?: {
        stages: ProjectTemplateStage[];
      };
    },
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
      await client.query(`SELECT set_config('app.organization_id', $1, true)`, [orgId]);

      if (data.name) {
        await client.query(
          `UPDATE erp.project_templates SET name = $1, updated_by = $2, updated_at = now()
           WHERE organization_id = $3 AND id = $4`,
          [data.name.trim(), userId, orgId, id]
        );
      }

      if (data.definition) {
        const revRes = await client.query(
          `SELECT COALESCE(MAX(revision_no), 0) as max_rev FROM erp.project_template_versions
           WHERE organization_id = $1 AND template_id = $2`,
          [orgId, id]
        );
        const nextRev = (revRes.rows[0]?.max_rev || 0) + 1;

        await client.query(
          `INSERT INTO erp.project_template_versions (
             organization_id, template_id, revision_no, definition, published_at, created_by, updated_by
           )
           VALUES ($1, $2, $3, $4, now(), $5, $5)`,
          [orgId, id, nextRev, JSON.stringify(data.definition), userId]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async deleteTemplate(id: string): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    await pool.query(
      `UPDATE erp.project_templates SET is_active = false, updated_at = now()
       WHERE organization_id = $1 AND id = $2`,
      [orgId, id]
    );
  }

  // ------------------------------------------
  // M14: TÁC NGHIỆP HIỆN TRƯỜNG & CHẤM CÔNG GPS
  // ------------------------------------------
  static async recordFieldEvent(
    data: {
      type: "check_in" | "check_out";
      latitude: number;
      longitude: number;
      accuracyM: number;
      employeeId: string;
      projectId?: string;
      taskId?: string;
    },
    userId: string
  ): Promise<FieldEventDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let distanceMeters: number | undefined = undefined;
    let isWithinRange: boolean | undefined = undefined;

    // Đối soát tọa độ nếu có projectId
    if (data.projectId) {
      const projRes = await pool.query(
        "SELECT latitude, longitude FROM erp.projects WHERE organization_id = $1 AND id = $2",
        [orgId, data.projectId]
      );
      if (projRes.rows.length > 0 && projRes.rows[0].latitude && projRes.rows[0].longitude) {
        const pLat = Number(projRes.rows[0].latitude);
        const pLon = Number(projRes.rows[0].longitude);
        distanceMeters = calculateDistanceMeters(data.latitude, data.longitude, pLat, pLon);
        // Bán kính cho phép là 500m (hoặc cộng thêm sai số định vị accuracyM)
        isWithinRange = distanceMeters <= Math.max(500, data.accuracyM * 2);
      }
    }

    const clientReqId = crypto.randomUUID();
    const res = await pool.query(
      `INSERT INTO erp.field_events (
         organization_id, type, occurred_at, latitude, longitude,
         accuracy_m, client_request_id, employee_id, task_id, project_id,
         created_by
       )
       VALUES ($1, $2, now(), $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, occurred_at`,
      [
        orgId,
        data.type,
        data.latitude,
        data.longitude,
        data.accuracyM,
        clientReqId,
        data.employeeId,
        data.taskId || null,
        data.projectId || null,
        userId,
      ]
    );

    // Tự động chuyển trạng thái công việc sang 'doing' khi check-in hiện trường
    if (data.type === "check_in" && data.taskId) {
      try {
        await pool.query(
          `UPDATE erp.tasks
           SET status = 'doing', updated_at = now(), updated_by = $1
           WHERE organization_id = $2 AND id = $3 AND status = 'todo'`,
          [userId, orgId, data.taskId]
        );
      } catch {
        // Non-blocking
      }
    }

    return {
      id: res.rows[0].id,
      type: data.type,
      occurredAt: res.rows[0].occurred_at.toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyM: data.accuracyM,
      employeeId: data.employeeId,
      employeeName: "",
      projectId: data.projectId || null,
      projectName: null,
      taskId: data.taskId || null,
      taskTitle: null,
      distanceMeters,
      isWithinRange,
    };
  }

  static async getMyTasks(employeeId: string, options?: { fieldOnly?: boolean }): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        t.id,
        t.code,
        t.title,
        t.status,
        t.due_at,
        t.start_at,
        t.is_field,
        t.progress_percent,
        p.id as project_id,
        p.code as project_code,
        p.name as project_name,
        p.address as project_address,
        p.latitude as project_lat,
        p.longitude as project_lon
      FROM erp.tasks t
      JOIN erp.projects p ON p.id = t.project_id
      JOIN erp.task_assignees ta ON ta.task_id = t.id AND ta.valid_to IS NULL
      WHERE t.organization_id = $1 AND ta.employee_id = $2
    `;

    // QUY TẮC HIỆN TRƯỜNG: Phải là việc hiện trường (is_field = true) VÀ có lịch hẹn (due_at IS NOT NULL)
    if (options?.fieldOnly) {
      sql += ` AND t.is_field = true AND t.due_at IS NOT NULL`;
    }

    sql += `
      ORDER BY 
        CASE 
          WHEN t.status = 'doing' THEN 1 
          WHEN t.status = 'awaiting_acceptance' THEN 2 
          WHEN t.status = 'todo' THEN 3 
          ELSE 4 
        END,
        t.due_at ASC NULLS LAST
    `;

    const res = await pool.query(sql, [orgId, employeeId]);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      status: r.status,
      dueAt: r.due_at ? r.due_at.toISOString() : null,
      startAt: r.start_at ? r.start_at.toISOString() : null,
      isField: Boolean(r.is_field),
      progressPercent: Number(r.progress_percent) || 0,
      projectId: r.project_id,
      projectCode: r.project_code,
      projectName: r.project_name,
      projectAddress: r.project_address,
      projectLat: r.project_lat ? Number(r.project_lat) : null,
      projectLon: r.project_lon ? Number(r.project_lon) : null,
    }));
  }

  // ------------------------------------------
  // BÁO CÁO CÔNG VIỆC HIỆN TRƯỜNG & VẬT TƯ (M14)
  // ------------------------------------------
  static async createWorkReport(
    input: CreateWorkReportInput,
    userId: string
  ): Promise<WorkReportDto> {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orgId = await this.getOrgId();
      console.log("[createWorkReport] using orgId:", orgId);

      await client.query(
        "SELECT set_config('app.organization_id', $1, true), set_config('app.current_user_id', $2, true)",
        [orgId, userId]
      );

      // 1. Resolve employee id for user
      const empRes = await client.query(
        `SELECT e.id FROM erp.employees e
         JOIN erp.memberships m ON m.id = e.membership_id
         WHERE m.user_id = $1 AND e.organization_id = $2
         LIMIT 1`,
        [userId, orgId]
      );
      let employeeId = empRes.rows[0]?.id;
      if (!employeeId) {
        const anyEmp = await client.query(
          "SELECT id FROM erp.employees WHERE organization_id = $1 LIMIT 1",
          [orgId]
        );
        employeeId = anyEmp.rows[0]?.id;
      }

      // 2. Resolve template version
      const tplVerRes = await client.query(
        `SELECT id FROM erp.report_template_versions 
         WHERE organization_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [orgId]
      );
      let templateVerId = tplVerRes.rows[0]?.id;

      if (!templateVerId) {
        // Create default template & version
        const tplRes = await client.query(
          `INSERT INTO erp.report_templates (organization_id, code, name, task_kind, created_by, updated_by)
           VALUES ($1, 'FIELD_DAILY', 'Nhật ký thi công hiện trường', 'field_daily', $2, $2)
           ON CONFLICT (organization_id, code) DO UPDATE SET updated_at = now()
           RETURNING id`,
          [orgId, userId]
        );
        const tplId = tplRes.rows[0].id;

        const newVerRes = await client.query(
          `INSERT INTO erp.report_template_versions (organization_id, template_id, revision_no, schema_json, published_at, created_by, updated_by)
           VALUES ($1, $2, 1, '{"fields": ["work_summary", "tasks_completed", "materials_used", "obstacles"]}', now(), $3, $3)
           ON CONFLICT (organization_id, template_id, revision_no) DO UPDATE SET updated_at = now()
           RETURNING id`,
          [orgId, tplId, userId]
        );
        templateVerId = newVerRes.rows[0].id;
      }

      // 3. Assemble answers
      const answers: Record<string, any> = {
        ...(input.answers || {}),
        work_summary: input.speechText || input.notes || "Báo cáo công việc hiện trường",
        materials_checklist: input.materials || [],
        completion_percentage: input.completionPercentage ?? 100,
        reported_at: new Date().toISOString(),
      };

      const clientReqId = crypto.randomUUID();
      const workDate = input.workDate || new Date().toISOString().split("T")[0];

      const reportRes = await client.query(
        `INSERT INTO erp.work_reports (
           organization_id, work_date, answers, status, submitted_at, client_request_id,
           task_id, author_employee_id, template_version_id, created_by, updated_by
         )
         VALUES ($1, $2, $3, 'submitted', now(), $4, $5, $6, $7, $8, $8)
         RETURNING id, status, submitted_at`,
        [
          orgId,
          workDate,
          JSON.stringify(answers),
          clientReqId,
          input.taskId,
          employeeId,
          templateVerId,
          userId,
        ]
      );
      const report = reportRes.rows[0];

      // 4. Update task progress & status if applicable
      const newProgress = Math.min(100, Math.max(0, input.completionPercentage ?? 80));

      const updateTaskRes = await client.query(
        `UPDATE erp.tasks 
         SET progress_percent = GREATEST(progress_percent, $1),
             status = CASE WHEN $1 >= 100 THEN 'awaiting_acceptance' WHEN status = 'todo' THEN 'doing' ELSE status END,
             updated_at = now(),
             updated_by = $2
         WHERE id = $3 AND organization_id = $4
         RETURNING id, code, progress_percent, status`,
        [newProgress, userId, input.taskId, orgId]
      );
      console.log("[createWorkReport] inserted report:", report.id, "updated task:", updateTaskRes.rows[0]);

      // Đồng bộ tiến độ dự án nếu có projectId
      if (input.projectId) {
        try {
          const avgRes = await client.query(
            `SELECT COALESCE(AVG(progress_percent), 0)::int as avg_progress 
             FROM erp.tasks 
             WHERE project_id = $1 AND organization_id = $2`,
            [input.projectId, orgId]
          );
          const avgProgress = avgRes.rows[0]?.avg_progress || newProgress;
          await client.query(
            `UPDATE erp.projects 
             SET progress_percent = $1, updated_at = now(), updated_by = $2 
             WHERE id = $3 AND organization_id = $4`,
            [avgProgress, userId, input.projectId, orgId]
          );
        } catch {
          // ignore
        }
      }

      // 5. If speechText provided, log ai_run
      if (input.speechText) {
        try {
          const memRes = await client.query(
            "SELECT id FROM erp.memberships WHERE user_id = $1 LIMIT 1",
            [userId]
          );
          const memId = memRes.rows[0]?.id;
          await client.query(
            `INSERT INTO erp.ai_runs (
               organization_id, agent_code, status, model, input_snapshot, output_json,
               schema_version, request_id, requested_by, created_by
             )
             VALUES ($1, 'VOICE_REPORT', 'completed', 'gemini-3.5-flash-lite', $2, $3, 'v1', $4, $5, $6)`,
            [
              orgId,
              JSON.stringify({ rawSpeech: input.speechText }),
              JSON.stringify(answers),
              crypto.randomUUID(),
              memId,
              userId,
            ]
          );
        } catch {
          // Non-blocking log
        }
      }

      await client.query("COMMIT");
      console.log("[createWorkReport] COMMITTED SUCCESSFULLY!");

      return {
        id: report.id,
        taskId: input.taskId,
        workDate,
        status: report.status,
        answers,
        authorEmployeeId: employeeId,
        submittedAt: report.submitted_at.toISOString(),
      };
    } catch (err: any) {
      console.error("[createWorkReport] TRANSACTION FAILED, ROLLING BACK:", err?.message || err);
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ------------------------------------------
  // DANH SÁCH BÁO CÁO CÔNG VIỆC & ĐÁNH GIÁ AI
  // ------------------------------------------
  static async listWorkReports(filters?: {
    taskId?: string;
    projectId?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    workDate: string | null;
    answers: Record<string, any>;
    status: string;
    submittedAt: string | null;
    taskId: string;
    taskCode: string;
    taskTitle: string;
    projectId: string;
    projectCode: string;
    projectName: string;
    authorEmployeeId: string | null;
    authorName: string;
    authorCode: string;
  }>> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        wr.id,
        wr.work_date as "workDate",
        wr.answers,
        wr.status,
        wr.submitted_at as "submittedAt",
        wr.task_id as "taskId",
        t.code as "taskCode",
        t.title as "taskTitle",
        t.project_id as "projectId",
        p.code as "projectCode",
        p.name as "projectName",
        wr.author_employee_id as "authorEmployeeId",
        e.name as "authorName",
        e.code as "authorCode",
        u.name as "creatorName"
      FROM erp.work_reports wr
      JOIN erp.tasks t ON t.id = wr.task_id
      JOIN erp.projects p ON p.id = t.project_id
      LEFT JOIN erp.employees e ON e.id = wr.author_employee_id
      LEFT JOIN public."user" u ON u.id = wr.created_by
      WHERE wr.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters?.taskId) {
      params.push(filters.taskId);
      sql += ` AND wr.task_id = $${params.length}`;
    }

    if (filters?.projectId) {
      params.push(filters.projectId);
      sql += ` AND t.project_id = $${params.length}`;
    }

    sql += ` ORDER BY wr.submitted_at DESC NULLS LAST, wr.created_at DESC LIMIT ${filters?.limit || 100}`;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      workDate: r.workDate ? new Date(r.workDate).toISOString().split("T")[0] : null,
      answers: r.answers || {},
      status: r.status,
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : null,
      taskId: r.taskId,
      taskCode: r.taskCode,
      taskTitle: r.taskTitle,
      projectId: r.projectId,
      projectCode: r.projectCode,
      projectName: r.projectName,
      authorEmployeeId: r.authorEmployeeId,
      authorName: r.authorName || r.creatorName || "Thành viên",
      authorCode: r.authorCode || "",
    }));
  }

  // ------------------------------------------
  // NGHIỆM THU CÔNG TRÌNH & CHỮ KÝ SỐ
  // ------------------------------------------
  static async listAcceptances(projectId: string): Promise<AcceptanceDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      SELECT 
        a.id,
        a.code,
        a.status,
        a.accepted_at,
        a.customer_signer_name,
        a.project_id,
        p.name as project_name,
        pt.name as customer_name,
        a.signature_file_id,
        a.signature_data,
        a.created_at
      FROM erp.acceptances a
      JOIN erp.projects p ON p.id = a.project_id
      JOIN erp.partners pt ON pt.id = p.customer_id
      WHERE a.organization_id = $1 AND a.project_id = $2
      ORDER BY a.created_at DESC
    `;

    const res = await pool.query(sql, [orgId, projectId]);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      acceptedAt: r.accepted_at ? r.accepted_at.toISOString() : null,
      customerSignerName: r.customer_signer_name,
      projectId: r.project_id,
      projectName: r.project_name,
      customerName: r.customer_name,
      signatureFileId: r.signature_file_id,
      signatureData: r.signature_data || null,
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async createAcceptance(
    data: {
      projectId: string;
      customerSignerName: string;
      status?: "draft" | "submitted" | "approved" | "completed";
      signatureFileId?: string;
    },
    userId: string
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    // DOC-01: Cấp mã biên bản nghiệm thu tuần tự nguyên tử chống trùng lặp đa luồng
    const code = await getNextDocumentCode(pool, orgId, "acceptance", "BB-NT");

    const res = await pool.query(
      `INSERT INTO erp.acceptances (
         organization_id, code, status, customer_signer_name, project_id,
         signature_file_id, accepted_at, created_by, updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $3 = 'approved' OR $3 = 'completed' THEN now() ELSE null END, $7, $7)
       RETURNING id`,
      [
        orgId,
        code,
        data.status || "draft",
        data.customerSignerName,
        data.projectId,
        data.signatureFileId || null,
        userId,
      ]
    );

    // Đồng bộ hoàn thành công việc khi nghiệm thu được duyệt
    if (data.status === "approved" || data.status === "completed") {
      try {
        await pool.query(
          `UPDATE erp.tasks
           SET status = 'done', progress_percent = 100, updated_at = now(), updated_by = $1
           WHERE organization_id = $2 AND project_id = $3 AND status = 'awaiting_acceptance'`,
          [userId, orgId, data.projectId]
        );
      } catch {
        // Non-blocking
      }
    }

    return res.rows[0].id;
  }

  static async updateAcceptanceStatus(
    acceptanceId: string,
    status: "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "completed",
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const updRes = await pool.query(
      `UPDATE erp.acceptances 
       SET status = $1, 
           accepted_at = CASE WHEN $1 IN ('approved', 'completed') THEN now() ELSE accepted_at END,
           updated_at = now(),
           updated_by = $2
       WHERE organization_id = $3 AND id = $4
       RETURNING project_id`,
      [status, userId, orgId, acceptanceId]
    );

    if (updRes.rows.length > 0 && (status === "approved" || status === "completed")) {
      const pId = updRes.rows[0].project_id;
      if (pId) {
        try {
          await pool.query(
            `UPDATE erp.tasks
             SET status = 'done', progress_percent = 100, updated_at = now(), updated_by = $1
             WHERE organization_id = $2 AND project_id = $3 AND status = 'awaiting_acceptance'`,
            [userId, orgId, pId]
          );
        } catch {
          // Non-blocking
        }
      }
    }
  }

  // ------------------------------------------
  // THÀNH VIÊN DỰ ÁN (PROJECT MEMBERS)
  // ------------------------------------------
  static async listProjectMembers(projectId: string): Promise<ProjectMemberDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      SELECT 
        pm.id,
        pm.duty,
        pm.valid_from,
        pm.valid_to,
        pm.project_id,
        pm.membership_id,
        e.id as employee_id,
        e.code as employee_code,
        e.name as employee_name,
        e.phone as employee_phone,
        u.name as user_name
      FROM erp.project_members pm
      JOIN erp.memberships m ON m.id = pm.membership_id
      LEFT JOIN public."user" u ON u.id = m.user_id
      LEFT JOIN erp.employees e ON e.membership_id = m.id
      WHERE pm.organization_id = $1 
        AND pm.project_id = $2
        AND (pm.valid_to IS NULL OR pm.valid_to > now())
      ORDER BY pm.valid_from ASC
    `;
    const res = await pool.query(sql, [orgId, projectId]);
    return res.rows.map((r) => ({
      id: r.id,
      duty: r.duty,
      validFrom: r.valid_from.toISOString(),
      validTo: r.valid_to ? r.valid_to.toISOString() : null,
      projectId: r.project_id,
      membershipId: r.membership_id,
      employeeId: r.employee_id,
      employeeCode: r.employee_code,
      employeeName: r.employee_name || r.user_name || "Nhân sự",
      employeePhone: r.employee_phone,
      userName: r.user_name,
    }));
  }

  static async addProjectMember(
    projectId: string,
    data: { employeeId: string; duty: string },
    userId: string
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const empRes = await pool.query(
      `SELECT membership_id FROM erp.employees WHERE organization_id = $1 AND id = $2`,
      [orgId, data.employeeId]
    );
    if (empRes.rows.length === 0 || !empRes.rows[0].membership_id) {
      throw new Error("Nhân sự này chưa được liên kết tài khoản hệ thống (membership)");
    }
    const membershipId = empRes.rows[0].membership_id;

    const res = await pool.query(
      `INSERT INTO erp.project_members (
         organization_id, duty, valid_from, project_id, membership_id, created_by, updated_by
       )
       VALUES ($1, $2, now(), $3, $4, $5, $5)
       RETURNING id`,
      [orgId, data.duty || "Thành viên thi công", projectId, membershipId, userId]
    );
    return res.rows[0].id;
  }

  static async removeProjectMember(memberId: string, userId: string): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    await pool.query(
      `UPDATE erp.project_members
       SET valid_to = now(), updated_at = now(), updated_by = $1
       WHERE organization_id = $2 AND id = $3`,
      [userId, orgId, memberId]
    );
  }

  // ------------------------------------------
  // NHẬT KÝ BÁO CÁO CÔNG VIỆC DỰ ÁN THẬT
  // ------------------------------------------
  static async listWorkReportsByProject(projectId: string): Promise<WorkReportDetailDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      SELECT 
        wr.id,
        wr.task_id,
        t.title as task_title,
        t.code as task_code,
        wr.work_date,
        wr.status,
        e.name as author_name,
        e.code as author_code,
        wr.answers,
        wr.submitted_at
      FROM erp.work_reports wr
      JOIN erp.tasks t ON t.id = wr.task_id
      JOIN erp.employees e ON e.id = wr.author_employee_id
      WHERE wr.organization_id = $1 AND t.project_id = $2
      ORDER BY wr.submitted_at DESC
    `;
    const res = await pool.query(sql, [orgId, projectId]);
    return res.rows.map((r) => {
      const answers = typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers || {};
      return {
        id: r.id,
        taskId: r.task_id,
        taskTitle: r.task_title,
        taskCode: r.task_code,
        workDate: r.work_date ? new Date(r.work_date).toISOString().split("T")[0] : "",
        status: r.status,
        authorName: r.author_name,
        authorCode: r.author_code,
        workSummary: answers.work_summary || answers.notes || "Báo cáo công việc",
        materialsList: answers.materials_checklist || [],
        completionPercentage: answers.completion_percentage ?? 100,
        submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : "",
      };
    });
  }

  static async approveWorkReport(
    reportId: string,
    status: "approved" | "rejected",
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    await pool.query(
      `UPDATE erp.work_reports
       SET status = $1, updated_at = now(), updated_by = $2
       WHERE organization_id = $3 AND id = $4`,
      [status, userId, orgId, reportId]
    );
  }

  // ------------------------------------------
  // BÓC TÁCH VẬT TƯ & XUẤT KHO DỰ ÁN THẬT
  // ------------------------------------------
  static async getProjectMaterials(projectId: string): Promise<{
    documents: Array<{
      id: string;
      code: string;
      type: string;
      status: string;
      postedAt: string | null;
      lines: Array<{
        id: string;
        itemCode: string;
        itemName: string;
        unitName: string;
        qty: number;
        unitCost: number;
        totalAmount: number;
      }>;
    }>;
    summary: ProjectMaterialDto[];
  }> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    // 1. Lấy danh sách phiếu kho gắn với project_id
    const docSql = `
      SELECT 
        sd.id,
        sd.code,
        sd.type,
        sd.status,
        sd.posted_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sdl.id,
              'itemCode', i.code,
              'itemName', i.name,
              'unitName', u.name,
              'qty', sdl.qty,
              'unitCost', sdl.unit_cost_snapshot,
              'totalAmount', sdl.qty * sdl.unit_cost_snapshot
            ) ORDER BY sdl.line_no ASC
          ) FILTER (WHERE sdl.id IS NOT NULL),
          '[]'
        ) as lines
      FROM erp.stock_documents sd
      LEFT JOIN erp.stock_document_lines sdl ON sdl.document_id = sd.id
      LEFT JOIN erp.items i ON i.id = sdl.item_id
      LEFT JOIN erp.units u ON u.id = sdl.unit_id
      WHERE sd.organization_id = $1 AND sd.project_id = $2
      GROUP BY sd.id
      ORDER BY sd.created_at DESC
    `;
    const docRes = await pool.query(docSql, [orgId, projectId]);

    // 2. Tổng hợp theo SKU vật tư
    const sumSql = `
      SELECT 
        i.id as item_id,
        i.code as item_code,
        i.name as item_name,
        u.code as unit_code,
        u.name as unit_name,
        SUM(sdl.qty) as issued_qty,
        SUM(sdl.qty * sdl.unit_cost_snapshot) as total_cost,
        COUNT(DISTINCT sd.id) as documents_count
      FROM erp.stock_document_lines sdl
      JOIN erp.stock_documents sd ON sd.id = sdl.document_id
      JOIN erp.items i ON i.id = sdl.item_id
      JOIN erp.units u ON u.id = sdl.unit_id
      WHERE sd.organization_id = $1 AND sd.project_id = $2 AND sd.type = 'issue'
      GROUP BY i.id, i.code, i.name, u.code, u.name
      ORDER BY total_cost DESC
    `;
    const sumRes = await pool.query(sumSql, [orgId, projectId]);

    return {
      documents: docRes.rows.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
        status: r.status,
        postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : null,
        lines: r.lines || [],
      })),
      summary: sumRes.rows.map((r) => ({
        itemId: r.item_id,
        itemCode: r.item_code,
        itemName: r.item_name,
        unitCode: r.unit_code,
        unitName: r.unit_name,
        issuedQty: Number(r.issued_qty) || 0,
        totalCost: Number(r.total_cost) || 0,
        documentsCount: Number(r.documents_count) || 0,
      })),
    };
  }

  // ------------------------------------------
  // THU CHI & LÃI LỖ P&L DỰ ÁN THẬT
  // ------------------------------------------
  static async getProjectFinancialSummary(projectId: string): Promise<ProjectFinancialSummaryDto> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    // 1. Đơn hàng bán / Hợp đồng gắn với dự án
    const soRes = await pool.query(
      `SELECT id, code, total, status FROM erp.sales_orders 
       WHERE organization_id = $1 AND project_id = $2 AND status != 'cancelled'`,
      [orgId, projectId]
    );
    const orders = soRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      total: Number(r.total) || 0,
      status: r.status,
    }));
    const contractTotal = orders.reduce((sum, o) => sum + o.total, 0);

    // 2. Chi phí vật tư thực xuất (từ stock_movements)
    const matRes = await pool.query(
      `SELECT COALESCE(SUM(ABS(sm.value_delta)), 0) as material_cost 
       FROM erp.stock_movements sm 
       JOIN erp.stock_documents sd ON sd.id = sm.document_id 
       WHERE sd.organization_id = $1 AND sd.project_id = $2 AND sd.type = 'issue'`,
      [orgId, projectId]
    );
    const materialCost = Number(matRes.rows[0].material_cost) || 0;

    // 3. Các khoản thu - chi tiền mặt gắn với dự án (từ erp.payments)
    const payRes = await pool.query(
      `SELECT p.id, p.code, p.direction, p.amount, p.status, p.purpose, p.paid_at, ca.name as cash_account_name 
       FROM erp.payments p 
       LEFT JOIN erp.cash_accounts ca ON ca.id = p.cash_account_id
       WHERE p.organization_id = $1 AND p.project_id = $2 
       ORDER BY p.paid_at DESC NULLS LAST, p.created_at DESC`,
      [orgId, projectId]
    );
    const payments = payRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      direction: r.direction as "receipt" | "disbursement",
      amount: Number(r.amount) || 0,
      status: r.status,
      purpose: r.purpose,
      paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
      accountName: r.cash_account_name || null,
    }));

    const receiptsTotal = payments
      .filter((p) => p.direction === "receipt" && ["approved", "posted"].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0);

    const disbursementsTotal = payments
      .filter((p) => p.direction === "disbursement" && ["approved", "posted"].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0);

    // 4. Công nợ phải thu (open_items)
    const recRes = await pool.query(
      `SELECT COALESCE(SUM(oi.original_amount), 0) as receivables_total 
       FROM erp.open_items oi 
       JOIN erp.sales_orders so ON so.id = oi.sales_order_id 
       WHERE oi.organization_id = $1 AND so.project_id = $2 AND oi.side = 'receivable' AND oi.status = 'confirmed'`,
      [orgId, projectId]
    );
    const receivablesTotal = Number(recRes.rows[0].receivables_total) || 0;

    // 5. Dự toán ngân sách (Budgeted Cost từ bóc tách linh kiện báo giá estimate_components)
    const estRes = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN ec.kind = 'material' THEN ec.qty * ec.unit_cost * (1 + COALESCE(ec.waste_rate, 0)) ELSE 0 END), 0) as est_material_cost,
         COALESCE(SUM(CASE WHEN ec.kind = 'labor' THEN ec.qty * ec.unit_cost ELSE 0 END), 0) as est_labor_cost,
         COALESCE(SUM(CASE WHEN ec.kind IN ('transport', 'other') THEN ec.qty * ec.unit_cost ELSE 0 END), 0) as est_other_cost,
         COALESCE(SUM(ec.qty * ec.unit_cost * (1 + COALESCE(ec.waste_rate, 0))), 0) as total_est_cost
       FROM erp.sales_orders so
       JOIN erp.quotation_lines ql ON ql.revision_id = so.quotation_revision_id
       JOIN erp.estimate_components ec ON ec.quotation_line_id = ql.id
       WHERE so.organization_id = $1 AND so.project_id = $2 AND so.status != 'cancelled'`,
      [orgId, projectId]
    );

    let budgetedMaterialCost = Number(estRes.rows[0]?.est_material_cost) || 0;
    let budgetedLaborCost = Number(estRes.rows[0]?.est_labor_cost) || 0;
    let budgetedOtherCost = Number(estRes.rows[0]?.est_other_cost) || 0;
    let budgetedCost = Number(estRes.rows[0]?.total_est_cost) || 0;

    // Chuẩn định mức ngành Biển Quảng Cáo nếu dự án chưa có bóc tách linh kiện chi tiết:
    // Vật tư 55%, Nhân công 15%, Vận chuyển/khác 5% (Tổng chi phí 75%, Biên lợi nhuận định mức 25%)
    if (budgetedCost === 0 && contractTotal > 0) {
      budgetedMaterialCost = Math.round(contractTotal * 0.55);
      budgetedLaborCost = Math.round(contractTotal * 0.15);
      budgetedOtherCost = Math.round(contractTotal * 0.05);
      budgetedCost = budgetedMaterialCost + budgetedLaborCost + budgetedOtherCost;
    }

    const budgetedMargin = contractTotal > 0 ? Math.round(((contractTotal - budgetedCost) / contractTotal) * 1000) / 10 : 0;

    // 6. Tính lãi gộp thực tế & Đánh giá sức khỏe tài chính dự án
    const actualTotalCost = materialCost + disbursementsTotal;
    const effectiveRevenue = contractTotal > 0 ? contractTotal : receiptsTotal;
    const grossProfit = effectiveRevenue - actualTotalCost;
    const grossProfitMargin = effectiveRevenue > 0 ? Math.round((grossProfit / effectiveRevenue) * 1000) / 10 : 0;
    const costVariance = budgetedCost - actualTotalCost; // > 0: Tiết kiệm chi phí; < 0: Bội chi

    let profitHealth: "excellent" | "good" | "warning" | "danger" = "good";
    let profitHealthLabel = "Đạt chỉ tiêu";

    if (grossProfit < 0 || grossProfitMargin < 0) {
      profitHealth = "danger";
      profitHealthLabel = "Vượt chi phí / Báo động lỗ";
    } else if (grossProfitMargin < 15) {
      profitHealth = "warning";
      profitHealthLabel = "Biên mỏng cảnh báo (< 15%)";
    } else if (grossProfitMargin >= 30) {
      profitHealth = "excellent";
      profitHealthLabel = "Lợi nhuận rất tốt (≥ 30%)";
    } else {
      profitHealth = "good";
      profitHealthLabel = "Đạt chỉ tiêu kế hoạch (15 - 30%)";
    }

    return {
      projectId,
      contractTotal,
      orders,
      materialCost,
      disbursementsTotal,
      receiptsTotal,
      receivablesTotal,
      grossProfit,
      grossProfitMargin,
      budgetedCost,
      budgetedMaterialCost,
      budgetedLaborCost,
      budgetedOtherCost,
      budgetedMargin,
      actualTotalCost,
      costVariance,
      profitHealth,
      profitHealthLabel,
      payments,
    };
  }

  // ------------------------------------------
  // M15: ĐỘI XE, LỆNH ĐIỀU XE & VẬN CHUYỂN
  // ------------------------------------------
  static async listVehicles(): Promise<VehicleDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const res = await pool.query(
      "SELECT id, code, plate_no, is_active FROM erp.vehicles WHERE organization_id = $1 ORDER BY code ASC",
      [orgId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      plateNo: r.plate_no,
      isActive: r.is_active,
    }));
  }

  static async listTrips(filters?: { status?: string }): Promise<TripDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    let sql = `
      SELECT 
        tr.id,
        tr.code,
        tr.status,
        tr.planned_departure,
        tr.vehicle_id,
        v.plate_no as vehicle_plate,
        tr.driver_employee_id,
        e.name as driver_name,
        tr.project_id,
        p.name as project_name,
        tr.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ts.id,
              'sequence', ts.sequence,
              'address', ts.address,
              'arrivedAt', ts.arrived_at,
              'deliveryStatus', ts.delivery_status
            ) ORDER BY ts.sequence ASC
          ) FILTER (WHERE ts.id IS NOT NULL),
          '[]'
        ) as stops
      FROM erp.trips tr
      JOIN erp.vehicles v ON v.id = tr.vehicle_id
      JOIN erp.employees e ON e.id = tr.driver_employee_id
      LEFT JOIN erp.projects p ON p.id = tr.project_id
      LEFT JOIN erp.trip_stops ts ON ts.trip_id = tr.id
      WHERE tr.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND tr.status = $${params.length}`;
    }

    sql += `
      GROUP BY tr.id, v.plate_no, e.name, p.name
      ORDER BY tr.created_at DESC
    `;

    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      plannedDeparture: r.planned_departure ? r.planned_departure.toISOString() : null,
      vehicleId: r.vehicle_id,
      vehiclePlate: r.vehicle_plate,
      driverEmployeeId: r.driver_employee_id,
      driverName: r.driver_name,
      projectId: r.project_id,
      projectName: r.project_name,
      stops: r.stops || [],
      createdAt: r.created_at.toISOString(),
    }));
  }

  static async createTrip(
    data: {
      vehicleId: string;
      driverEmployeeId: string;
      projectId?: string;
      plannedDeparture?: string;
      stops: { sequence: number; address: string }[];
    },
    userId: string
  ): Promise<string> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // DOC-01: Cấp mã chuyến xe tuần tự nguyên tử chống trùng lặp đa luồng
      const code = await getNextDocumentCode(client, orgId, "trip", "CHUYEN");

      const tripRes = await client.query(
        `INSERT INTO erp.trips (
           organization_id, code, status, planned_departure,
           vehicle_id, driver_employee_id, project_id, created_by, updated_by
         )
         VALUES ($1, $2, 'scheduled', $3, $4, $5, $6, $7, $7)
         RETURNING id`,
        [
          orgId,
          code,
          data.plannedDeparture || null,
          data.vehicleId,
          data.driverEmployeeId,
          data.projectId || null,
          userId,
        ]
      );
      const tripId = tripRes.rows[0].id;

      for (const s of data.stops) {
        await client.query(
          `INSERT INTO erp.trip_stops (
             organization_id, sequence, address, delivery_status, trip_id, project_id, created_by, updated_by
           )
           VALUES ($1, $2, $3, 'pending', $4, $5, $6, $6)`,
          [orgId, s.sequence, s.address, tripId, data.projectId || null, userId]
        );
      }

      await client.query("COMMIT");
      return tripId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateTripStatus(
    tripId: string,
    status: "draft" | "scheduled" | "dispatched" | "completed" | "cancelled",
    userId: string
  ): Promise<void> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    await pool.query(
      `UPDATE erp.trips
       SET status = $1, updated_at = now(), updated_by = $2
       WHERE organization_id = $3 AND id = $4`,
      [status, userId, orgId, tripId]
    );
  }
}
