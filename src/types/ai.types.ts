/**
 * HỢP ĐỒNG DỮ LIỆU & SCHEMA PHÂN HỆ AI (AI TYPES & DTOS)
 * Định nghĩa theo Mục 3 docs/THIET_KE_KIEN_TRUC_AI_AGENT.md
 */

import { PermissionKey, ScopeKind } from "./iam";

export type AiAgentCode =
  | "GENERAL_ADVISOR"
  | "DAILY_REPORT"
  | "INVOICE_OCR"
  | "PERFORMANCE_ANALYTICS";

export type AiRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "confirmed"
  | "permission_revoked";

export interface AiRunRecord {
  id: string;
  organizationId: string;
  agentCode: AiAgentCode;
  status: AiRunStatus;
  model: string;
  inputSnapshot: any;
  outputJson: any;
  schemaVersion: string;
  errorCode?: string | null;
  requestId: string;
  requestedBy: string;
  reportId?: string | null;
  purchaseOrderId?: string | null;
  payrollLineId?: string | null;
  createdAt: string;
}

/**
 * Định nghĩa Tool tra cứu dữ liệu thực tế trong ERP
 */
export interface AiToolDefinition {
  name: string;
  description: string;
  requiredPermission: PermissionKey;
  allowedScopes: ScopeKind[];
  parameters: {
    type: string;
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
}

export interface AiToolExecutionResult {
  toolName: string;
  permissionGranted: boolean;
  requiredPermission: PermissionKey;
  scope?: ScopeKind;
  data?: any;
  error?: string;
}

export interface AiChatQueryRequest {
  prompt: string;
  userId: string;
  organizationId?: string;
}

export interface AiDataSourceCitation {
  sourceType:
    | "inventory"
    | "project"
    | "finance"
    | "procurement"
    | "technical_standard"
    | "crm"
    | "hrm"
    | "logistics";
  title: string;
  summary: string;
  count?: number;
}

export interface AiChatQueryResponse {
  answer: string;
  toolsUsed: string[];
  dataSources: AiDataSourceCitation[];
  permissionWarnings?: string[];
  aiRunId?: string;
  actionProposal?: AiActionProposal;
}

/**
 * Cấu trúc JSON báo cáo giọng nói (Daily Speech Report)
 */
export interface DailyReportDraftData {
  work_summary: string;
  tasks_completed: string[];
  materials_used: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  obstacles_or_delays?: string | null;
  next_day_plan?: string;
  completion_percentage_estimate?: number;
}

/**
 * Cấu trúc JSON OCR hóa đơn vật tư (Invoice OCR)
 */
export interface InvoiceOcrDraftData {
  vendor_name: string;
  invoice_number?: string;
  invoice_date?: string;
  total_amount?: number;
  items: Array<{
    item_name: string;
    unit: string;
    quantity: number;
    unit_price?: number;
    amount?: number;
  }>;
  note?: string;
}

export type IngestionActionType =
  | "work_report"
  | "stock_issue"
  | "acceptance"
  | "disbursement";

export interface AiActionProposal {
  actionType: IngestionActionType;
  actionTitle: string;
  summary: string;
  matchedEntities: {
    project?: { id: string; code: string; name: string };
    task?: { id: string; code: string; title: string };
    warehouse?: { id: string; code: string; name: string };
    cashAccount?: { id: string; code: string; name: string };
    items?: Array<{
      id: string;
      code: string;
      name: string;
      qty: number;
      unitId: string;
      unitName: string;
    }>;
  };
  draftPayload: any;
  aiRunId?: string;
  status?: "pending_confirmation" | "confirmed" | "cancelled";
  createdRecordCode?: string;
  createdRecordUrl?: string;
}
