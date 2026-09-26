/**
 * DỊCH VỤ DỰ ÁN, ĐIỀU ĐỘ WBS, HIỆN TRƯỜNG GPS & ĐỘI XE (PROJECT & FLEET SERVICE)
 * Triển khai theo quy chuẩn M11, M12, M13, M14, M15 trong docs/DANH_SACH_MAN_HINH_HE_THONG.md
 * và ma trận phân quyền docs/MA_TRAN_PHAN_QUYEN_DONG.md
 */

import { getDbPool } from "./authorization.service";
import { getNextDocumentCode } from "@/lib/sequences";

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

export interface WbsTaskDto {
  id: string;
  code: string;
  title: string;
  status: TaskStatus;
  dueAt: string | null;
  weight: number;
  progressMode: "manual" | "children";
  progressPercent: number;
  projectId: string;
  parentId: string | null;
  assignees: TaskAssigneeDto[];
  children?: WbsTaskDto[];
}

export interface ProjectTemplateStage {
  name: string;
  tasks: {
    title: string;
    weight: number;
    mode: "manual" | "children";
  }[];
}

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
    const pool = getDbPool();
    const res = await pool.query(
      "SELECT id FROM erp.organizations WHERE code = 'SIGNAGE' LIMIT 1"
    );
    if (res.rows.length === 0) throw new Error("Chưa cấu hình Organization 'SIGNAGE'");
    return res.rows[0].id;
  }

  // ------------------------------------------
  // M11: DANH SÁCH DỰ ÁN & KANBAN
  // ------------------------------------------
  static async listProjects(filters?: {
    status?: string;
    search?: string;
    customerId?: string;
  }): Promise<ProjectDto[]> {
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
  // M12: CHI TIẾT DỰ ÁN 360°
  // ------------------------------------------
  static async getProjectById(id: string): Promise<ProjectDto | null> {
    const list = await this.listProjects();
    return list.find((p) => p.id === id) || null;
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
      managerMemId = memRes.rows[0].id;
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

      // Nếu có template, tự động sinh cây công việc WBS từ template version definition!
      if (data.templateVersionId) {
        const verRes = await client.query(
          "SELECT definition FROM erp.project_template_versions WHERE organization_id = $1 AND id = $2",
          [orgId, data.templateVersionId]
        );
        if (verRes.rows.length > 0 && verRes.rows[0].definition?.stages) {
          const stages: ProjectTemplateStage[] = verRes.rows[0].definition.stages;
          let stageIdx = 1;
          for (const stage of stages) {
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
            for (const sub of stage.tasks) {
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
        t.weight,
        t.progress_mode,
        t.progress_percent,
        t.project_id,
        t.parent_id,
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
      weight: Number(r.weight) || 1,
      progressMode: r.progress_mode as "manual" | "children",
      progressPercent: Number(r.progress_percent) || 0,
      projectId: r.project_id,
      parentId: r.parent_id,
      assignees: r.assignees || [],
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

      // Nếu có task cha và mode của cha là 'children', tự động tính lại tiến độ của cha
      if (parentId) {
        const siblingsRes = await client.query(
          `SELECT progress_percent, weight, status FROM erp.tasks 
           WHERE organization_id = $1 AND parent_id = $2`,
          [orgId, parentId]
        );

        let totalWeight = 0;
        let weightedProgress = 0;
        let allDone = true;

        for (const row of siblingsRes.rows) {
          const w = Number(row.weight) || 1;
          const p = Number(row.progress_percent) || 0;
          totalWeight += w;
          weightedProgress += p * w;
          if (row.status !== "done") allDone = false;
        }

        const parentProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
        const parentStatus = allDone
          ? "done"
          : parentProgress > 0
          ? "doing"
          : "todo";

        await client.query(
          `UPDATE erp.tasks
           SET progress_percent = $1, status = $2, updated_at = now(), updated_by = $3
           WHERE organization_id = $4 AND id = $5 AND progress_mode = 'children'`,
          [parentProgress, parentStatus, userId, orgId, parentId]
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

  // ------------------------------------------
  // M13: THƯ VIỆN MẪU DỰ ÁN (TEMPLATES)
  // ------------------------------------------
  static async listTemplates(): Promise<ProjectTemplateDto[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      SELECT 
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
      ORDER BY tpl.created_at DESC
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

  static async getMyTasks(employeeId: string): Promise<any[]> {
    const pool = getDbPool();
    const orgId = await this.getOrgId();

    const sql = `
      SELECT 
        t.id,
        t.code,
        t.title,
        t.status,
        t.due_at,
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
      ORDER BY 
        CASE 
          WHEN t.status = 'doing' THEN 1 
          WHEN t.status = 'todo' THEN 2 
          WHEN t.status = 'awaiting_acceptance' THEN 3 
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
          `INSERT INTO erp.report_templates (organization_id, code, name, description, created_by, updated_by)
           VALUES ($1, 'FIELD_DAILY', 'Nhật ký thi công hiện trường', 'Báo cáo tiến độ và vật tư thi công hàng ngày', $2, $2)
           ON CONFLICT (organization_id, code) DO UPDATE SET updated_at = now()
           RETURNING id`,
          [orgId, userId]
        );
        const tplId = tplRes.rows[0].id;

        const newVerRes = await client.query(
          `INSERT INTO erp.report_template_versions (organization_id, template_id, revision_no, schema_json, published_at, created_by, updated_by)
           VALUES ($1, $2, 1, '{"fields": ["work_summary", "tasks_completed", "materials_used", "obstacles"]}', now(), $3, $3)
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
      const nextStatus = newProgress >= 100 ? "awaiting_acceptance" : "doing";

      await client.query(
        `UPDATE erp.tasks 
         SET progress_percent = GREATEST(progress_percent, $1),
             status = CASE WHEN status = 'todo' THEN $2 ELSE status END,
             updated_at = now(),
             updated_by = $3
         WHERE id = $4 AND organization_id = $5`,
        [newProgress, nextStatus, userId, input.taskId, orgId]
      );

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

      return {
        id: report.id,
        taskId: input.taskId,
        workDate,
        status: report.status,
        answers,
        authorEmployeeId: employeeId,
        submittedAt: report.submitted_at.toISOString(),
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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

    return res.rows[0].id;
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
