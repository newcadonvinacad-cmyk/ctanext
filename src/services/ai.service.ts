/**
 * DỊCH VỤ ĐIỀU PHỐI NGHIỆP VỤ AI (AI SERVICE)
 * File: src/services/ai.service.ts
 * Triển khai theo Mục 2 & Mục 3 docs/THIET_KE_KIEN_TRUC_AI_AGENT.md
 * Tích hợp kiểm soát quyền và phạm vi dữ liệu (RBAC/ABAC Scopes)
 */

import crypto from "crypto";
import { getDbPool, getCachedOrgId } from "@/lib/db";
import { AuthorizationService } from "./authorization.service";
import { geminiService } from "@/lib/ai/gemini";
import {
  ASSISTANT_SYSTEM_INSTRUCTION,
  ASSISTANT_TOOLS,
  toGeminiTools,
} from "@/lib/ai/agents/assistant.agent";
import {
  AiActionProposal,
  AiAgentStepTrace,
  AiChatQueryRequest,
  AiChatQueryResponse,
  AiDataSourceCitation,
  AiRunRecord,
  IngestionActionType,
} from "@/types/ai.types";
import { InventoryService } from "./inventory.service";
import { ProjectService } from "./project.service";
import { FinanceService } from "./finance.service";
import { ProcurementService } from "./procurement.service";
import { CrmService } from "./crm.service";

export class AiService {
  /**
   * Lấy organization_id mặc định
   */
  private static async getOrgId(): Promise<string> {
    return getCachedOrgId("SIGNAGE");
  }

  /**
   * Lấy membershipId cho user
   */
  private static async getMembershipId(userId: string): Promise<string> {
    const pool = getDbPool();
    const res = await pool.query(
      "SELECT id FROM erp.memberships WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    if (res.rows[0]) return res.rows[0].id;

    // Fallback membership đầu tiên trong hệ thống
    const fallbackRes = await pool.query(
      "SELECT id FROM erp.memberships ORDER BY created_at ASC LIMIT 1"
    );
    if (fallbackRes.rows[0]) return fallbackRes.rows[0].id;

    throw new Error("Không tìm thấy membership hợp lệ để ghi nhận tác vụ AI");
  }

  /**
   * Từ điển cấu trúc và quan hệ dữ liệu Signage ERP (Data Dictionary)
   */
  static getSystemSchemaData(entityName?: string) {
    const schemaDictionary: Record<
      string,
      {
        table: string;
        description: string;
        requiredPermission: string;
        columns: Array<{ name: string; type: string; description: string }>;
        relations: string[];
      }
    > = {
      projects: {
        table: "erp.projects",
        description: "Dự án thi công biển hiệu quảng cáo",
        requiredPermission: "project.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "code", type: "text", description: "Mã dự án (vd: PRJ-001)" },
          { name: "name", type: "text", description: "Tên dự án / công trình" },
          { name: "customer_id", type: "uuid", description: "FK -> erp.partners(id)" },
          { name: "status", type: "text", description: "planning | survey | production | transport | installation | acceptance | completed | cancelled" },
          { name: "due_date", type: "date", description: "Hạn hoàn thành (bảng không có cột progress_percent: tiến độ dự án = trung bình progress_percent các task gốc trong erp.tasks)" },
          { name: "address", type: "text", description: "Địa chỉ thi công công trình" },
        ],
        relations: [
          "1 Dự án có nhiều Nhiệm vụ / Hạng mục (erp.tasks)",
          "1 Dự án liên kết với 1 Khách hàng (erp.partners)",
          "1 Dự án có các Phiếu xuất kho cấp vật tư (erp.stock_documents)",
          "1 Dự án có Biên bản nghiệm thu bàn giao (erp.project_acceptances)",
        ],
      },
      tasks: {
        table: "erp.tasks",
        description: "Đầu việc / Hạng mục WBS trong dự án",
        requiredPermission: "project.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "code", type: "text", description: "Mã công việc (vd: TK-001-THICONG)" },
          { name: "title", type: "text", description: "Tên đầu việc" },
          { name: "project_id", type: "uuid", description: "FK -> erp.projects(id)" },
          { name: "status", type: "text", description: "todo | doing | done | awaiting_acceptance" },
          { name: "progress_percent", type: "numeric", description: "Phần trăm hoàn thành" },
          { name: "due_at", type: "timestamptz", description: "Hạn hoàn thành" },
        ],
        relations: [
          "Thuộc về một dự án (erp.projects)",
          "Được phân công cho thợ / nhân viên qua erp.task_assignees",
          "Có nhiều báo cáo nhật trình thi công (erp.work_reports)",
        ],
      },
      items: {
        table: "erp.items",
        description: "Danh mục vật tư, phụ kiện cơ khí, in ấn, đèn led",
        requiredPermission: "item.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "code", type: "text", description: "Mã SKU vật tư" },
          { name: "name", type: "text", description: "Tên quy cách vật tư (alu, sắt, led, bạt...)" },
          { name: "category_id", type: "uuid", description: "FK -> erp.item_categories(id)" },
          { name: "base_unit_id", type: "uuid", description: "FK -> erp.units(id)" },
          { name: "min_qty", type: "numeric", description: "Định mức tồn kho tối thiểu" },
        ],
        relations: [
          "Tồn kho thực tế quản lý qua erp.inventory_balances",
          "Tấm lẻ / đề-xê alu dở lưu tại erp.inventory_lots",
        ],
      },
      warehouses: {
        table: "erp.warehouses",
        description: "Điểm kho vật tư (Kho xưởng, Kho xe lưu động...)",
        requiredPermission: "inventory.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "code", type: "text", description: "Mã điểm kho" },
          { name: "name", type: "text", description: "Tên điểm kho" },
          { name: "type", type: "text", description: "factory | vehicle | transit" },
        ],
        relations: ["Quản lý xuất/nhập qua erp.stock_documents"],
      },
      stock_documents: {
        table: "erp.stock_documents",
        description: "Phiếu xuất kho, nhập kho, điều chuyển kho",
        requiredPermission: "stock_document.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "code", type: "text", description: "Mã phiếu kho (vd: SD-ISS-..., SD-RCP-...)" },
          { name: "type", type: "text", description: "receipt (nhập) | issue (xuất) | transfer (điều chuyển)" },
          { name: "status", type: "text", description: "draft | pending_approval | approved | completed" },
          { name: "source_warehouse_id", type: "uuid", description: "Kho nguồn" },
          { name: "destination_warehouse_id", type: "uuid", description: "Kho đích" },
          { name: "project_id", type: "uuid", description: "Dự án liên quan" },
        ],
        relations: ["Chi tiết vật tư lưu trong erp.stock_document_lines"],
      },
      partners: {
        table: "erp.partners",
        description: "Đối tác khách hàng & nhà cung cấp vật tư",
        requiredPermission: "customer.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "code", type: "text", description: "Mã đối tác (vd: CUST-..., SUPP-...)" },
          { name: "name", type: "text", description: "Tên đối tác / doanh nghiệp" },
          { name: "type", type: "text", description: "customer | supplier | both" },
          { name: "phone", type: "text", description: "Số điện thoại" },
          { name: "credit_limit", type: "numeric", description: "Hạn mức tín dụng" },
        ],
        relations: ["Công nợ đối soát theo dõi qua erp.open_items"],
      },
      employees: {
        table: "erp.employees",
        description: "Hồ sơ nhân sự, thợ xưởng, quản lý",
        requiredPermission: "employee.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "code", type: "text", description: "Mã nhân viên (vd: EMP-001)" },
          { name: "name", type: "text", description: "Họ và tên" },
          { name: "department_id", type: "uuid", description: "FK -> erp.departments(id)" },
          { name: "phone", type: "text", description: "Số điện thoại" },
          { name: "is_active", type: "boolean", description: "Trạng thái làm việc" },
        ],
        relations: ["Phân công qua erp.task_assignees, chấm công qua erp.attendance_records"],
      },
      work_reports: {
        table: "erp.work_reports",
        description: "Báo cáo nhật trình thi công hàng ngày",
        requiredPermission: "work_report.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "task_id", type: "uuid", description: "FK -> erp.tasks(id)" },
          { name: "author_employee_id", type: "uuid", description: "Thợ nộp báo cáo" },
          { name: "work_date", type: "date", description: "Ngày thực hiện" },
          { name: "status", type: "text", description: "draft | submitted | approved" },
          { name: "answers", type: "jsonb", description: "Chi tiết công việc và vật tư dùng" },
        ],
        relations: ["Liên kết đến công việc và dự án"],
      },
      cash_accounts: {
        table: "erp.cash_accounts",
        description: "Quỹ tiền mặt và tài khoản ngân hàng doanh nghiệp",
        requiredPermission: "project_finance.read",
        columns: [
          { name: "id", type: "uuid", description: "Khóa chính" },
          { name: "code", type: "text", description: "Mã tài khoản quỹ" },
          { name: "name", type: "text", description: "Tên tài khoản / két tiền" },
          { name: "kind", type: "text", description: "cash (tiền mặt) | bank (ngân hàng)" },
          { name: "balance", type: "numeric", description: "Số dư khả dụng" },
        ],
        relations: ["Biến động qua các phiếu thanh toán và chi tiền (erp.payments)"],
      },
    };

    if (entityName && schemaDictionary[entityName]) {
      return {
        entity: entityName,
        schema: schemaDictionary[entityName],
      };
    }

    return {
      description: "Sơ đồ thực thể chính trong Signage ERP",
      entities: Object.keys(schemaDictionary).map((k) => ({
        entityName: k,
        table: schemaDictionary[k].table,
        description: schemaDictionary[k].description,
        requiredPermission: schemaDictionary[k].requiredPermission,
      })),
    };
  }

  /**
   * Truy vấn thực thể linh hoạt kèm bộ lọc có kiểm soát
   */
  static async queryEntityData(params: {
    entityName: string;
    filters?: any;
    limit?: number;
    orgId: string;
  }): Promise<any> {
    const { entityName, filters = {}, limit = 10, orgId } = params;
    const pool = getDbPool();
    const cappedLimit = Math.min(Math.max(limit || 10, 1), 25);

    switch (entityName) {
      case "projects": {
        const projects = await ProjectService.listProjects({
          search: filters.search || filters.keyword,
          status: filters.status,
        });
        return {
          entity: "projects",
          total: projects.length,
          items: projects.slice(0, cappedLimit).map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            customerName: p.customerName || "N/A",
            status: p.status,
            progressPercent: p.progressPercent,
            dueDate: p.dueDate,
            address: p.address,
          })),
        };
      }
      case "tasks": {
        let query = `
          SELECT t.id, t.code, t.title, t.status, t.due_at, t.progress_percent,
                 p.code as project_code, p.name as project_name,
                 e.code as employee_code, e.name as employee_name
          FROM erp.tasks t
          JOIN erp.projects p ON p.id = t.project_id
          LEFT JOIN erp.task_assignees ta ON ta.task_id = t.id AND ta.valid_to IS NULL
          LEFT JOIN erp.employees e ON e.id = ta.employee_id
          WHERE t.organization_id = $1
        `;
        const queryParams: any[] = [orgId];
        if (filters.search || filters.keyword) {
          queryParams.push(`%${filters.search || filters.keyword}%`);
          query += ` AND (t.title ILIKE $${queryParams.length} OR t.code ILIKE $${queryParams.length} OR p.name ILIKE $${queryParams.length})`;
        }
        if (filters.status) {
          queryParams.push(filters.status);
          query += ` AND t.status = $${queryParams.length}`;
        }
        if (filters.project_id || filters.projectId) {
          queryParams.push(filters.project_id || filters.projectId);
          query += ` AND t.project_id = $${queryParams.length}`;
        }
        query += ` ORDER BY t.due_at ASC LIMIT ${cappedLimit}`;
        const res = await pool.query(query, queryParams);
        return { entity: "tasks", total: res.rows.length, items: res.rows };
      }
      case "items": {
        const itemsRes = await InventoryService.listItems({
          keyword: filters.search || filters.keyword,
          limit: cappedLimit,
        });
        return {
          entity: "items",
          total: itemsRes.items.length,
          items: itemsRes.items.map((i) => ({
            id: i.id,
            code: i.code,
            name: i.name,
            category: i.categoryName,
            unit: i.baseUnitName,
            onHand: i.totalOnHand,
            minQty: i.minQty,
          })),
        };
      }
      case "warehouses": {
        const warehouses = await InventoryService.listWarehouses();
        return { entity: "warehouses", total: warehouses.length, items: warehouses.slice(0, cappedLimit) };
      }
      case "stock_documents": {
        const docs = await InventoryService.listDocuments({
          type: filters.type,
          status: filters.status,
        });
        return { entity: "stock_documents", total: docs.length, items: docs.slice(0, cappedLimit) };
      }
      case "remnants": {
        const remnants = await InventoryService.listRemnants();
        return { entity: "remnants", total: remnants.length, items: remnants.slice(0, cappedLimit) };
      }
      case "partners": {
        const customers = await CrmService.listCustomers();
        return { entity: "partners", total: customers.length, items: customers.slice(0, cappedLimit) };
      }
      case "work_reports": {
        const wrRes = await pool.query(
          `SELECT wr.id, wr.work_date, wr.status, wr.answers, wr.submitted_at,
                  t.code as task_code, t.title as task_title,
                  p.code as project_code, p.name as project_name,
                  e.code as employee_code, e.name as employee_name
           FROM erp.work_reports wr
           JOIN erp.tasks t ON t.id = wr.task_id
           LEFT JOIN erp.projects p ON p.id = t.project_id
           LEFT JOIN erp.employees e ON e.id = wr.author_employee_id
           WHERE wr.organization_id = $1
           ORDER BY wr.submitted_at DESC LIMIT $2`,
          [orgId, cappedLimit]
        );
        return { entity: "work_reports", total: wrRes.rows.length, items: wrRes.rows };
      }
      case "employees": {
        const empRes = await pool.query(
          `SELECT e.id, e.code, e.name, e.phone, e.is_active, d.name as dept_name
           FROM erp.employees e
           LEFT JOIN erp.departments d ON d.id = e.department_id
           WHERE e.organization_id = $1 AND e.is_active = true
           ORDER BY e.code ASC LIMIT $2`,
          [orgId, cappedLimit]
        );
        return { entity: "employees", total: empRes.rows.length, items: empRes.rows };
      }
      case "cash_accounts": {
        const accounts = await FinanceService.listCashAccounts();
        return { entity: "cash_accounts", total: accounts.length, items: accounts.slice(0, cappedLimit) };
      }
      case "open_items": {
        const items = await FinanceService.listOpenItems(filters.side || "all");
        return { entity: "open_items", total: items.length, items: items.slice(0, cappedLimit) };
      }
      default:
        return { error: "UNSUPPORTED_ENTITY", message: `Thực thể '${entityName}' chưa được hỗ trợ trực tiếp.` };
    }
  }

  /**
   * Truy vấn SQL chỉ-đọc an toàn (Safe Read-Only SQL Inspection)
   */
  static async executeSafeSqlInspection(
    query: string,
    orgId: string
  ): Promise<{ rowCount: number; rows: any[]; warning?: string }> {
    const trimmed = query.trim();
    const lower = trimmed.toLowerCase();

    if (!lower.startsWith("select") && !lower.startsWith("with")) {
      throw new Error("Chỉ cho phép thực thi câu lệnh truy vấn chỉ-đọc (SELECT hoặc WITH).");
    }

    const forbiddenKeywords = [
      "insert", "update", "delete", "drop", "alter", "truncate", "create",
      "replace", "grant", "revoke", "execute", "exec", "set", "call", "vacuum"
    ];
    for (const kw of forbiddenKeywords) {
      const reg = new RegExp(`\\b${kw}\\b`, "i");
      if (reg.test(lower)) {
        throw new Error(`Truy vấn chứa từ khóa bị cấm vì lý do an toàn: '${kw}'.`);
      }
    }

    let sanitizedQuery = trimmed;
    if (!lower.includes("limit")) {
      sanitizedQuery += " LIMIT 25";
    }

    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const res = await client.query(sanitizedQuery);
      await client.query("COMMIT");
      return {
        rowCount: res.rows.length,
        rows: res.rows.slice(0, 25),
        warning: !lower.includes(orgId) ? "Lưu ý: Bạn nên lọc theo organization_id để đảm bảo dữ liệu thuộc đúng doanh nghiệp." : undefined,
      };
    } catch (err: any) {
      try { await client.query("ROLLBACK"); } catch {}
      throw new Error(`Lỗi thực thi SQL: ${err.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * TRỢ LÝ HỎI ĐÁP ĐIỀU HÀNH & KỸ THUẬT (GENERAL ADVISOR)
   * Triển khai ReAct Multi-Step Loop (Reasoning + Acting + Observation)
   * Bảo mật Zero-Trust RBAC Gatekeeper
   */
  static async askAssistant(req: AiChatQueryRequest): Promise<AiChatQueryResponse> {
    const orgId = req.organizationId || (await this.getOrgId());
    const membershipId = await this.getMembershipId(req.userId);

    // 1. Kiểm tra ma trận quyền và phạm vi (Scope) của User
    const { capabilities, roles, employeeId } =
      await AuthorizationService.getUserCapabilities(req.userId, orgId);

    const roleNames = roles.map((r) => r.name).join(", ") || "Nhân viên";
    const roleCodes = roles.map((r) => r.code);
    const isSuperAdmin = roleCodes.includes("SUPER_ADMIN") || (req.userId as any) === "admin";
    const hasPerm = (perm: string) => isSuperAdmin || Boolean((capabilities as any)[perm]?.isEnabled);

    const userContextInfo = `NGỮ CẢNH NGƯỜI ĐANG HỎI:
- Vai trò: ${roleNames} (Mã: ${roleCodes.join(", ")})
- Toàn quyền SUPER_ADMIN: ${isSuperAdmin ? "CÓ (Được phép truy cập và tra cứu 100% tất cả các phân hệ ERP)" : "KHÔNG"}
- Quyền kho & vật tư: ${hasPerm("inventory.read") ? "CÓ" : "KHÔNG"}
- Quyền dự án & tiến độ: ${hasPerm("project.read") ? "CÓ" : "KHÔNG"}
- Quyền nhân sự & điều độ: ${hasPerm("employee.read") ? "CÓ" : "KHÔNG"}
- Quyền tài chính & dòng tiền: ${hasPerm("project_finance.read") ? "CÓ" : "KHÔNG"}
- Quyền công nợ: ${hasPerm("receivable.read") ? "CÓ" : "KHÔNG"}
- Quyền mua hàng & NCC: ${hasPerm("purchase_order.read") ? "CÓ" : "KHÔNG"}
- Quyền khách hàng CRM: ${hasPerm("customer.read") ? "CÓ" : "KHÔNG"}`;

    const systemInstruction = `${ASSISTANT_SYSTEM_INSTRUCTION}\n\n${userContextInfo}`;

    const toolsUsed: string[] = [];
    const dataSources: AiDataSourceCitation[] = [];
    const permissionWarnings: string[] = [];
    let actionProposal: AiActionProposal | undefined;
    let answer = "";
    let status: "completed" | "failed" | "permission_revoked" = "completed";
    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

    // Lich su hoi thoai multi-turn (de AI nho ngu canh phien chat)
    let groundedPrompt = req.prompt;
    try {
      if (req.sessionId) {
        const history = await this.getChatHistoryForPrompt(
          req.sessionId,
          orgId,
          req.historyLimit ?? 12
        );
        if (history.length > 0) {
          const lines = history.map((h) =>
            h.role === "user" ? `Nguoi dung: ${h.content}` : `Tro ly: ${h.content}`
          );
          groundedPrompt =
            `LICH SU HOI THOAI TRUOC DO (de hieu ngu canh, dai tu, cau noi tiep):\n` +
            lines.join("\n").slice(0, 12000) +
            `\n\nCAU HOI MOI HIEN TAI:\n${req.prompt}`;
        }
      }
    } catch {
      // Bo qua lich su neu DB chua migrate — van tra loi nhu cu
    }

    // Chuẩn hóa danh mục tools cho Gemini (lọc bỏ các trường metadata nội bộ)
    const geminiTools = toGeminiTools(ASSISTANT_TOOLS);

    let agentSteps: any[] = [];

    try {
      // VÒNG LẶP REACT AGENT ĐA BƯỚC (AUTONOMOUS MULTI-STEP LOOP)
      const agentLoopResult = await geminiService.runAgentLoop({
        prompt: groundedPrompt,
        systemInstruction,
        tools: geminiTools,
        maxSteps: 5,
        model: modelName,
        executeTool: async (name: string, args: any, callId?: string) => {
          if (!toolsUsed.includes(name)) {
            toolsUsed.push(name);
          }

          const toolDef = ASSISTANT_TOOLS.find((t) => t.name === name);

          // 1. LỚP BẢO MẬT & PHÂN QUYỀN TRUY VẤN (SERVER-SIDE GATEKEEPER)
          let requiredPerm = toolDef?.requiredPermission || "project.read";

          if (name === "queryEntityData") {
            const ent = String(args?.entityName || "").toLowerCase();
            if (ent === "items" || ent === "remnants" || ent === "warehouses") {
              requiredPerm = "inventory.read";
            } else if (ent === "stock_documents") {
              requiredPerm = "stock_document.read";
            } else if (ent === "employees" || ent === "attendance") {
              requiredPerm = "employee.read";
            } else if (ent === "cash_accounts" || ent === "open_items") {
              requiredPerm = "project_finance.read";
            } else if (ent === "partners") {
              requiredPerm = "customer.read";
            } else if (ent === "work_reports") {
              requiredPerm = "work_report.read";
            } else {
              requiredPerm = "project.read";
            }
          } else if (name === "executeSafeSqlInspection") {
            requiredPerm = "project_finance.read";
          }

          const userCap = (capabilities as any)[requiredPerm];
          const hasAccess = isSuperAdmin || Boolean(userCap?.isEnabled);

          if (!hasAccess) {
            const warnMsg = `Bạn không có quyền '${requiredPerm}' để thực thi công cụ '${name}'.`;
            if (!permissionWarnings.includes(warnMsg)) {
              permissionWarnings.push(warnMsg);
            }
            status = "permission_revoked";
            return {
              response: {
                error: "PERMISSION_DENIED",
                message: warnMsg,
                requiredPermission: requiredPerm,
              },
              error: warnMsg,
            };
          }

          // 2. THỰC THI TOOL THEO NGHIỆP VỤ
          let data: any = null;

          if (name === "getSystemSchema") {
            data = AiService.getSystemSchemaData(args?.entityName);
            dataSources.push({
              sourceType: "technical_standard",
              title: "Từ điển cấu trúc dữ liệu ERP",
              summary: args?.entityName ? `Cấu trúc thực thể: ${args.entityName}` : "Danh mục thực thể toàn hệ thống",
            });
          } else if (name === "queryEntityData") {
            data = await AiService.queryEntityData({
              entityName: args?.entityName,
              filters: args?.filters,
              limit: args?.limit,
              orgId,
            });
            dataSources.push({
              sourceType: "project",
              title: `Truy vấn dữ liệu thực thể: ${args?.entityName}`,
              summary: `Lấy ${Array.isArray(data?.items) ? data.items.length : 1} bản ghi.`,
            });
          } else if (name === "executeSafeSqlInspection") {
            data = await AiService.executeSafeSqlInspection(args?.query, orgId);
            dataSources.push({
              sourceType: "finance",
              title: "Đối soát SQL đa bảng",
              summary: `Truy vấn trả về ${data.rowCount} kết quả.`,
            });
          } else if (name === "searchInventoryStock") {
              const keyword = args?.keyword || "";
              const itemResult = await InventoryService.listItems({ keyword, limit: 12 });
              const items = itemResult.items;
              data = {
                keyword,
                totalFound: items.length,
                items: items.map((i) => ({
                  ma_sku: i.code,
                  ten_vat_tu: i.name,
                  nhom: i.categoryName,
                  don_vi: i.baseUnitName,
                  ton_thuc_te: i.totalOnHand,
                  dinh_muc_toi_thieu: i.minQty,
                  vi_tri_ke: i.binLabel || "Chưa xếp vị trí",
                })),
              };
              dataSources.push({
                sourceType: "inventory",
                title: `Tra cứu tồn kho: "${keyword}"`,
                summary: `Tìm thấy ${items.length} mặt hàng khớp từ khóa.`,
                count: items.length,
              });
            } else if (name === "getWarehouseStockSummary") {
              const summary = await InventoryService.getInventorySummary();
              const warehouses = await InventoryService.listWarehouses();
              data = {
                tong_so_mat_hang: summary.totalItems,
                tong_so_kho: summary.totalWarehouses,
                gia_tri_ton_kho: summary.totalInventoryValue,
                canh_bao_ton_kho_thap: summary.lowStockItems,
                cho_duyet: summary.pendingApprovals,
                danh_sach_kho: warehouses.map((w) => ({
                  ma_kho: w.code,
                  ten_kho: w.name,
                  loai_kho: w.type,
                  tong_sku: w.totalSku,
                  tong_ton: w.totalOnHand,
                })),
              };
              dataSources.push({
                sourceType: "inventory",
                title: "Báo cáo tổng quan kho",
                summary: `Tổng ${warehouses.length} điểm kho, ${summary.totalItems} mặt hàng trong kho.`,
              });
            } else if (name === "searchProjects") {
              const keyword = args?.keyword;
              const statusFilter = args?.status;
              const projects = await ProjectService.listProjects({
                search: keyword,
                status: statusFilter,
              });
              data = {
                totalFound: projects.length,
                projects: projects.slice(0, 10).map((p) => ({
                  ma_du_an: p.code,
                  ten_du_an: p.name,
                  khach_hang: p.customerName || "N/A",
                  trang_thai: p.status,
                  tien_do_phan_tram: p.progressPercent,
                  dia_chi: p.address,
                  ngay_den_han: p.dueDate,
                })),
              };
              dataSources.push({
                sourceType: "project",
                title: "Tra cứu danh sách dự án",
                summary: `Tìm thấy ${projects.length} dự án phù hợp.`,
                count: projects.length,
              });
            } else if (name === "getMyAssignedTasks") {
              if (employeeId) {
                const myTasks = await ProjectService.getMyTasks(employeeId);
                data = {
                  totalAssigned: myTasks.length,
                  tasks: myTasks.map((t) => ({
                    ma_cong_viec: t.code,
                    ten_cong_viec: t.title,
                    du_an: t.projectName,
                    trang_thai: t.status,
                    tien_do: t.progressPercent,
                    han_hoan_thanh: t.dueAt,
                  })),
                };
                dataSources.push({
                  sourceType: "project",
                  title: "Nhiệm vụ cá nhân được phân công",
                  summary: `Có ${myTasks.length} nhiệm vụ được gán.`,
                  count: myTasks.length,
                });
              } else {
                data = {
                  message: "Tài khoản chưa được liên kết với hồ sơ nhân viên trong hệ thống.",
                  tasks: [],
                };
              }
            } else if (name === "getProjectFinancialOverview") {
              const kpis = await FinanceService.getExecutiveKpis();
              data = {
                tong_doanh_thu: kpis.totalRevenue,
                tong_chi_phi: kpis.totalExpense,
                so_du_tien_mat: kpis.cashBalance,
                so_du_ngan_hang: kpis.bankBalance,
                cong_no_phai_thu: kpis.receivablesTotal,
                cong_no_phai_tra: kpis.payablesTotal,
                du_an_dang_trien_khai: kpis.activeProjectsCount,
              };
              dataSources.push({
                sourceType: "finance",
                title: "Chỉ số tài chính điều hành",
                summary: "Dữ liệu dòng tiền, doanh thu và công nợ đối soát thời gian thực.",
              });
            } else if (name === "searchSuppliersAndPurchases") {
              const keyword = args?.keyword;
              const suppliers = await ProcurementService.listSuppliers({ search: keyword });
              const allPos = await ProcurementService.listPurchaseOrders();
              const pos = allPos.slice(0, 5);
              data = {
                nha_cung_cap: suppliers.slice(0, 5).map((s) => ({
                  ma_ncc: s.code,
                  ten_ncc: s.name,
                  dien_thoai: s.phone || "N/A",
                  dia_chi: s.address || "N/A",
                  cong_no_phai_tra: s.totalPayable,
                  so_don_po: s.poCount,
                })),
                don_mua_hang_gan_day: pos.map((po) => ({
                  ma_po: po.code,
                  ncc: po.supplierName,
                  trang_thai: po.status,
                  tong_tien: po.total,
                  ngay_du_kien: po.expectedDate,
                })),
              };
              dataSources.push({
                sourceType: "procurement",
                title: "Nhà cung cấp & Đơn mua hàng",
                summary: `Tìm thấy ${suppliers.length} NCC và ${pos.length} đơn mua hàng.`,
              });
            } else if (name === "listEmployees") {
              const pool = getDbPool();
              const empRes = await pool.query(
                `SELECT e.id, e.code, e.name, e.phone, e.is_active, d.name as dept_name
                 FROM erp.employees e
                 LEFT JOIN erp.departments d ON d.id = e.department_id
                 WHERE e.organization_id = $1 AND e.is_active = true
                 ORDER BY e.code ASC`,
                [orgId]
              );
              data = {
                totalEmployees: empRes.rows.length,
                employees: empRes.rows.map((e) => ({
                  ma_nv: e.code,
                  ho_ten: e.name,
                  phong_ban: e.dept_name || "Chưa phân bổ",
                  so_dien_thoai: e.phone || "N/A",
                })),
              };
              dataSources.push({
                sourceType: "project",
                title: "Danh sách nhân sự công ty",
                summary: `Tổng cộng ${empRes.rows.length} nhân sự đang hoạt động.`,
                count: empRes.rows.length,
              });
            } else if (name === "searchTeamTasks") {
              const pool = getDbPool();
              let query = `
                SELECT t.code as task_code, t.title as task_title, t.status, t.due_at, t.progress_percent,
                       p.code as project_code, p.name as project_name,
                       e.code as employee_code, e.name as employee_name, e.phone as employee_phone
                FROM erp.tasks t
                JOIN erp.projects p ON p.id = t.project_id
                LEFT JOIN erp.task_assignees ta ON ta.task_id = t.id AND ta.valid_to IS NULL
                LEFT JOIN erp.employees e ON e.id = ta.employee_id
                WHERE t.organization_id = $1
              `;
              const params: any[] = [orgId];

              if (args?.employeeName) {
                params.push(`%${args.employeeName}%`);
                query += ` AND (e.name ILIKE $${params.length} OR e.code ILIKE $${params.length})`;
              }
              if (args?.status) {
                params.push(args.status);
                query += ` AND t.status = $${params.length}`;
              }

              query += ` ORDER BY CASE WHEN t.status = 'doing' THEN 1 WHEN t.status = 'todo' THEN 2 ELSE 3 END, t.due_at ASC LIMIT 20`;

              const taskRes = await pool.query(query, params);
              data = {
                totalFound: taskRes.rows.length,
                assignedTasks: taskRes.rows.map((r) => ({
                  ma_cong_viec: r.task_code,
                  ten_cong_viec: r.task_title,
                  du_an: r.project_name,
                  nhan_su_phu_trach: r.employee_name || "Chưa phân công cụ thể",
                  trang_thai: r.status,
                  tien_do: Number(r.progress_percent) || 0,
                  han_hoan_thanh: r.due_at ? new Date(r.due_at).toLocaleDateString("vi-VN") : "Chưa đặt",
                })),
              };
              dataSources.push({
                sourceType: "project",
                title: "Điều độ phân công công việc",
                summary: `Tìm thấy ${taskRes.rows.length} đầu việc của các bộ phận.`,
                count: taskRes.rows.length,
              });
            } else if (name === "listStockDocuments") {
              const type = args?.type as any;
              const status = args?.status;
              const docs = await InventoryService.listDocuments({ type, status });
              data = {
                totalFound: docs.length,
                documents: docs.slice(0, 10).map((d) => ({
                  ma_phieu: d.code,
                  loai_phieu:
                    d.type === "receipt"
                      ? "Nhập kho"
                      : d.type === "issue"
                        ? "Xuất kho"
                        : d.type === "transfer"
                          ? "Điều chuyển"
                          : "Điều chỉnh",
                  muc_dich: d.purpose,
                  trang_thai: d.status,
                  kho_xuat: d.sourceWarehouseName || "N/A",
                  kho_nhap: d.destinationWarehouseName || "N/A",
                  du_an: d.projectName || "N/A",
                  tong_tien: d.totalAmount,
                  ngay_lap: d.createdAt ? new Date(d.createdAt).toLocaleDateString("vi-VN") : "N/A",
                })),
              };
              dataSources.push({
                sourceType: "inventory",
                title: "Phiếu xuất nhập điều chuyển kho",
                summary: `Tìm thấy ${docs.length} phiếu kho phù hợp.`,
                count: docs.length,
              });
            } else if (name === "listRemnants") {
              const remnants = await InventoryService.listRemnants();
              data = {
                totalRemnants: remnants.length,
                remnants: remnants.slice(0, 15).map((r) => ({
                  ma_lo: r.lotCode,
                  ten_vat_tu: r.itemName,
                  ma_vat_tu: r.itemCode,
                  kich_thuoc_mm: `${r.lengthMm} x ${r.widthMm}`,
                  dien_tich_m2: r.areaM2,
                  so_luong_tam: r.onHandQty,
                  kho_luu_tru: r.warehouseName,
                  ke_bin: r.binLabel || "Chưa xếp vị trí",
                })),
              };
              dataSources.push({
                sourceType: "inventory",
                title: "Tấm lẻ / Đề-xê alu, mica dở",
                summary: `Có ${remnants.length} tấm lẻ sẵn sàng tái sử dụng gia công.`,
                count: remnants.length,
              });
            } else if (name === "listWorkReports") {
              const pool = getDbPool();
              let wrQuery = `
                SELECT 
                  wr.id, wr.work_date, wr.status, wr.answers, wr.submitted_at,
                  t.code as task_code, t.title as task_title,
                  p.code as project_code, p.name as project_name,
                  e.code as employee_code, e.name as employee_name
                FROM erp.work_reports wr
                JOIN erp.tasks t ON t.id = wr.task_id
                LEFT JOIN erp.projects p ON p.id = t.project_id
                LEFT JOIN erp.employees e ON e.id = wr.author_employee_id
                WHERE wr.organization_id = $1
              `;
              const wrParams: any[] = [orgId];
              if (args?.keyword) {
                wrParams.push(`%${args.keyword}%`);
                wrQuery += ` AND (p.name ILIKE $${wrParams.length} OR t.title ILIKE $${wrParams.length} OR wr.answers::text ILIKE $${wrParams.length})`;
              }
              wrQuery += ` ORDER BY wr.submitted_at DESC LIMIT 15`;
              const wrRes = await pool.query(wrQuery, wrParams);
              data = {
                totalFound: wrRes.rows.length,
                reports: wrRes.rows.map((r) => {
                  const ans = typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers || {};
                  return {
                    ngay_bao_cao: r.work_date ? new Date(r.work_date).toLocaleDateString("vi-VN") : "N/A",
                    nhan_su: r.employee_name || "N/A",
                    du_an: r.project_name || "N/A",
                    dau_viec: r.task_title,
                    trang_thai: r.status,
                    noi_dung: ans.work_summary || ans.notes || "Nhật trình thi công",
                    vat_tu_phat_sinh: ans.materials_used || "Không phát sinh",
                  };
                }),
              };
              dataSources.push({
                sourceType: "project",
                title: "Nhật trình thi công & Báo cáo hiện trường",
                summary: `Tìm thấy ${wrRes.rows.length} báo cáo tiến độ.`,
                count: wrRes.rows.length,
              });
            } else if (name === "listProjectAcceptances") {
              const pool = getDbPool();
              const accRes = await pool.query(
                `SELECT a.code as acceptance_code, a.status, a.accepted_at, a.customer_signer_name,
                        p.code as project_code, p.name as project_name,
                        pt.name as customer_name
                 FROM erp.acceptances a
                 JOIN erp.projects p ON p.id = a.project_id
                 LEFT JOIN erp.partners pt ON pt.id = p.customer_id
                 WHERE a.organization_id = $1
                 ORDER BY a.created_at DESC LIMIT 15`,
                [orgId]
              );
              data = {
                totalFound: accRes.rows.length,
                acceptances: accRes.rows.map((r) => ({
                  ma_nghiem_thu: r.acceptance_code,
                  du_an: r.project_name,
                  khach_hang: r.customer_name || "N/A",
                  trang_thai: r.status,
                  nguoi_ky_khach_hang: r.customer_signer_name || "Chưa ký",
                  ngay_nghiem_thu: r.accepted_at ? new Date(r.accepted_at).toLocaleDateString("vi-VN") : "Chưa hoàn tất",
                })),
              };
              dataSources.push({
                sourceType: "project",
                title: "Biên bản nghiệm thu công trình",
                summary: `Có ${accRes.rows.length} biên bản bàn giao & nghiệm thu.`,
                count: accRes.rows.length,
              });
            } else if (name === "listVehiclesAndTrips") {
              const vehicles = await ProjectService.listVehicles();
              const trips = await ProjectService.listTrips({ status: args?.status });
              data = {
                tong_so_xe: vehicles.length,
                danh_sach_xe: vehicles.map((v) => ({
                  ma_xe: v.code,
                  bien_so: v.plateNo,
                  trang_thai: v.isActive ? "🟢 Hoạt động" : "🔴 Ngừng chạy",
                })),
                chuyen_xe_gan_day: trips.slice(0, 10).map((t) => ({
                  ma_chuyen: t.code,
                  du_an: t.projectName || "Giao hàng công trình",
                  xe: t.vehiclePlate,
                  tai_xe: t.driverName,
                  trang_thai: t.status,
                  gio_xuat_ben: t.plannedDeparture ? new Date(t.plannedDeparture).toLocaleString("vi-VN") : "Chưa đặt",
                })),
              };
              dataSources.push({
                sourceType: "logistics",
                title: "Đội xe & Lộ trình giao hàng",
                summary: `${vehicles.length} xe và ${trips.length} chuyến điều động.`,
              });
            } else if (name === "getAttendanceSummary") {
              const attendances = await FinanceService.listAttendanceSummary();
              data = {
                totalRecords: attendances.length,
                attendance: attendances.slice(0, 20).map((a) => ({
                  ma_nv: a.employeeCode,
                  ho_ten: a.employeeName,
                  so_ngay_cong: a.workDays,
                  tong_luot_checkin: a.totalCheckIns,
                  lan_cuoi: a.lastCheckInAt ? new Date(a.lastCheckInAt).toLocaleString("vi-VN") : "Chưa ghi nhận",
                })),
              };
              dataSources.push({
                sourceType: "hrm",
                title: "Bảng tổng hợp chấm công",
                summary: `Ghi nhận chấm công của ${attendances.length} lượt nhân sự.`,
                count: attendances.length,
              });
            } else if (name === "searchCustomers") {
              const customers = await CrmService.listCustomers({ keyword: args?.keyword });
              data = {
                totalFound: customers.length,
                customers: customers.slice(0, 15).map((c) => ({
                  ma_khach_hang: c.code,
                  ten_khach_hang: c.name,
                  so_dien_thoai: c.phone || "N/A",
                  dia_chi: c.address || "N/A",
                  han_muc_no: c.creditLimit,
                  cong_no_phai_thu: c.totalReceivable,
                  cong_no_qua_han: c.overdueAmount,
                })),
              };
              dataSources.push({
                sourceType: "crm",
                title: "Danh sách khách hàng (CRM)",
                summary: `Tìm thấy ${customers.length} khách hàng phù hợp.`,
                count: customers.length,
              });
            } else if (name === "getDebtSummary") {
              const side = args?.side || "all";
              let receivables: any[] = [];
              let payables: any[] = [];
              if (side === "receivable" || side === "all") {
                receivables = await FinanceService.listOpenItems("receivable");
              }
              if (side === "payable" || side === "all") {
                payables = await FinanceService.listOpenItems("payable");
              }
              const totalReceivableAmount = receivables.reduce(
                (sum, item) => sum + (Number(item.remainingAmount ?? item.originalAmount) || 0),
                0
              );
              const totalPayableAmount = payables.reduce(
                (sum, item) => sum + (Number(item.remainingAmount ?? item.originalAmount) || 0),
                0
              );
              data = {
                tong_phai_thu: totalReceivableAmount,
                tong_phai_tra: totalPayableAmount,
                phai_thu_khach_hang: receivables.slice(0, 10).map((r) => ({
                  ma_doi_tac: r.partnerCode,
                  doi_tac: r.partnerName,
                  so_tien_goc: r.originalAmount,
                  con_lai: r.remainingAmount ?? r.originalAmount,
                  ngay_den_han: r.dueDate,
                  trang_thai: r.status,
                })),
                phai_tra_nha_cung_cap: payables.slice(0, 10).map((p) => ({
                  ma_doi_tac: p.partnerCode,
                  doi_tac: p.partnerName,
                  so_tien_goc: p.originalAmount,
                  con_lai: p.remainingAmount ?? p.originalAmount,
                  ngay_den_han: p.dueDate,
                  trang_thai: p.status,
                })),
              };
              dataSources.push({
                sourceType: "finance",
                title: "Báo cáo công nợ phải thu / phải trả",
                summary: `Phải thu: ${totalReceivableAmount.toLocaleString("vi-VN")}đ | Phải trả: ${totalPayableAmount.toLocaleString("vi-VN")}đ`,
              });
            } else if (name === "listCashAccounts") {
              const accounts = await FinanceService.listCashAccounts();
              const totalBalance = accounts.reduce(
                (acc, a) => acc + (Number(a.balance) || 0),
                0
              );
              data = {
                tong_quy_tien: totalBalance,
                danh_sach_tai_khoan: accounts.map((a) => ({
                  ma_tai_khoan: a.code,
                  ten_tai_khoan: a.name,
                  loai_quy: a.kind === "cash" ? "Tiền mặt tại két" : "Tài khoản ngân hàng",
                  so_du: a.balance,
                  tien_te: a.currency,
                })),
              };
              dataSources.push({
                sourceType: "finance",
                title: "Quỹ tiền mặt & Tài khoản ngân hàng",
                summary: `Tổng số dư: ${totalBalance.toLocaleString("vi-VN")}đ qua ${accounts.length} tài khoản.`,
              });
            } else if (name === "proposeDataAction") {
              const actionType = (args?.actionType as IngestionActionType) || "work_report";
              const text =
                `${args?.taskCode || ""} ${args?.description || ""} ${args?.completionPercentage ? args.completionPercentage + "%" : ""}`.trim() ||
                req.prompt;
              actionProposal = await AiService.parseActionProposal({
                actionType,
                text,
                userId: req.userId,
                organizationId: orgId,
              });
              data = {
                status: "PROPOSAL_CREATED",
                actionTitle: actionProposal.actionTitle,
                summary: actionProposal.summary,
                message: "Bản xem trước (Preview) đã được tạo thành công cho người dùng xác nhận lưu vào database.",
              };
              dataSources.push({
                sourceType: "project",
                title: `Đề xuất tác vụ: ${actionProposal.actionTitle}`,
                summary: actionProposal.summary,
              });
            } else if (name === "requestClarification") {
              const missing = Array.isArray(args?.missingFields)
                ? args.missingFields
                : [args?.missingFields || "Thông tin chi tiết"];
              const msg = args?.clarificationMessage || "Yêu cầu cần bổ sung thêm thông tin bắt buộc.";
              const format = args?.suggestedFormat || "";
              data = {
                status: "CLARIFICATION_REQUESTED",
                actionIntent: args?.actionIntent || "general",
                missingFields: missing,
                message: msg,
                suggestedFormat: format,
              };
              dataSources.push({
                sourceType: "clarification",
                title: `Yêu cầu bổ sung thông tin (${args?.actionIntent || "Tác vụ"})`,
                summary: `Cần bổ sung: ${missing.join(", ")}`,
              });
            }

          return { response: data || { result: "Không có dữ liệu phù hợp." } };
        },
      });

      answer = agentLoopResult.text;
      agentSteps = agentLoopResult.traces;

      if (!answer) {
        throw new Error("Phản hồi rỗng từ mô hình AI");
      }
    } catch (err: any) {
      status = "failed";
      console.warn("AI Assistant fallback triggered:", err.message);

      // Tri thức fallback an toàn nếu mất kết nối Gemini API
      answer = await this.generateDeterministicFallback(
        req.prompt,
        capabilities,
        employeeId || null,
        roles,
        isSuperAdmin
      );
    }

    // 4. Ghi nhận nhật ký tác vụ vào erp.ai_runs phục vụ kiểm toán (Mục 1 docs/THIET_KE_KIEN_TRUC_AI_AGENT.md)
    let aiRunId: string | undefined;
    try {
      const pool = getDbPool();
      const insertRes = await pool.query(
        `INSERT INTO erp.ai_runs (
           organization_id, agent_code, status, model, input_snapshot, output_json,
           schema_version, request_id, requested_by, created_by
         )
         VALUES ($1, 'GENERAL_ADVISOR', $2, $3, $4, $5, 'v2', $6, $7, $8)
         RETURNING id`,
        [
          orgId,
          status,
          modelName,
          JSON.stringify({ prompt: req.prompt }),
          JSON.stringify({ answer, toolsUsed, dataSources, permissionWarnings, steps: agentSteps }),
          crypto.randomUUID(),
          membershipId,
          req.userId,
        ]
      );
      aiRunId = insertRes.rows[0]?.id;
    } catch (logErr) {
      console.error("Không thể ghi log ai_runs:", logErr);
    }

    return {
      answer,
      toolsUsed,
      dataSources,
      permissionWarnings: permissionWarnings.length > 0 ? permissionWarnings : undefined,
      aiRunId,
      actionProposal,
      steps: agentSteps,
    };
  }

  /**
   * Fallback có grounding dữ liệu nội bộ khi offline / không có API key
   * Tích hợp kiểm soát phân quyền Zero-Trust RBAC & Xác thực đầu vào (Clarification)
   */
  private static async generateDeterministicFallback(
    prompt: string,
    capabilities: Record<string, any>,
    employeeId: string | null,
    roles?: Array<{ code: string; name: string }>,
    isSuperAdmin: boolean = false
  ): Promise<string> {
    const p = prompt.toLowerCase();
    const pool = getDbPool();
    const orgId = await this.getOrgId();
    const roleNames = roles?.map((r) => r.name).join(", ") || "Nhân viên";
    const hasPerm = (perm: string) => isSuperAdmin || Boolean((capabilities as any)[perm]?.isEnabled);

    // =========================================================================
    // PHẦN 1: XỬ LÝ KHI THIẾU THÔNG TIN ĐẦU VÀO (INPUT VALIDATION & CLARIFICATION)
    // =========================================================================

    // Tác vụ A: Xuất kho vật tư
    if (
      p.includes("xuất kho") ||
      p.includes("lập phiếu xuất") ||
      p.includes("cấp vật tư") ||
      p.includes("lấy vật tư") ||
      p.includes("xuất vật tư")
    ) {
      if (!hasPerm("stock_document.read") && !hasPerm("inventory.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền thực hiện hoặc tra cứu chứng từ xuất kho (\`stock_document.read\` / \`inventory.read\`).`;
      }
      const hasItem =
        p.includes("tấm") ||
        p.includes("alu") ||
        p.includes("sắt") ||
        p.includes("led") ||
        p.includes("bạt") ||
        p.includes("mica") ||
        p.includes("keo") ||
        p.includes("cây") ||
        p.includes("cuộn") ||
        p.includes("nguồn");
      const hasQuantity = /\d+/.test(p);
      const hasTarget =
        p.includes("dự án") ||
        p.includes("công trình") ||
        p.includes("prj-") ||
        p.includes("cho ") ||
        p.includes("vincom") ||
        p.includes("lotte");

      if (!hasItem || !hasQuantity || !hasTarget) {
        return `## ⚠️ Yêu Cầu Bổ Sung Thông Tin Xuất Kho Vật Tư

Hệ thống nhận thấy yêu cầu lập phiếu xuất kho của bạn chưa đầy đủ các thông số bắt buộc để khởi tạo chứng từ:

### ❓ Vui lòng cung cấp thêm các thông tin sau:
1. **Tên hoặc quy cách vật tư:** (ví dụ: *Alu Alcorest EV2002 3mm*, *Sắt hộp 30x30x1.4mm*, *LED module 3 bóng 12V*)
2. **Số lượng & Đơn vị tính:** (ví dụ: *15 tấm*, *20 cây*, *500 bóng*)
3. **Mã dự án hoặc Tên công trình tiếp nhận:** (ví dụ: *PRJ-001*, *Biển hiệu Vincom Plaza*)
4. **Kho nguồn xuất (tùy chọn):** (ví dụ: *Kho Xưởng chính*, *Kho Xe lưu động 29C-123.45*)

---
### 💡 Mẫu cú pháp gợi ý:
> *"Xuất 10 tấm Alu Alcorest EV2002 dày 3mm và 5 cây sắt hộp 30x30 cho công trình Vincom từ Kho Xưởng"*`;
      }
    }

    // Tác vụ B: Báo cáo nhật trình / Tiến độ thi công
    if (
      p.includes("báo cáo tiến độ") ||
      p.includes("nộp nhật trình") ||
      p.includes("báo cáo thi công") ||
      p.includes("cập nhật tiến độ")
    ) {
      const hasProgress = /\d+\s*%/.test(p) || p.includes("hoàn thành") || p.includes("xong");
      const hasTarget =
        p.includes("dự án") ||
        p.includes("công trình") ||
        p.includes("task") ||
        p.includes("hạng mục") ||
        p.includes("tk-") ||
        p.includes("prj-") ||
        p.includes("vincom");

      if (!hasProgress || !hasTarget) {
        return `## ⚠️ Yêu Cầu Bổ Sung Thông Tin Báo Cáo Tiến Độ

Hệ thống nhận thấy bạn muốn nộp nhật trình / cập nhật tiến độ nhưng chưa cung cấp đủ chi tiết:

### ❓ Vui lòng cung cấp thêm:
1. **Tên công trình / Mã công việc (Task):** (ví dụ: *Dự án Vincom - Thi công khung sắt*, *TK-001-THICONG*)
2. **Tiến độ hoàn thành (%):** (ví dụ: *80%*, *100%*)
3. **Nội dung công việc thực tế đã làm:** (ví dụ: *Đã hàn xong khung xương sắt hộp và sơn chống rỉ*)
4. **Vật tư phát sinh (nếu có):** (ví dụ: *Phát sinh thêm 2 cây sắt 30x30 do điều chỉnh chân gia cố*)

---
### 💡 Mẫu cú pháp gợi ý:
> *"Báo cáo tiến độ hoàn thành 80% hạng mục Thi công khung sắt dự án Vincom: Đã đan xương xong ô cờ 50x50cm và sơn chống rỉ"*`;
      }
    }

    // Tác vụ C: Lập phiếu chi / Đề nghị thanh toán tiền mặt phát sinh
    if (
      p.includes("lập phiếu chi") ||
      p.includes("chi tiền") ||
      p.includes("tạm ứng") ||
      p.includes("thanh toán phát sinh") ||
      p.includes("đề nghị thanh toán")
    ) {
      if (!hasPerm("payment.read") && !hasPerm("project_finance.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền lập hoặc truy cập phiếu chi tiền mặt (\`payment.read\` / \`project_finance.read\`). Vui lòng liên hệ Kế toán để được hỗ trợ.`;
      }
      const hasAmount =
        /\d+/.test(p) &&
        (p.includes("đ") ||
          p.includes("k") ||
          p.includes("tr") ||
          p.includes("triệu") ||
          p.includes("nghìn") ||
          p.includes("vnd") ||
          p.includes("vnđ"));
      const hasReason = p.length > 25;

      if (!hasAmount || !hasReason) {
        return `## ⚠️ Yêu Cầu Bổ Sung Thông Tin Lập Phiếu Chi

Hệ thống cần các thông tin cơ bản sau để tạo bản xem trước phiếu chi / tạm ứng tiền mặt:

### ❓ Vui lòng cung cấp thêm:
1. **Số tiền cần chi:** (ví dụ: *2.500.000 VNĐ*, *500.000 đ*)
2. **Lý do / Mục đích chi cụ thể:** (ví dụ: *Thuê xe cẩu tự hành 3.5 tấn lắp đặt biển pano*, *Mua ốc vít nở và keo phát sinh*)
3. **Dự án / Phân xưởng liên quan:** (ví dụ: *Công trình Vincom*, *Xưởng Sản Xuất*)

---
### 💡 Mẫu cú pháp gợi ý:
> *"Lập phiếu chi 2.500.000đ tiền thuê xe cẩu tự hành 3.5 tấn phục vụ lắp biển dự án Vincom"*`;
      }
    }

    // Tác vụ D: Biên bản nghiệm thu bàn giao
    if (
      p.includes("lập nghiệm thu") ||
      p.includes("lập biên bản bàn giao") ||
      p.includes("nghiệm thu công trình") ||
      p.includes("nghiệm thu dự án")
    ) {
      const hasTarget =
        p.includes("dự án") ||
        p.includes("công trình") ||
        p.includes("cho ") ||
        p.includes("prj-") ||
        p.includes("vincom") ||
        p.length > 25;

      if (!hasTarget) {
        return `## ⚠️ Yêu Cầu Bổ Sung Thông Tin Nghiệm Thu Bàn Giao

Hệ thống cần thông tin dự án cụ thể để khởi tạo biên bản nghiệm thu:

### ❓ Vui lòng cung cấp thêm:
1. **Mã dự án hoặc Tên công trình:** (ví dụ: *PRJ-001*, *Biển hiệu Vincom Plaza*)
2. **Hạng mục nghiệm thu:** (ví dụ: *Toàn bộ biển mặt tiền và bộ chữ LED phát sáng*)
3. **Đại diện khách hàng ký nhận (nếu có):** (ví dụ: *Anh Tuấn - Giám sát mặt bằng*)

---
### 💡 Mẫu cú pháp gợi ý:
> *"Lập biên bản nghiệm thu bàn giao toàn bộ hạng mục biển mặt tiền công trình Vincom cho anh Tuấn"*`;
      }
    }

    // =========================================================================
    // PHẦN 2: TRA CỨU DỮ LIỆU & KIỂM SOÁT PHÂN QUYỀN ZERO-TRUST RBAC
    // =========================================================================

    // 1. Hỏi về tài chính / dòng tiền / quỹ tiền / ngân hàng / lợi nhuận / doanh thu (CẤP BAN GIÁM ĐỐC)
    if (
      p.includes("tài chính") ||
      p.includes("dòng tiền") ||
      p.includes("ngân hàng") ||
      p.includes("tiền mặt") ||
      p.includes("quỹ tiền") ||
      p.includes("số dư") ||
      p.includes("lợi nhuận") ||
      p.includes("doanh thu") ||
      p.includes("p&l")
    ) {
      if (!hasPerm("project_finance.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền truy cập dữ liệu tài chính, dòng tiền và số dư ngân hàng (\`project_finance.read\`) theo chính sách phân quyền bảo mật nội bộ của Signage ERP.\n\n💡 Vui lòng liên hệ Kế toán trưởng hoặc Ban Giám Đốc nếu bạn cần tra cứu số liệu tài chính điều hành.`;
      }
      try {
        const kpis = await FinanceService.getExecutiveKpis();
        const accounts = await FinanceService.listCashAccounts();

        const accountRows = accounts
          .map(
            (a) =>
              `| **${a.code}** | ${a.name} | ${a.kind === "cash" ? "💵 Tiền mặt" : "🏦 Ngân hàng"} | **${Number(a.balance).toLocaleString("vi-VN")} ${a.currency}** |`
          )
          .join("\n");

        return `## 💳 Tình Hình Quỹ Tiền Mặt & Số Dư Ngân Hàng

### 1. Chỉ Số Tài Chính Tổng Hợp:
- **Doanh thu tích lũy:** **${kpis.totalRevenue.toLocaleString("vi-VN")} đ**
- **Chi phí sản xuất & thi công:** **${kpis.totalExpense.toLocaleString("vi-VN")} đ**
- **Tổng số dư thanh khoản:** **${(kpis.cashBalance + kpis.bankBalance).toLocaleString("vi-VN")} đ**

### 2. Danh Sách Tài Khoản Thanh Toán:
| Mã Quỹ | Tên Tài Khoản | Loại Quỹ | Số Dư Hiện Tại |
| :--- | :--- | :--- | :--- |
${accountRows}`;
      } catch {
        return "Hiện chưa thể kết nối số liệu tài chính.";
      }
    }

    // 2. Hỏi về công nợ doanh nghiệp
    if (
      p.includes("công nợ") ||
      p.includes("phải thu") ||
      p.includes("phải trả") ||
      p.includes("thu tiền") ||
      p.includes("trả nợ")
    ) {
      if (!hasPerm("receivable.read") && !hasPerm("payable.read") && !hasPerm("project_finance.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền xem thông tin công nợ doanh nghiệp (\`receivable.read\` / \`payable.read\`).\n\n💡 Vui lòng liên hệ Phòng Kế toán hoặc Ban Giám Đốc để được cấp quyền hoặc hỗ trợ đối soát.`;
      }
      try {
        const receivables = await FinanceService.listOpenItems("receivable");
        const payables = await FinanceService.listOpenItems("payable");
        const totalRec = receivables.reduce((s, r) => s + (Number(r.remainingAmount ?? r.originalAmount) || 0), 0);
        const totalPay = payables.reduce((s, p) => s + (Number(p.remainingAmount ?? p.originalAmount) || 0), 0);

        return `## 💰 Báo Cáo Đối Soát Công Nợ Doanh Nghiệp

### 1. Tổng Hợp Số Liệu Dòng Tiền:
- **Công nợ phải thu (Khách hàng nợ công ty):** **${totalRec.toLocaleString("vi-VN")} VNĐ** (${receivables.length} khoản)
- **Công nợ phải trả (Công ty nợ nhà cung cấp):** **${totalPay.toLocaleString("vi-VN")} VNĐ** (${payables.length} khoản)
- **Chênh lệch vị thế nợ:** **${(totalRec - totalPay).toLocaleString("vi-VN")} VNĐ**

### 2. Các Khoản Phải Thu Khách Hàng Trọng Yếu:
| Mã Đối Tác | Khách Hàng / Đối Tác | Số Tiền Nợ | Hạn Thanh Toán | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
${receivables
  .slice(0, 6)
  .map(
    (r) =>
      `| **${r.partnerCode}** | ${r.partnerName} | **${Number(r.remainingAmount ?? r.originalAmount).toLocaleString("vi-VN")}đ** | ${r.dueDate || "N/A"} | ${r.status} |`
  )
  .join("\n") || "| - | Không có khoản phải thu tồn đọng | - | - | - |"}

### 3. Các Khoản Phải Trả Nhà Cung Cấp:
| Mã Đối Tác | Nhà Cung Cấp | Số Tiền Nợ | Hạn Thanh Toán | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
${payables
  .slice(0, 6)
  .map(
    (p) =>
      `| **${p.partnerCode}** | ${p.partnerName} | **${Number(p.remainingAmount ?? p.originalAmount).toLocaleString("vi-VN")}đ** | ${p.dueDate || "N/A"} | ${p.status} |`
  )
  .join("\n") || "| - | Không có khoản phải trả tồn đọng | - | - | - |"}`;
      } catch {
        return "Hiện chưa thể kết nối dữ liệu công nợ.";
      }
    }

    // 3. Hỏi về danh sách nhân sự / cán bộ công nhân viên
    if (
      p.includes("danh sách nhân sự") ||
      p.includes("danh sách nhân viên") ||
      p.includes("nhân sự") ||
      p.includes("nhân viên") ||
      p.includes("thợ xưởng") ||
      p.includes("phòng ban")
    ) {
      if (!hasPerm("employee.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền truy cập danh sách nhân sự toàn công ty (\`employee.read\`). Bạn có thể tra cứu thông tin nhiệm vụ phân công cho chính bạn bằng cách hỏi *'Hôm nay tôi có nhiệm vụ gì?'*.`;
      }
      try {
        const empRes = await pool.query(
          `SELECT e.id, e.code, e.name, e.phone, e.is_active, d.name as dept_name
           FROM erp.employees e
           LEFT JOIN erp.departments d ON d.id = e.department_id
           WHERE e.organization_id = $1 AND e.is_active = true
           ORDER BY e.code ASC`,
          [orgId]
        );
        if (empRes.rows.length === 0) {
          return "Hiện hệ thống chưa có dữ liệu hồ sơ nhân sự trong cơ sở dữ liệu.";
        }
        const rows = empRes.rows
          .map(
            (e) =>
              `| **${e.code}** | ${e.name} | ${e.dept_name || "Chưa phân bổ"} | ${e.phone || "N/A"} | 🟢 Đang làm việc |`
          )
          .join("\n");

        return `## 👥 Danh Sách Nhân Sự & Cán Bộ Công Nhân Viên (Signage ERP)

Tổng cộng ghi nhận **${empRes.rows.length} nhân sự** đang hoạt động trong toàn hệ thống:

| Mã NV | Họ và Tên | Phòng Ban / Phân Xưởng | Số Điện Thoại | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
${rows}

---
💡 **Gợi ý tiếp theo:** Bạn có thể hỏi:
- *"Tuần này có ai làm gì không?"* (xem điều độ phân công công việc)
- *"Hôm nay tôi có nhiệm vụ gì?"* (xem việc cá nhân)`;
      } catch {
        return "Hiện chưa thể kết nối dữ liệu nhân sự.";
      }
    }

    // 4. Hỏi về điều độ công việc của mọi người / những người khác / ai làm gì
    if (
      p.includes("ai làm gì") ||
      p.includes("ai đang làm") ||
      p.includes("những người khác") ||
      p.includes("người khác") ||
      p.includes("tuần này có ai") ||
      p.includes("điều độ") ||
      p.includes("phân công") ||
      p.includes("tiến độ thợ")
    ) {
      if (!hasPerm("project.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền xem điều độ phân công công việc toàn công ty (\`project.read\`). Bạn có thể hỏi *'Hôm nay tôi có việc gì?'* để xem nhiệm vụ của chính mình.`;
      }
      try {
        const taskRes = await pool.query(
          `SELECT t.code as task_code, t.title as task_title, t.status, t.due_at, t.progress_percent,
                  p.code as project_code, p.name as project_name,
                  e.code as employee_code, e.name as employee_name
           FROM erp.tasks t
           JOIN erp.projects p ON p.id = t.project_id
           LEFT JOIN erp.task_assignees ta ON ta.task_id = t.id AND ta.valid_to IS NULL
           LEFT JOIN erp.employees e ON e.id = ta.employee_id
           WHERE t.organization_id = $1
           ORDER BY CASE WHEN t.status = 'doing' THEN 1 WHEN t.status = 'todo' THEN 2 ELSE 3 END, t.due_at ASC
           LIMIT 20`,
          [orgId]
        );

        if (taskRes.rows.length === 0) {
          return "Hiện hệ thống chưa ghi nhận đầu việc nào được phân công trong các dự án.";
        }

        const rows = taskRes.rows
          .map((r) => {
            const dueDate = r.due_at ? new Date(r.due_at).toLocaleDateString("vi-VN") : "Chưa đặt";
            const progress = Number(r.progress_percent) || 0;
            const statusLabel =
              r.status === "doing"
                ? "🟡 Đang làm"
                : r.status === "todo"
                  ? "⚪ Chưa làm"
                  : r.status === "done"
                    ? "🟢 Hoàn thành"
                    : r.status;
            return `| **${r.employee_name || "Chưa gán"}** | ${r.task_title} | *${r.project_name}* | **${progress}%** | ${statusLabel} | ${dueDate} |`;
          })
          .join("\n");

        return `## 📋 Điều Độ & Phân Công Nhiệm Vụ Nhân Sự (Signage ERP)

Hệ thống ghi nhận **${taskRes.rows.length} đầu việc** của các bộ phận xưởng sản xuất và thi công hiện trường:

| Nhân Sự Phụ Trách | Công Việc / Hạng Mục | Dự Án / Công Trình | Tiến Độ | Trạng Thái | Hạn Hoàn Thành |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}

---
💡 **Gợi ý tiếp theo:**
- *"Tiến độ dự án Vincom hiện tại ra sao?"*
- *"Hôm nay có chuyến xe nào giao hàng ra công trình?"*`;
      } catch {
        return "Hiện chưa thể kết nối dữ liệu điều độ công việc.";
      }
    }

    // 5. Hỏi về công việc riêng của bản thân
    if (
      p.includes("việc của tôi") ||
      p.includes("nhiệm vụ của tôi") ||
      p.includes("tôi có việc gì") ||
      p.includes("hôm nay tôi làm gì")
    ) {
      if (employeeId) {
        try {
          const myTasks = await ProjectService.getMyTasks(employeeId);
          if (myTasks.length === 0) {
            return `## 📋 Danh Sách Nhiệm Vụ Được Gán Cho Bạn\n✅ Hiện bạn không có đầu việc nào tồn đọng hoặc quá hạn. Tất cả các task đã hoàn thành hoặc chưa tới lịch phân công.`;
          }
          const rows = myTasks
            .map(
              (t) =>
                `| **${t.code}** | ${t.title} | *${t.projectName}* | **${t.progressPercent}%** | ${t.status} | ${t.dueAt ? new Date(t.dueAt).toLocaleDateString("vi-VN") : "N/A"} |`
            )
            .join("\n");
          return `## 📋 Danh Sách Nhiệm Vụ Phân Công Cho Bạn:

| Mã Task | Tên Đầu Việc | Dự Án | Tiến Độ | Trạng Thái | Hạn Hoàn Thành |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
        } catch {
          return "Không thể tải danh sách nhiệm vụ cá nhân.";
        }
      }
      return "Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên trong hệ thống Signage ERP.";
    }

    // 6. Hỏi về tấm lẻ / đề-xê alu, mica dở
    if (
      p.includes("tấm lẻ") ||
      p.includes("đề-xê") ||
      p.includes("de-xe") ||
      p.includes("dở") ||
      p.includes("thừa")
    ) {
      if (!hasPerm("inventory.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền tra cứu tồn kho tấm lẻ (\`inventory.read\`).`;
      }
      try {
        const remnants = await InventoryService.listRemnants();
        if (remnants.length === 0) {
          return "Hiện xưởng không ghi nhận tấm lẻ hoặc đề-xê nào đang lưu kho.";
        }
        const rows = remnants
          .slice(0, 10)
          .map(
            (r) =>
              `| **${r.lotCode}** | ${r.itemName} | **${r.lengthMm} x ${r.widthMm} mm** | ${r.areaM2} m² | **${r.onHandQty}** tấm | ${r.warehouseName} | ${r.binLabel || "Chờ xếp"} |`
          )
          .join("\n");
        return `## 🧩 Danh Mục Tấm Lẻ & Đề-Xê Tồn Kho Xưởng (Tái Sử Dụng)

Xưởng hiện có **${remnants.length} lô tấm lẻ** có thể tận dụng gia công tiết kiệm chi phí:

| Mã Lô | Tên Vật Tư | Kích Thước (Dài x Rộng) | Diện Tích | Số Lượng | Điểm Kho | Vị Trí Kệ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
      } catch {
        return "Hiện chưa thể tải danh sách tấm lẻ kho xưởng.";
      }
    }

    // 7. Hỏi về phiếu xuất nhập kho gần đây
    if (
      p.includes("phiếu kho") ||
      p.includes("phiếu xuất") ||
      p.includes("phiếu nhập") ||
      p.includes("xuất kho") ||
      p.includes("nhập kho")
    ) {
      if (!hasPerm("stock_document.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền xem phiếu chứng từ kho (\`stock_document.read\`).`;
      }
      try {
        const docs = await InventoryService.listDocuments();
        if (docs.length === 0) {
          return "Hiện chưa có phiếu kho nào được ghi nhận.";
        }
        const rows = docs
          .slice(0, 8)
          .map(
            (d) =>
              `| **${d.code}** | ${d.type === "receipt" ? "📥 Nhập" : d.type === "issue" ? "📤 Xuất" : "🔄 Chuyển"} | ${d.purpose} | ${d.status} | **${d.totalAmount.toLocaleString("vi-VN")}đ** | ${d.createdAt ? new Date(d.createdAt).toLocaleDateString("vi-VN") : "N/A"} |`
          )
          .join("\n");
        return `## 📑 Báo Cáo Phiếu Xuất Nhập Kho Gần Đây

Ghi nhận **${docs.length} phiếu chứng từ kho**:

| Mã Phiếu | Loại Phiếu | Mục Đích / Lý Do | Trạng Thái | Tổng Giá Trị | Ngày Lập |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
      } catch {
        return "Hiện chưa thể tải danh sách phiếu kho.";
      }
    }

    // 8. Hỏi về tồn kho / hàng hóa chung
    const isInventoryQuery =
      p.includes("tồn") ||
      p.includes("kho") ||
      p.includes("vật tư") ||
      p.includes("hàng hóa") ||
      p.includes("hàng còn") ||
      p.includes("còn hàng") ||
      p.includes("sắt") ||
      p.includes("alu") ||
      p.includes("led") ||
      p.includes("bạt") ||
      p.includes("mica") ||
      p.includes("keo");

    if (isInventoryQuery) {
      if (!hasPerm("inventory.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền tra cứu tồn kho vật tư (\`inventory.read\`).`;
      }
      try {
        const itemResult = await InventoryService.listItems({ limit: 12 });
        const items = itemResult.items;
        const summary = await InventoryService.getInventorySummary();

        const rows = items
          .map(
            (i) =>
              `| **${i.code}** | ${i.name} | **${i.totalOnHand}** ${i.baseUnitName} | ${i.minQty} | ${i.binLabel || "Chờ xếp"} |`
          )
          .join("\n");

        return `## 📦 Báo Cáo Tồn Kho Vật Tư Thực Tế (Signage ERP)

Hệ thống ghi nhận tổng cộng **${summary.totalItems}** mặt hàng, lưu trữ tại **${summary.totalWarehouses}** điểm kho.

### Danh mục tồn kho trọng yếu:
| Mã SKU | Tên Vật Tư / Quy Cách | Tồn Kho Thực Tế | Định Mức Tối Thiểu | Vị Trí Lưu Kho |
| :--- | :--- | :--- | :--- | :--- |
${rows}

---
💡 **Gợi ý tra cứu:** Bạn có thể hỏi cụ thể như:
- *"Kho còn bao nhiêu tấm Alu Alcorest?"*
- *"Kiểm tra tồn kho bạt 3M và keo Titebond"*
- *"Có tấm lẻ alu nào tận dụng được không?"*`;
      } catch {
        return "⚠️ Hiện chưa thể kết nối dữ liệu kho. Vui lòng kiểm tra lại kết nối cơ sở dữ liệu.";
      }
    }

    // 9. Hỏi về khách hàng / đối tác CRM
    if (
      p.includes("khách hàng") ||
      p.includes("đối tác") ||
      p.includes("crm") ||
      p.includes("hợp đồng khách")
    ) {
      if (!hasPerm("customer.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền truy cập danh sách khách hàng & CRM (\`customer.read\`).`;
      }
      try {
        const customers = await CrmService.listCustomers();
        if (customers.length === 0) {
          return "Hiện hệ thống chưa ghi nhận thông tin khách hàng.";
        }
        const rows = customers
          .slice(0, 10)
          .map(
            (c) =>
              `| **${c.code}** | ${c.name} | ${c.phone || "N/A"} | **${c.totalReceivable.toLocaleString("vi-VN")}đ** | ${c.creditLimit.toLocaleString("vi-VN")}đ | ${c.overdueAmount > 0 ? `⚠️ ${c.overdueAmount.toLocaleString("vi-VN")}đ` : "🟢 0đ"} |`
          )
          .join("\n");
        return `## 🏢 Danh Sách Khách Hàng & Đối Tác (Signage CRM)

Ghi nhận **${customers.length} khách hàng** trong hệ thống:

| Mã KH | Tên Đơn Vị / Khách Hàng | Điện Thoại | Phải Thu Hiện Tại | Hạn Mức Tín Dụng | Nợ Quá Hạn |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
      } catch {
        return "Hiện chưa thể kết nối danh sách khách hàng.";
      }
    }

    // 10. Hỏi về xe cộ, chuyến hàng giao ra công trình
    if (
      p.includes("xe") ||
      p.includes("chuyến xe") ||
      p.includes("vận chuyển") ||
      p.includes("giao hàng") ||
      p.includes("điều xe") ||
      p.includes("tài xế")
    ) {
      try {
        const vehicles = await ProjectService.listVehicles();
        const trips = await ProjectService.listTrips();

        const vehicleRows = vehicles
          .map(
            (v) =>
              `| **${v.code}** | **${v.plateNo}** | ${v.isActive ? "🟢 Sẵn sàng" : "🟡 Ngừng chạy"} |`
          )
          .join("\n");

        const tripRows = trips
          .slice(0, 6)
          .map(
            (t) =>
              `| **${t.code}** | *${t.projectName || "Giao hàng"}* | **${t.vehiclePlate}** | ${t.driverName} | ${t.status} | ${t.plannedDeparture ? new Date(t.plannedDeparture).toLocaleString("vi-VN") : "N/A"} |`
          )
          .join("\n");

        return `## 🚚 Đội Xe Vận Chuyển & Điều Động Giao Biển Hiệu

### 1. Danh Sách Đội Xe Xưởng:
| Mã Xe | Biển Số Xe | Trạng Thái Hoạt Động |
| :--- | :--- | :--- |
${vehicleRows || "| - | Chưa cấu hình danh sách xe | - |"}

### 2. Lộ Trình Giao Hàng & Điều Xe Gần Nhất:
| Mã Chuyến | Công Trình Đến | Biển Số Xe | Tài Xế Lái | Tình Trạng | Giờ Xuất Bến |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tripRows || "| - | Không có chuyến xe nào đang chạy | - | - | - | - |"}`;
      } catch {
        return "Hiện chưa thể kết nối dữ liệu đội xe.";
      }
    }

    // 11. Hỏi về chấm công / ngày công
    if (
      p.includes("chấm công") ||
      p.includes("ngày công") ||
      p.includes("đi muộn") ||
      p.includes("tăng ca") ||
      p.includes("nghỉ phép")
    ) {
      if (!hasPerm("attendance.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền xem bảng tổng hợp chấm công toàn công ty (\`attendance.read\`).`;
      }
      try {
        const attendances = await FinanceService.listAttendanceSummary();
        if (attendances.length === 0) {
          return "Hiện chưa có dữ liệu chấm công cho kỳ này.";
        }
        const rows = attendances
          .slice(0, 10)
          .map(
            (a) =>
              `| **${a.employeeCode}** | ${a.employeeName} | **${a.workDays}** ngày | **${a.totalCheckIns}** | ${a.lastCheckInAt ? new Date(a.lastCheckInAt).toLocaleDateString("vi-VN") : "N/A"} |`
          )
          .join("\n");

        return `## ⏱️ Bảng Tổng Hợp Chấm Công Nhân Sự

Ghi nhận **${attendances.length} lượt công** của cán bộ nhân viên:

| Mã NV | Họ và Tên | Số Ngày Công | Tổng Lượt Điểm Danh | Điểm Danh Cuối |
| :--- | :--- | :--- | :--- | :--- |
${rows}`;
      } catch {
        return "Hiện chưa thể kết nối dữ liệu chấm công.";
      }
    }

    // 12. Hỏi về nghiệm thu công trình
    if (
      p.includes("nghiệm thu") ||
      p.includes("bàn giao") ||
      p.includes("ký biên bản")
    ) {
      if (!hasPerm("acceptance.read") && !hasPerm("project.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền xem biên bản nghiệm thu (\`acceptance.read\`).`;
      }
      try {
        const accRes = await pool.query(
          `SELECT a.code as acceptance_code, a.status, a.accepted_at, a.customer_signer_name,
                  p.code as project_code, p.name as project_name,
                  pt.name as customer_name
           FROM erp.acceptances a
           JOIN erp.projects p ON p.id = a.project_id
           LEFT JOIN erp.partners pt ON pt.id = p.customer_id
           WHERE a.organization_id = $1
           ORDER BY a.created_at DESC LIMIT 10`,
          [orgId]
        );
        if (accRes.rows.length === 0) {
          return "Hiện chưa có biên bản nghiệm thu công trình nào được ghi nhận.";
        }
        const rows = accRes.rows
          .map(
            (r) =>
              `| **${r.acceptance_code}** | ${r.project_name} | ${r.customer_name || "N/A"} | ${r.status === "approved" ? "🟢 Đã duyệt" : "🟡 Chờ duyệt"} | ${r.customer_signer_name || "Chưa ký"} | ${r.accepted_at ? new Date(r.accepted_at).toLocaleDateString("vi-VN") : "Chưa hoàn tất"} |`
          )
          .join("\n");

        return `## 📜 Danh Sách Biên Bản Nghiệm Thu & Bàn Giao Công Trình

| Mã Nghiệm Thu | Tên Dự Án | Khách Hàng | Trạng Thái | Người Đại Diện Ký | Ngày Nghiệm Thu |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}`;
      } catch {
        return "Hiện chưa thể kết nối dữ liệu nghiệm thu.";
      }
    }

    // 13. Hỏi về dự án / tiến độ thi công
    if (
      p.includes("dự án") ||
      p.includes("công trình") ||
      p.includes("tiến độ") ||
      p.includes("thi công") ||
      p.includes("lắp đặt")
    ) {
      if (!hasPerm("project.read")) {
        return `🔒 **Truy Cập Bị Từ Chối - Phân Quyền Hạn Chế**\n\nRất tiếc, tài khoản của bạn (${roleNames}) không có quyền xem danh sách dự án (\`project.read\`).`;
      }
      try {
        const projects = await ProjectService.listProjects();
        if (projects.length === 0) {
          return "Hiện hệ thống chưa ghi nhận dự án thi công nào đang chạy.";
        }
        const rows = projects
          .slice(0, 8)
          .map(
            (pr) =>
              `| **${pr.code}** | **${pr.name}** | ${pr.customerName || "N/A"} | **${pr.progressPercent}%** | *${pr.status}* | ${pr.dueDate || "Chưa đặt"} |`
          )
          .join("\n");
        return `## 🏗️ Tình Hình Triển Khai Các Dự Án Biển Hiệu (Signage WBS)

Hệ thống ghi nhận **${projects.length} dự án** đang trong các giai đoạn khảo sát, gia công xưởng và thi công lắp đặt:

| Mã Dự Án | Tên Công Trình | Khách Hàng | Tiến Độ | Trạng Thái | Hạn Hoàn Thành |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}

*Số liệu được đồng bộ trực tiếp từ cây công việc WBS thời gian thực.*`;
      } catch {
        return "Hiện chưa thể tải danh sách dự án.";
      }
    }

    // 14. Tư vấn kỹ thuật thi công biển bảng mặc định
    if (
      p.includes("hộp đèn 3m") ||
      p.includes("định mức") ||
      p.includes("quy cách") ||
      p.includes("kết cấu") ||
      p.includes("pano") ||
      p.includes("chữ nổi")
    ) {
      return `## 💡 Khuyến Nghị Quy Cách & Định Mức Biển Hộp Đèn 3M (Signage ERP)

Dựa trên tiêu chuẩn kỹ thuật thi công biển hiệu quảng cáo ngoài trời:

1. **Khung Kết Cấu Sắt Hộp:**
   - Sắt hộp mạ kẽm **$30\\times 30\\times 1.4\\text{mm}$** hoặc **$40\\times 40\\text{mm}$** tùy khẩu độ gió.
   - Kỹ thuật đan xương: Ô cờ tiêu chuẩn **$500\\times 500\\text{mm}$** chống võng bề mặt bạt khi căng kéo.
2. **Bề Mặt Bạt Khổ Lớn:**
   - Bạt **3M Panagraphics II / III** không gân, in công nghệ **UV 2 lớp mực (Double strike)** xuyên sáng rực rỡ, độ bền màu ngoài trời $\\ge 3$ năm.
3. **Hệ Thống Chiếu Sáng LED:**
   - LED Module **3 bóng mắt lồi len góc rộng $160^\\circ$** (NC Hàn Quốc hoặc GOQ).
   - Mật độ tối ưu: **35 – 40 bóng $/\\text{m}^2$** để ánh sáng tỏa đều, hoàn toàn không lộ vệt sáng (hotspot).
4. **Bộ Nguồn Cấp Điện:**
   - Nguồn chống nước ngoài trời **IP67 12V 400W**.
   - Tính toán tải an toàn: Công suất thực tế tối đa $\\le 80\\%$ công suất danh định của bộ nguồn để đảm bảo độ bền linh kiện.`;
    }

    // 15. Chào hỏi / Hướng dẫn đầy đủ 7 phân hệ
    return `## 👋 Xin chào! Tôi là Trợ Lý Kỹ Thuật & Điều Hành Toàn Diện Signage ERP

Tôi được kết nối trực tiếp với toàn bộ 7 phân hệ dữ liệu thời gian thực của doanh nghiệp:

| Phân Hệ | Câu Hỏi Tra Cứu Mẫu |
| :--- | :--- |
| 👥 **Nhân Sự & Phân Công** | *"Danh sách nhân sự công ty"*, *"Tuần này có ai làm gì không?"* |
| 📦 **Kho & Tấm Lẻ Đề-xê** | *"Số lượng hàng hóa còn"*, *"Kho còn bao nhiêu tấm alu dở?"* |
| 🏗️ **Dự Án & Tiến Độ WBS** | *"Danh sách dự án đang thi công"*, *"Tiến độ dự án Vincom"* |
| 🚚 **Đội Xe & Logistics** | *"Hôm nay có chuyến xe nào giao hàng ra công trình?"* |
| 💰 **Tài Chính & Dòng Tiền** | *"Báo cáo công nợ phải thu phải trả"*, *"Số dư tài khoản ngân hàng"* |
| 🏢 **Khách Hàng & CRM** | *"Tra cứu danh sách khách hàng & hạn mức công nợ"* |
| 📐 **Kỹ Thuật & Định Mức** | *"Định mức vật tư làm biển hộp đèn 3M kích thước 8x2.5m"* |

Bạn cần tôi tra cứu số liệu hoặc hỗ trợ điều phối nội dung gì ngay bây giờ?`;
  }

  /**
   * Danh sách nhật ký AI Runs phục vụ Audit
   */
  static async listAiRuns(): Promise<AiRunRecord[]> {
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT id, organization_id as "organizationId", agent_code as "agentCode",
              status, model, input_snapshot as "inputSnapshot", output_json as "outputJson",
              schema_version as "schemaVersion", request_id as "requestId",
              requested_by as "requestedBy", created_at as "createdAt"
       FROM erp.ai_runs
       ORDER BY created_at DESC
       LIMIT 50`
    );
    return res.rows;
  }

  // ============ QUAN LY PHIEN CHAT (nhu ChatGPT) ============

  private static isMissingChatTable(err: any): boolean {
    const msg = String(err?.message || "");
    return err?.code === "42P01" || msg.includes("ai_chat_sessions") || msg.includes("ai_chat_messages");
  }

  static chatPersistenceAvailable = true;

  static async listChatSessions(userId: string, organizationId?: string) {
    const orgId = organizationId || (await this.getOrgId());
    try {
      const pool = getDbPool();
      const res = await pool.query(
        `SELECT id, title, mode, pinned,
                message_count as "messageCount",
                last_message_at as "lastMessageAt",
                created_at as "createdAt",
                updated_at as "updatedAt"
         FROM erp.ai_chat_sessions
         WHERE organization_id = $1 AND user_id = $2
         ORDER BY pinned DESC, updated_at DESC
         LIMIT 100`,
        [orgId, userId]
      );
      return res.rows;
    } catch (err: any) {
      if (this.isMissingChatTable(err)) {
        this.chatPersistenceAvailable = false;
        return [];
      }
      throw err;
    }
  }

  static async createChatSession(
    userId: string,
    opts?: { title?: string; mode?: "query" | "ingest"; organizationId?: string }
  ) {
    const orgId = opts?.organizationId || (await this.getOrgId());
    const pool = getDbPool();
    const res = await pool.query(
      `INSERT INTO erp.ai_chat_sessions (organization_id, user_id, title, mode, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $2, $2)
       RETURNING id, title, mode, pinned,
                 message_count as "messageCount",
                 last_message_at as "lastMessageAt",
                 created_at as "createdAt",
                 updated_at as "updatedAt"`,
      [orgId, userId, (opts?.title || "Doan chat moi").slice(0, 120), opts?.mode || "query"]
    );
    return { ...res.rows[0], organizationId: orgId };
  }

  static async getChatSession(sessionId: string, userId: string, organizationId?: string) {
    const orgId = organizationId || (await this.getOrgId());
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT id, title, mode, pinned,
              message_count as "messageCount",
              last_message_at as "lastMessageAt",
              created_at as "createdAt",
              updated_at as "updatedAt"
       FROM erp.ai_chat_sessions
       WHERE organization_id = $1 AND id = $2 AND user_id = $3`,
      [orgId, sessionId, userId]
    );
    return res.rows[0] || null;
  }

  static async renameChatSession(sessionId: string, userId: string, title: string, organizationId?: string) {
    const orgId = organizationId || (await this.getOrgId());
    const pool = getDbPool();
    const clean = (title || "").trim().slice(0, 120) || "Doan chat moi";
    await pool.query(
      `UPDATE erp.ai_chat_sessions SET title = $1, updated_by = $2 WHERE organization_id = $3 AND id = $4 AND user_id = $2`,
      [clean, userId, orgId, sessionId]
    );
    return this.getChatSession(sessionId, userId, orgId);
  }

  static async pinChatSession(sessionId: string, userId: string, pinned: boolean, organizationId?: string) {
    const orgId = organizationId || (await this.getOrgId());
    const pool = getDbPool();
    await pool.query(
      `UPDATE erp.ai_chat_sessions SET pinned = $1, updated_by = $2 WHERE organization_id = $3 AND id = $4 AND user_id = $2`,
      [pinned, userId, orgId, sessionId]
    );
    return this.getChatSession(sessionId, userId, orgId);
  }

  static async deleteChatSession(sessionId: string, userId: string, organizationId?: string) {
    const orgId = organizationId || (await this.getOrgId());
    const pool = getDbPool();
    await pool.query(
      `DELETE FROM erp.ai_chat_sessions WHERE organization_id = $1 AND id = $2 AND user_id = $3`,
      [orgId, sessionId, userId]
    );
    return true;
  }

  static async listChatMessages(sessionId: string, userId: string, organizationId?: string, limit = 200) {
    const orgId = organizationId || (await this.getOrgId());
    try {
      const pool = getDbPool();
      const session = await this.getChatSession(sessionId, userId, orgId);
      if (!session) return [];
      const res = await pool.query(
        `SELECT m.id, m.session_id as "sessionId", m.role, m.content,
                m.tools_used as "toolsUsed",
                m.data_sources as "dataSources",
                m.permission_warnings as "permissionWarnings",
                m.action_proposal as "actionProposal",
                m.ai_run_id as "aiRunId",
                m.created_at as "createdAt",
                (r.output_json->'steps') as steps
         FROM erp.ai_chat_messages m
         LEFT JOIN erp.ai_runs r ON r.id = m.ai_run_id
         WHERE m.organization_id = $1 AND m.session_id = $2
         ORDER BY m.created_at ASC
         LIMIT $3`,
        [orgId, sessionId, Math.min(limit, 500)]
      );
      return res.rows.map((r: any) => ({
        ...r,
        toolsUsed: Array.isArray(r.toolsUsed) ? r.toolsUsed : [],
        dataSources: Array.isArray(r.dataSources) ? r.dataSources : [],
        permissionWarnings: Array.isArray(r.permissionWarnings) ? r.permissionWarnings : [],
        steps: Array.isArray(r.steps) ? r.steps : undefined,
      }));
    } catch (err: any) {
      if (this.isMissingChatTable(err)) {
        this.chatPersistenceAvailable = false;
        return [];
      }
      throw err;
    }
  }

  static async getChatHistoryForPrompt(sessionId: string, orgId: string, limit = 12) {
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT role, content FROM erp.ai_chat_messages
       WHERE organization_id = $1 AND session_id = $2
       ORDER BY created_at DESC LIMIT $3`,
      [orgId, sessionId, limit]
    );
    return res.rows.reverse() as Array<{ role: string; content: string }>;
  }

  static buildSessionTitleFromPrompt(prompt: string): string {
    const oneLine = prompt.replace(/\s+/g, " ").trim();
    if (oneLine.length <= 60) return oneLine || "Doan chat moi";
    return oneLine.slice(0, 57).trim() + "...";
  }

  static async appendChatMessage(params: {
    sessionId: string;
    userId: string;
    organizationId?: string;
    role: "user" | "assistant";
    content: string;
    toolsUsed?: string[];
    dataSources?: any[];
    permissionWarnings?: string[];
    actionProposal?: any | null;
    aiRunId?: string | null;
    steps?: AiAgentStepTrace[];
  }) {
    const orgId = params.organizationId || (await this.getOrgId());
    try {
      const pool = getDbPool();
      const session = await this.getChatSession(params.sessionId, params.userId, orgId);
      if (!session) return null;
      const res = await pool.query(
        `INSERT INTO erp.ai_chat_messages
           (organization_id, session_id, role, content, tools_used, data_sources, permission_warnings, action_proposal, ai_run_id, created_by)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10)
         RETURNING id, created_at as "createdAt"`,
        [
          orgId,
          params.sessionId,
          params.role,
          params.content,
          JSON.stringify(params.toolsUsed || []),
          JSON.stringify(params.dataSources || []),
          JSON.stringify(params.permissionWarnings || []),
          params.actionProposal ? JSON.stringify(params.actionProposal) : null,
          params.aiRunId || null,
          params.userId,
        ]
      );
      const isFirstUserMsg =
        (session.messageCount || 0) === 0 && params.role === "user";
      await pool.query(
        `UPDATE erp.ai_chat_sessions
         SET message_count = message_count + 1,
             last_message_at = now(),
             updated_at = now(),
             updated_by = $1,
             title = CASE WHEN $4::boolean THEN $5 ELSE title END
         WHERE organization_id = $2 AND id = $3`,
        [
          params.userId,
          orgId,
          params.sessionId,
          isFirstUserMsg,
          this.buildSessionTitleFromPrompt(params.content),
        ]
      );
      return res.rows[0];
    } catch (err: any) {
      if (this.isMissingChatTable(err)) {
        this.chatPersistenceAvailable = false;
        return null;
      }
      console.error("Luu tin nhan chat that bai:", err?.message);
      return null;
    }
  }

  /**
   * Dọn dẹp nhanh toàn bộ lịch sử AI Runs
   */
  static async clearAiRuns(organizationId?: string): Promise<number> {
    const orgId = organizationId || (await this.getOrgId());
    const pool = getDbPool();
    const res = await pool.query(
      `DELETE FROM erp.ai_runs WHERE organization_id = $1`,
      [orgId]
    );
    return res.rowCount || 0;
  }

  /**
   * BÓC TÁCH & SO KHỚP DỮ LIỆU ĐỂ TẠO BẢN NHÁP (ACTION PROPOSAL)
   * Giới hạn 4 chức năng cốt lõi:
   * 1. work_report: Báo cáo nhật trình thi công
   * 2. stock_issue: Phiếu xuất kho cấp vật tư
   * 3. acceptance: Biên bản nghiệm thu công trình
   * 4. disbursement: Phiếu chi / phát sinh tiền mặt
   */
  static async parseActionProposal(params: {
    actionType: IngestionActionType;
    text: string;
    userId: string;
    organizationId?: string;
  }): Promise<AiActionProposal> {
    const orgId = params.organizationId || (await this.getOrgId());
    const membershipId = await this.getMembershipId(params.userId);
    const pool = getDbPool();

    // 1. Tải danh sách thực thể ứng viên từ DB để so khớp
    const pRes = await pool.query(
      `SELECT p.id, p.code, p.name, pt.name as customer_name
       FROM erp.projects p
       LEFT JOIN erp.partners pt ON pt.id = p.customer_id
       WHERE p.organization_id = $1 AND p.status != 'completed'
       ORDER BY p.updated_at DESC LIMIT 20`,
      [orgId]
    );
    const candidateProjects = pRes.rows;

    let proposal: AiActionProposal;
    const lowerText = params.text.toLowerCase();

    const isProjectLevelProgress =
      params.actionType === "project_progress" ||
      (params.actionType === "work_report" &&
        (lowerText.includes("cả dự án") ||
          lowerText.includes("toàn bộ dự án") ||
          lowerText.includes("tiến độ dự án") ||
          lowerText.includes("dự án lên")));

    if (isProjectLevelProgress) {
      // 1. Tìm dự án khớp chính xác theo tên, mã hoặc tên khách hàng
      const matchedProj = candidateProjects.find(
        (p) =>
          lowerText.includes(p.name.toLowerCase()) ||
          lowerText.includes(p.code.toLowerCase()) ||
          (p.customer_name && lowerText.includes(p.customer_name.toLowerCase()))
      );

      if (!matchedProj) {
        throw new Error(
          "Không xác định được dự án cần cập nhật. Vui lòng cung cấp chính xác tên hoặc mã dự án (ví dụ: 'Highlands Coffee Vincom' hoặc 'DA-2026-001')."
        );
      }

      // 2. Tải tất cả tasks của dự án đó
      let tasks: any[] = [];
      const tRes = await pool.query(
        `SELECT t.id, t.code, t.title, t.progress_percent, t.status
         FROM erp.tasks t
         WHERE t.project_id = $1 AND t.organization_id = $2
         ORDER BY t.created_at ASC`,
        [matchedProj.id, orgId]
      );
      tasks = tRes.rows;

      // 3. Trích xuất % tiến độ
      let completionPercentage = 100;
      const percentMatch = params.text.match(/(\d{1,3})\s*%/);
      if (percentMatch) {
        completionPercentage = Math.min(100, Math.max(0, parseInt(percentMatch[1], 10)));
      } else {
        const numMatch = params.text.match(/(?:tiến độ|lên|đạt|mức)\s*(\d{1,3})\b/i);
        if (numMatch) {
          completionPercentage = Math.min(100, Math.max(0, parseInt(numMatch[1], 10)));
        } else if (
          lowerText.includes("hoàn thành") ||
          lowerText.includes("làm xong") ||
          lowerText.includes("nghiệm thu")
        ) {
          completionPercentage = 100;
        }
      }

      const draftPayload = {
        projectId: matchedProj.id,
        projectCode: matchedProj.code,
        projectName: matchedProj.name,
        completionPercentage,
        taskIds: tasks.map((t) => t.id),
        tasks: tasks.map((t) => ({
          id: t.id,
          code: t.code,
          title: t.title,
          currentProgress: Number(t.progress_percent) || 0,
          newProgress: completionPercentage,
        })),
        notes: params.text,
      };

      proposal = {
        actionType: "project_progress",
        actionTitle: `Cập Nhật Tiến Độ Toàn Bộ Dự Án: ${matchedProj.name}`,
        summary: `Đồng bộ tiến độ ${tasks.length} hạng mục công việc của dự án ${matchedProj.name} lên ${completionPercentage}%.`,
        matchedEntities: {
          project: { id: matchedProj.id, code: matchedProj.code, name: matchedProj.name },
          tasks: tasks.map((t) => ({
            id: t.id,
            code: t.code,
            title: t.title,
            currentProgress: Number(t.progress_percent) || 0,
            newProgress: completionPercentage,
          })),
        },
        draftPayload,
        status: "pending_confirmation",
      };
    } else if (params.actionType === "work_report") {
      // Tải tasks của các dự án
      const tRes = await pool.query(
        `SELECT t.id, t.code, t.title, t.project_id
         FROM erp.tasks t
         WHERE t.organization_id = $1 AND t.status != 'done'
         ORDER BY t.created_at DESC LIMIT 50`,
        [orgId]
      );
      const candidateTasks = tRes.rows;

      // 1. So khớp task được chỉ định cụ thể theo mã (VD: TK-001-THICONG, TK-001) hoặc tên tiêu đề
      let matchedTask = candidateTasks.find(
        (t) =>
          lowerText.includes(t.code.toLowerCase()) ||
          (t.code.toLowerCase().includes("thicong") && lowerText.includes("thi công")) ||
          lowerText.includes(t.title.toLowerCase())
      );

      // Nếu không tìm thấy, tra cứu task được phân công trực tiếp cho user này
      if (!matchedTask) {
        try {
          const { employeeId } = await AuthorizationService.getUserCapabilities(params.userId);
          if (employeeId) {
            const myAssignedTasks = await ProjectService.getMyTasks(employeeId);
            if (myAssignedTasks.length > 0) {
              matchedTask =
                candidateTasks.find((ct) => ct.id === myAssignedTasks[0].id) ||
                candidateTasks.find((ct) => ct.code === myAssignedTasks[0].code);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // 2. Tìm dự án tương ứng với task hoặc từ khóa
      let matchedProj = matchedTask
        ? candidateProjects.find((p) => p.id === matchedTask.project_id)
        : candidateProjects.find(
            (p) =>
              lowerText.includes(p.name.toLowerCase()) ||
              lowerText.includes(p.code.toLowerCase()) ||
              (p.customer_name && lowerText.includes(p.customer_name.toLowerCase()))
          );

      if (!matchedProj && candidateProjects.length > 0) {
        matchedProj = candidateProjects[0];
      }

      if (!matchedTask && matchedProj) {
        const projTasks = candidateTasks.filter((t) => t.project_id === matchedProj?.id);
        matchedTask = projTasks[0] || candidateTasks[0];
      }

      // Đảm bảo dự án đồng bộ 100% với task đã chọn
      if (matchedTask && matchedProj?.id !== matchedTask.project_id) {
        const correctProj = candidateProjects.find((p) => p.id === matchedTask.project_id);
        if (correctProj) matchedProj = correctProj;
      }

      // 3. Trích xuất số % tiến độ
      let completionPercentage = 80;
      const percentMatch = params.text.match(/(\d{1,3})\s*%/);
      if (percentMatch) {
        completionPercentage = Math.min(100, Math.max(0, parseInt(percentMatch[1], 10)));
      } else {
        const numMatch = params.text.match(/(?:tiến độ|lên|đạt|mức)\s*(\d{1,3})\b/i);
        if (numMatch) {
          completionPercentage = Math.min(100, Math.max(0, parseInt(numMatch[1], 10)));
        } else if (
          lowerText.includes("hoàn thành") ||
          lowerText.includes("làm xong") ||
          lowerText.includes("xong rồi")
        ) {
          completionPercentage = 100;
        }
      }

      // Trích xuất vật tư nếu có
      const materials: Array<{ name: string; qty: string; checked: boolean }> = [];
      if (params.text.toLowerCase().includes("keo")) {
        materials.push({ name: "Keo dán Titebond Heavy Duty", qty: "2 tuýp", checked: true });
      }
      if (params.text.toLowerCase().includes("vít") || params.text.toLowerCase().includes("oc")) {
        materials.push({ name: "Vít tự khoan mạ kẽm", qty: "1 bịch", checked: true });
      }

      const draftPayload = {
        taskId: matchedTask?.id,
        projectId: matchedProj?.id,
        workDate: new Date().toISOString().split("T")[0],
        notes: params.text,
        materials,
        completionPercentage,
        answers: {
          work_summary: params.text,
          materials_used:
            materials.map((m) => `${m.name} (${m.qty})`).join(", ") || "Không phát sinh",
        },
      };

      proposal = {
        actionType: "work_report",
        actionTitle: "Báo Cáo Nhật Trình Thi Công Hiện Trường",
        summary: `Ghi nhận tiến độ công việc cho dự án ${matchedProj?.name || "N/A"}`,
        matchedEntities: {
          project: matchedProj
            ? { id: matchedProj.id, code: matchedProj.code, name: matchedProj.name }
            : undefined,
          task: matchedTask
            ? { id: matchedTask.id, code: matchedTask.code, title: matchedTask.title }
            : undefined,
        },
        draftPayload,
        status: "pending_confirmation",
      };
    } else if (params.actionType === "stock_issue") {
      // Tải kho và vật tư ứng viên
      const wRes = await pool.query(
        `SELECT id, code, name FROM erp.warehouses WHERE organization_id = $1 AND is_active = true LIMIT 5`,
        [orgId]
      );
      const candidateWarehouses = wRes.rows;
      const defaultWarehouse =
        candidateWarehouses.find((w) => w.code.includes("XUONG")) || candidateWarehouses[0];

      const itemRes = await pool.query(
        `SELECT i.id, i.code, i.name, i.base_unit_id, u.name as unit_name
         FROM erp.items i
         JOIN erp.units u ON u.id = i.base_unit_id
         WHERE i.organization_id = $1 AND i.is_active = true LIMIT 50`,
        [orgId]
      );
      const candidateItems = itemRes.rows;

      const matchedProj =
        candidateProjects.find(
          (p) =>
            params.text.toLowerCase().includes(p.name.toLowerCase()) ||
            params.text.toLowerCase().includes(p.code.toLowerCase())
        ) || candidateProjects[0];

      // So khớp các mặt hàng được nhắc đến
      const lines: Array<{
        itemId: string;
        unitId: string;
        qty: number;
        code: string;
        name: string;
        unitName: string;
      }> = [];
      const lowerText = params.text.toLowerCase();

      for (const item of candidateItems) {
        if (
          lowerText.includes(item.name.toLowerCase()) ||
          lowerText.includes(item.code.toLowerCase())
        ) {
          lines.push({
            itemId: item.id,
            unitId: item.base_unit_id,
            qty: 5,
            code: item.code,
            name: item.name,
            unitName: item.unit_name,
          });
        }
      }

      if (lines.length === 0) {
        const fallbackItem = candidateItems[0];
        if (fallbackItem) {
          lines.push({
            itemId: fallbackItem.id,
            unitId: fallbackItem.base_unit_id,
            qty: 2,
            code: fallbackItem.code,
            name: fallbackItem.name,
            unitName: fallbackItem.unit_name,
          });
        }
      }

      const draftPayload = {
        type: "issue" as const,
        purpose: `Cấp phát vật tư thi công cho công trình ${matchedProj?.name || "Dự án"}`,
        sourceWarehouseId: defaultWarehouse?.id,
        projectId: matchedProj?.id,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          unitId: l.unitId,
          qty: l.qty,
        })),
      };

      proposal = {
        actionType: "stock_issue",
        actionTitle: "Đề Xuất Xuất Kho Cấp Vật Tư",
        summary: `Xuất kho ${lines.length} mặt hàng từ ${defaultWarehouse?.name || "Kho xưởng"} cho ${matchedProj?.name || "Dự án"}`,
        matchedEntities: {
          project: matchedProj
            ? { id: matchedProj.id, code: matchedProj.code, name: matchedProj.name }
            : undefined,
          warehouse: defaultWarehouse
            ? { id: defaultWarehouse.id, code: defaultWarehouse.code, name: defaultWarehouse.name }
            : undefined,
          items: lines.map((l) => ({
            id: l.itemId,
            code: l.code,
            name: l.name,
            qty: l.qty,
            unitId: l.unitId,
            unitName: l.unitName,
          })),
        },
        draftPayload,
        status: "pending_confirmation",
      };
    } else if (params.actionType === "acceptance") {
      const matchedProj =
        candidateProjects.find(
          (p) =>
            params.text.toLowerCase().includes(p.name.toLowerCase()) ||
            params.text.toLowerCase().includes(p.code.toLowerCase())
        ) || candidateProjects[0];

      let customerSignerName = matchedProj?.customer_name || "Đại diện khách hàng";
      const signerMatch = params.text.match(/(anh|chị|ông|bà)\s+([A-ZÀ-Ỹa-zà-ỹ\s]+)/);
      if (signerMatch) {
        customerSignerName = signerMatch[0].trim();
      }

      const draftPayload = {
        projectId: matchedProj?.id,
        customerSignerName,
        status: "submitted" as const,
      };

      proposal = {
        actionType: "acceptance",
        actionTitle: "Dự Thảo Biên Bản Nghiệm Thu & Bàn Giao",
        summary: `Biên bản nghiệm thu dự án ${matchedProj?.name || "Công trình"} với khách hàng`,
        matchedEntities: {
          project: matchedProj
            ? { id: matchedProj.id, code: matchedProj.code, name: matchedProj.name }
            : undefined,
        },
        draftPayload,
        status: "pending_confirmation",
      };
    } else {
      // disbursement: Phiếu chi tiền mặt
      const cashRes = await pool.query(
        `SELECT id, code, name, kind FROM erp.cash_accounts WHERE organization_id = $1 AND is_active = true`,
        [orgId]
      );
      const candidateAccounts = cashRes.rows;
      const defaultAccount =
        candidateAccounts.find((c) => c.kind === "cash") || candidateAccounts[0];

      const matchedProj =
        candidateProjects.find(
          (p) =>
            params.text.toLowerCase().includes(p.name.toLowerCase()) ||
            params.text.toLowerCase().includes(p.code.toLowerCase())
        ) || candidateProjects[0];

      let amount = 500000;
      const amountMatch = params.text.match(/(\d+[\d\.,]*)\s*(k|nghìn|ngàn|triệu|đ|vnd)?/i);
      if (amountMatch) {
        const rawNum = amountMatch[1].replace(/[\.,]/g, "");
        let parsed = parseInt(rawNum, 10);
        if (amountMatch[2]?.toLowerCase() === "k" || amountMatch[2]?.toLowerCase() === "nghìn") {
          parsed *= 1000;
        } else if (amountMatch[2]?.toLowerCase() === "triệu") {
          parsed *= 1000000;
        }
        if (!isNaN(parsed) && parsed > 0) amount = parsed;
      }

      const draftPayload = {
        direction: "disbursement" as const,
        amount,
        purpose: params.text,
        cashAccountId: defaultAccount?.id,
        projectId: matchedProj?.id,
      };

      proposal = {
        actionType: "disbursement",
        actionTitle: "Phiếu Chi Thanh Toán Phát Sinh Hiện Trường",
        summary: `Chi ${amount.toLocaleString("vi-VN")} đ từ ${defaultAccount?.name || "Quỹ tiền mặt"} cho ${matchedProj?.name || "Dự án"}`,
        matchedEntities: {
          project: matchedProj
            ? { id: matchedProj.id, code: matchedProj.code, name: matchedProj.name }
            : undefined,
          cashAccount: defaultAccount
            ? { id: defaultAccount.id, code: defaultAccount.code, name: defaultAccount.name }
            : undefined,
        },
        draftPayload,
        status: "pending_confirmation",
      };
    }

    // Ghi nhận nhật ký tác vụ vào erp.ai_runs
    try {
      const runRes = await pool.query(
        `INSERT INTO erp.ai_runs (
           organization_id, agent_code, status, model, input_snapshot, output_json,
           schema_version, request_id, requested_by, created_by
         )
         VALUES ($1, 'DATA_INGESTION', 'processing', 'gemini-3.5-flash-lite', $2, $3, 'v1', $4, $5, $6)
         RETURNING id`,
        [
          orgId,
          JSON.stringify({ actionType: params.actionType, text: params.text }),
          JSON.stringify(proposal),
          crypto.randomUUID(),
          membershipId,
          params.userId,
        ]
      );
      proposal.aiRunId = runRes.rows[0]?.id;
    } catch (runErr) {
      console.error("Lỗi ghi nhận ai_runs:", runErr);
    }

    return proposal;
  }

  /**
   * XÁC NHẬN VÀ GHI DỮ LIỆU ĐÃ PREVIEW VÀO DATABASE THỰC TẾ
   */
  static async confirmActionProposal(params: {
    actionType: IngestionActionType;
    draftPayload: any;
    aiRunId?: string;
    userId: string;
    organizationId?: string;
  }): Promise<{ success: boolean; recordCode: string; message: string; recordUrl: string }> {
    let recordCode = "";
    let message = "";
    let recordUrl = "";

    if (params.actionType === "project_progress") {
      const res = await ProjectService.updateProjectProgress(
        params.draftPayload.projectId,
        params.draftPayload.completionPercentage,
        params.userId
      );
      recordCode = res.projectCode;
      message = `Đã cập nhật tiến độ ${res.updatedTasksCount} hạng mục của dự án ${res.projectName} lên ${params.draftPayload.completionPercentage}%!`;
      recordUrl = "/du-an";
    } else if (params.actionType === "work_report") {
      const report = await ProjectService.createWorkReport(params.draftPayload, params.userId);
      recordCode = report.id;
      message = "Đã lưu báo cáo nhật trình thi công vào hệ thống thành công!";
      recordUrl = "/hien-truong";
    } else if (params.actionType === "stock_issue") {
      const docCode = await InventoryService.createDocument(params.draftPayload, params.userId);
      recordCode = docCode;
      message = "Đã tạo phiếu xuất kho cấp phát vật tư thành công!";
      recordUrl = "/kho/nhap-xuat";
    } else if (params.actionType === "acceptance") {
      const accId = await ProjectService.createAcceptance(params.draftPayload, params.userId);
      recordCode = accId;
      message = "Đã tạo dự thảo biên bản nghiệm thu công trình thành công!";
      recordUrl = "/du-an";
    } else if (params.actionType === "disbursement") {
      const payId = await FinanceService.createPayment(params.draftPayload, params.userId);
      recordCode = payId;
      message = "Đã ghi nhận phiếu chi tiền mặt vào sổ quỹ thành công!";
      recordUrl = "/tai-chinh";
    } else {
      throw new Error(`Loại thao tác '${params.actionType}' không được hệ thống hỗ trợ hoặc không hợp lệ.`);
    }

    // Cập nhật trạng thái ai_runs thành 'confirmed'
    if (params.aiRunId) {
      try {
        const pool = getDbPool();
        await pool.query(
          `UPDATE erp.ai_runs
           SET status = 'confirmed',
               output_json = output_json || $1::jsonb
           WHERE id = $2`,
          [JSON.stringify({ confirmedAt: new Date().toISOString(), recordCode, recordUrl }), params.aiRunId]
        );
      } catch (err) {
        console.error("Lỗi cập nhật ai_runs confirmed:", err);
      }
    }

    return {
      success: true,
      recordCode,
      message,
      recordUrl,
    };
  }

  /**
   * PHÂN TÍCH LỖI VÀ ĐỀ XUẤT ĐIỀU CHỈNH BẢN NHÁP (SELF-HEALING / REMEDIATION PROPOSAL)
   * Khi người dùng bấm duyệt mà hệ thống gặp lỗi nghiệp vụ / constraint,
   * AI sẽ tự động phân tích nguyên nhân lỗi, đối soát schema & ID thực thể hợp lệ
   * để đề xuất bản nháp đã sửa (correctedPayload) cho người dùng duyệt lại một cách minh bạch,
   * tuyệt đối không tự ý ghi đè dữ liệu vào DB mà không có sự xác nhận của người dùng.
   */
  static async remediateAndRetryActionProposal(params: {
    actionType: IngestionActionType;
    draftPayload: any;
    errorMessage: string;
    userId: string;
    organizationId: string;
    aiRunId?: string;
  }): Promise<{
    success: boolean;
    recordCode?: string;
    message?: string;
    recordUrl?: string;
    autoFixed?: boolean;
    fixExplanation?: string;
    correctedPayload?: any;
    needsUserClarification?: boolean;
    explanation?: string;
  }> {
    const { actionType, draftPayload, errorMessage, organizationId } = params;
    const pool = getDbPool();

    // 1. Tải danh mục thực thể hợp lệ khả dụng làm ngữ cảnh sửa lỗi
    let candidates: Record<string, any> = {};
    try {
      const pRes = await pool.query(
        `SELECT id, code, name FROM erp.projects WHERE organization_id = $1 AND status != 'completed' LIMIT 15`,
        [organizationId]
      );
      const wRes = await pool.query(
        `SELECT id, code, name FROM erp.warehouses WHERE organization_id = $1 AND is_active = true LIMIT 10`,
        [organizationId]
      );
      const cRes = await pool.query(
        `SELECT id, code, name, kind FROM erp.cash_accounts WHERE organization_id = $1 LIMIT 10`,
        [organizationId]
      );
      const tRes = await pool.query(
        `SELECT t.id, t.code, t.title, t.project_id FROM erp.tasks t JOIN erp.projects p ON p.id = t.project_id WHERE p.organization_id = $1 LIMIT 20`,
        [organizationId]
      );
      const iRes = await pool.query(
        `SELECT id, code, name, base_unit_id FROM erp.items WHERE organization_id = $1 AND is_active = true LIMIT 20`,
        [organizationId]
      );

      candidates = {
        projects: pRes.rows,
        warehouses: wRes.rows,
        cashAccounts: cRes.rows,
        tasks: tRes.rows,
        items: iRes.rows,
      };
    } catch (e) {
      console.warn("Không thể tải danh sách candidates cho remediation:", e);
    }

    // 2. Yêu cầu AI phân tích và đề xuất phương án sửa (Remediation Analysis)
    let aiRemediation: {
      canAutoFix: boolean;
      fixExplanation?: string;
      correctedPayload?: any;
      userExplanation?: string;
    } | null = null;

    try {
      const remediationPrompt = `Hệ thống gặp lỗi khi thực hiện ghi nhận nghiệp vụ vào ERP:
- Loại tác vụ: ${actionType}
- Lỗi phát sinh từ hệ thống: "${errorMessage}"
- Payload gửi vào bị lỗi:
${JSON.stringify(draftPayload, null, 2)}

Danh mục thực thể hợp lệ khả dụng trong hệ thống:
${JSON.stringify(candidates, null, 2)}

YÊU CẦU:
1. Phân tích nguyên nhân lỗi (ví dụ: thiếu ID kho, ID công việc không tồn tại, sai kiểu dữ liệu...).
2. Nếu có thể điều chỉnh chuẩn hóa payload (canAutoFix: true):
   - Hãy chọn ID hợp lệ từ danh mục thực thể khả dụng trên để bổ sung/thay thế trường thiếu hoặc sai.
   - Trả về correctedPayload đã được sửa để người dùng xem lại.
   - Giải thích ngắn gọn cách bạn đã sửa trong "fixExplanation" (tiếng Việt).
3. Nếu lỗi là mâu thuẫn nghiệp vụ thực tế (canAutoFix: false) (ví dụ: kho thực sự hết hàng, hoặc yêu cầu người dùng phải tự quyết định):
   - Giải thích rõ ràng nguyên nhân trong "userExplanation" (tiếng Việt, lịch sự, chuyên nghiệp).
   - Đề xuất các giải pháp khả thi để người dùng lựa chọn trong hội thoại.

Trả về JSON đúng cấu trúc:
{
  "canAutoFix": boolean,
  "fixExplanation": "Tóm tắt ngắn gọn thay đổi AI đề xuất điều chỉnh",
  "correctedPayload": { ... payload đã được sửa ... },
  "userExplanation": "Giải thích chi tiết cho người dùng"
}`;

      aiRemediation = await geminiService.generateJSON({
        prompt: remediationPrompt,
        systemInstruction:
          "Bạn là Trợ lý Kỹ thuật AI chuyên chuẩn đoán lỗi và điều chỉnh dữ liệu minh bạch cho hệ thống Signage ERP.",
      });
    } catch (aiErr) {
      console.warn("Gemini remediation call failed:", aiErr);
    }

    // 3. Trả về đề xuất điều chỉnh để người dùng xem lại và xác nhận (không tự ý ghi DB)
    return {
      success: false,
      needsUserClarification: true,
      autoFixed: Boolean(aiRemediation?.canAutoFix && aiRemediation?.correctedPayload),
      fixExplanation: aiRemediation?.fixExplanation,
      correctedPayload: aiRemediation?.correctedPayload || null,
      explanation:
        aiRemediation?.userExplanation ||
        (aiRemediation?.fixExplanation
          ? `Lưu thất bại do lỗi: "${errorMessage}". AI đề xuất điều chỉnh: ${aiRemediation.fixExplanation}. Vui lòng kiểm tra lại trước khi lưu.`
          : `Không thể hoàn tất lưu do lỗi cơ sở dữ liệu: "${errorMessage}". Vui lòng kiểm tra lại thông tin.`),
    };
  }

  /**
   * ĐIỀU PHỐI XÁC NHẬN HÀNH ĐỘNG CÓ BẢO VỆ TỰ SỬA LỖI (AI SELF-REMEDIATION GATEWAY)
   */
  static async executeActionWithAiRemediation(params: {
    actionType: IngestionActionType;
    draftPayload: any;
    aiRunId?: string;
    userId: string;
    organizationId?: string;
    chatSessionId?: string;
    chatMessageId?: string;
  }): Promise<{
    success: boolean;
    recordCode?: string;
    message?: string;
    recordUrl?: string;
    autoFixed?: boolean;
    fixExplanation?: string;
    needsUserClarification?: boolean;
    explanation?: string;
    correctedPayload?: any;
  }> {
    const orgId = params.organizationId || (await this.getOrgId());

    let finalResult: {
      success: boolean;
      recordCode?: string;
      message?: string;
      recordUrl?: string;
      autoFixed?: boolean;
      fixExplanation?: string;
      needsUserClarification?: boolean;
      explanation?: string;
      correctedPayload?: any;
    };

    try {
      // 1. Thử ghi dữ liệu trực tiếp lần đầu
      const initialRes = await this.confirmActionProposal({
        actionType: params.actionType,
        draftPayload: params.draftPayload,
        aiRunId: params.aiRunId,
        userId: params.userId,
        organizationId: orgId,
      });

      finalResult = {
        success: true,
        recordCode: initialRes.recordCode,
        message: initialRes.message,
        recordUrl: initialRes.recordUrl,
      };
    } catch (err: any) {
      console.warn(`[executeActionWithAiRemediation] Lần 1 thất bại (${err.message}). Kích hoạt AI Remediation...`);

      // 2. Tự động chuyển giao lỗi cho AI Agent để phân tích, tự sửa và thử lại
      finalResult = await this.remediateAndRetryActionProposal({
        actionType: params.actionType,
        draftPayload: params.draftPayload,
        errorMessage: err.message,
        userId: params.userId,
        organizationId: orgId,
        aiRunId: params.aiRunId,
      });
    }

    // 3. Đồng bộ trạng thái vào bảng chat messages nếu có ID phiên
    if (params.chatSessionId && params.chatMessageId) {
      try {
        const pool = getDbPool();
        if (finalResult.success) {
          await pool.query(
            `UPDATE erp.ai_chat_messages
             SET action_proposal = jsonb_set(
               jsonb_set(
                 COALESCE(action_proposal, '{}'::jsonb),
                 '{status}',
                 '"confirmed"'
               ),
               '{createdRecordCode}',
               to_jsonb($1::text)
             ) || $2::jsonb
             WHERE organization_id = $3 AND session_id = $4 AND id = $5`,
            [
              finalResult.recordCode || "",
              JSON.stringify({
                createdRecordUrl: finalResult.recordUrl,
                autoFixed: Boolean(finalResult.autoFixed),
                fixExplanation: finalResult.fixExplanation,
                draftPayload: finalResult.correctedPayload || params.draftPayload,
              }),
              orgId,
              params.chatSessionId,
              params.chatMessageId,
            ]
          );

          if (finalResult.autoFixed) {
            await this.appendChatMessage({
              sessionId: params.chatSessionId,
              userId: params.userId,
              organizationId: orgId,
              role: "assistant",
              content: `✨ **AI đã tự động chuẩn hóa dữ liệu & lưu thành công chứng từ:**\n- **Mã chứng từ:** [${finalResult.recordCode}](${finalResult.recordUrl})\n- **Chi tiết xử lý:** ${finalResult.fixExplanation || "Đã tự động liên kết với thực thể hợp lệ trong hệ thống."}`,
            });
          }
        } else {
          await pool.query(
            `UPDATE erp.ai_chat_messages
             SET action_proposal = jsonb_set(
               COALESCE(action_proposal, '{}'::jsonb),
               '{status}',
               '"needs_adjustment"'
             ) || $1::jsonb
             WHERE organization_id = $2 AND session_id = $3 AND id = $4`,
            [
              JSON.stringify({ errorMessage: finalResult.explanation }),
              orgId,
              params.chatSessionId,
              params.chatMessageId,
            ]
          );

          await this.appendChatMessage({
            sessionId: params.chatSessionId,
            userId: params.userId,
            organizationId: orgId,
            role: "assistant",
            content: `⚠️ **AI cần thêm thông tin để hoàn tất chứng từ:**\n${finalResult.explanation}`,
          });
        }
      } catch (dbErr) {
        console.error("Lỗi đồng bộ trạng thái chat messages sau remediation:", dbErr);
      }
    }

    return finalResult;
  }
}

