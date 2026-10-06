/**
 * ĐẶC TẢ AUTONOMOUS AI AGENT CHO SIGNAGE ERP
 * File: src/lib/ai/agents/assistant.agent.ts
 * Tuân thủ docs/THIET_KE_KIEN_TRUC_AI_AGENT.md
 * Hỗ trợ ReAct Multi-step Loop, Dynamic Schema Discovery & Zero-Trust RBAC Guardrails
 */

import { AiToolDefinition } from "@/types/ai.types";

export const ASSISTANT_SYSTEM_INSTRUCTION = `Bạn là Autonomous AI Agent Chuyên gia Kỹ thuật & Điều hành Toàn diện của Signage ERP (chuyên ngành sản xuất biển hiệu quảng cáo, thi công mặt dựng alu, in bạt 3M/UV, gia công chữ nổi mica/inox, màn hình LED, kết cấu cơ khí).

TRIẾT LÝ HOẠT ĐỘNG:
1. NĂNG LỰC TỰ CHỦ (AGENTIC AUTONOMY & REACT LOOP):
   - Bạn là một Agent thông minh, không phải là một chatbot trả lời một bước đơn thuần.
   - Khi nhận yêu cầu của người dùng, bạn tự phân tích bài toán và tự do lập kế hoạch hành động theo chuỗi suy luận ReAct (Thought ➔ Action ➔ Observation ➔ Synthesis):
     + Bước 1: Xác định dữ liệu cần tìm. Nếu chưa rõ cấu trúc bảng hoặc mối quan hệ, hãy dùng 'getSystemSchema' để tìm hiểu từ điển dữ liệu.
     + Bước 2: Thực thi các công cụ truy vấn dữ liệu thực tế (bạn có thể gọi nhiều công cụ qua nhiều bước liên hoàn để liên kết thông tin giữa các phân hệ: Dự án -> Công việc -> Tồn kho vật tư -> Đội xe -> Tài chính).
     + Bước 3: Đánh giá kết quả quan sát (Observation). Nếu dữ liệu chưa đủ hoặc cần đối soát, tiếp tục gọi công cụ phù hợp ở bước tiếp theo.
     + Bước 4: Khi đã có đủ dữ liệu, tổng hợp câu trả lời sâu sắc, chính xác, có tính ứng dụng cao.

2. ĐỀ XUẤT HÀNH ĐỘNG CÓ CON NGƯỜI DUYỆT (HUMAN-IN-THE-LOOP):
   - Khi người dùng muốn thực hiện thao tác tạo mới hoặc cập nhật dữ liệu (cập nhật tiến độ %, nộp nhật trình thi công, xuất kho vật tư cho công trình, lập biên bản nghiệm thu, lập phiếu chi tiền mặt):
     + Trước tiên, hãy truy vấn kiểm tra các mã thực thể liên quan (mã dự án, mã công việc, mã vật tư, mã tài khoản quỹ...).
     + Sau đó, chủ động gọi 'proposeDataAction' để hệ sinh thái tạo Bản xem trước đề xuất (Preview Proposal).
     + Người dùng sẽ kiểm tra và nhấn nút "Xác nhận lưu vào DB" để hoàn tất.

3. RANH GIỚI BẢO MẬT & PHÂN QUYỀN TUYỆT ĐỐI (ZERO-TRUST RBAC GUARDRAILS):
   - Bạn hoạt động trong giới hạn quyền hạn của người dùng đang đăng nhập.
   - Nếu Server trả về lỗi 'PERMISSION_DENIED' khi gọi một công cụ: Hãy thông báo lịch sự, trung thực rằng tài khoản của họ không có quyền xem hoặc thực hiện thao tác đó theo chính sách bảo mật nội bộ. Tuyệt đối không bịa đặt số liệu giả mạo.

4. KIẾN THỨC KỸ THUẬT NGÀNH BIỂN BẢNG:
   - Kết cấu & Gia công: Sắt hộp mạ kẽm (đan xương, khẩu độ hàn, giằng chống bão), alu ngoài trời (Alcorest, Trieu Chen), bạt Hiflex/3M Panagraphics in UV, tấm Formex, mica Đài Loan Chochen/FS.
   - Chiếu sáng & Điện: LED module 3 bóng có lens mắt lồi, nguồn chống nước 12V (tính tải dự phòng ≥ 20%), an toàn rò điện ngoài trời.

5. PHONG CÁCH TRÌNH BÀY:
   - Sử dụng tiếng Việt chuẩn xác, văn phong chuyên nghiệp, súc tích của Kỹ sư Trưởng kiêm Giám đốc Điều hành.
   - Dùng Markdown phân cấp tiêu đề (##, ###), dùng Bảng Markdown khi trình bày danh sách nhân sự, điều độ công việc, vật tư tồn kho, công nợ.
   - In đậm (**...**) các số liệu trọng yếu, phần trăm tiến độ, mã số phiếu/dự án.
   - Đưa ra khuyến nghị vận hành hoặc các bước xử lý tiếp theo có ích.`;

/**
 * Danh sách công cụ bao phủ toàn bộ hệ sinh thái Signage ERP
 */
export const ASSISTANT_TOOLS: AiToolDefinition[] = [
  // --- NHÓM 1: KHÁM PHÁ CẤU TRÚC & TRUY VẤN LINH HOẠT ---
  {
    name: "getSystemSchema",
    description:
      "Khám phá danh mục thực thể, cấu trúc bảng dữ liệu, ý nghĩa các trường và mối quan hệ khóa ngoại (Foreign Keys) trong Signage ERP. Dùng công cụ này để hiểu mô hình dữ liệu trước khi thực hiện truy vấn phức tạp.",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        entityName: {
          type: "STRING",
          description:
            "Tên thực thể cụ thể cần xem cấu trúc chi tiết (ví dụ: 'projects', 'tasks', 'items', 'warehouses', 'stock_documents', 'partners', 'work_reports', 'employees', 'cash_accounts', 'payments'). Nếu bỏ trống sẽ trả về danh mục tổng quan tất cả thực thể.",
        },
      },
    },
  },
  {
    name: "queryEntityData",
    description:
      "Truy vấn dữ liệu thực tế có cấu trúc từ bất kỳ thực thể nào trong Signage ERP với bộ lọc và tìm kiếm tự do, tự động áp dụng phân quyền RBAC của người dùng.",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "ASSIGNED", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        entityName: {
          type: "STRING",
          description:
            "Tên thực thể cần truy vấn: 'projects', 'tasks', 'items', 'warehouses', 'stock_documents', 'remnants', 'partners', 'work_reports', 'employees', 'attendance', 'cash_accounts', 'open_items', 'vehicles', 'trips'.",
        },
        filters: {
          type: "OBJECT",
          description:
            "Bộ lọc tùy chọn dạng JSON object (ví dụ: { search: 'Vincom', status: 'in_progress', project_code: 'PRJ-001' }).",
        },
        limit: {
          type: "NUMBER",
          description: "Số lượng dòng tối đa cần lấy (mặc định 10, tối đa 25).",
        },
      },
      required: ["entityName"],
    },
  },
  {
    name: "executeSafeSqlInspection",
    description:
      "Thực thi truy vấn SQL chỉ-đọc (SELECT / WITH CTE) an toàn trên database Signage ERP để đối soát hoặc liên kết đa bảng sâu khi các công cụ thông thường không đủ đáp ứng.",
    requiredPermission: "project_finance.read",
    allowedScopes: ["ORG"],
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description:
            "Câu lệnh SELECT SQL chỉ-đọc (nghiêm cấm mọi lệnh INSERT/UPDATE/DELETE/ALTER/DROP). Tự động gán LIMIT 25.",
        },
      },
      required: ["query"],
    },
  },

  // --- NHÓM 2: KHO, VẬT TƯ & ĐA KHO ---
  {
    name: "searchInventoryStock",
    description:
      "Tra cứu danh mục vật tư và số lượng tồn kho thực tế trong hệ thống theo từ khóa (ví dụ: 'sắt hộp', 'bạt 3m', 'led 3 bóng', 'alu')",
    requiredPermission: "inventory.read",
    allowedScopes: ["ORG", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        keyword: {
          type: "STRING",
          description: "Tên hoặc quy cách vật tư cần tìm (vd: 'sắt', 'alu', 'led', 'decal')",
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "getWarehouseStockSummary",
    description:
      "Xem báo cáo tổng quan tình trạng tồn kho của toàn bộ hệ thống hoặc các điểm kho (Kho xưởng, Kho xe lưu động, v.v.)",
    requiredPermission: "inventory.read",
    allowedScopes: ["ORG"],
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "listStockDocuments",
    description:
      "Tra cứu các phiếu xuất kho, nhập kho, điều chuyển kho gần đây (phiếu cấp vật tư cho dự án, phiếu mua về kho)",
    requiredPermission: "stock_document.read",
    allowedScopes: ["ORG", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        type: {
          type: "STRING",
          description: "Loại phiếu: 'receipt' (nhập), 'issue' (xuất), 'transfer' (điều chuyển)",
        },
        status: {
          type: "STRING",
          description: "Trạng thái phiếu: 'draft', 'pending_approval', 'approved', 'completed'",
        },
      },
    },
  },
  {
    name: "listRemnants",
    description:
      "Tra cứu danh sách các tấm lẻ / đề-xê alu, tấm mica cắt dở đang có sẵn trong kho xưởng để tận dụng gia công",
    requiredPermission: "inventory.read",
    allowedScopes: ["ORG"],
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },

  // --- NHÓM 3: DỰ ÁN, WBS, ĐIỀU ĐỘ & BÁO CÁO ---
  {
    name: "searchProjects",
    description:
      "Tra cứu danh sách dự án / công trình thi công, tiến độ thực hiện và trạng thái hiện tại",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "ASSIGNED", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        keyword: {
          type: "STRING",
          description: "Tên dự án hoặc mã công trình hoặc tên khách hàng cần tra cứu",
        },
        status: {
          type: "STRING",
          description: "Lọc trạng thái dự án: 'in_progress', 'surveying', 'fabricating', 'completed'",
        },
      },
    },
  },
  {
    name: "searchTeamTasks",
    description:
      "Tra cứu điều độ công việc và phân công nhiệm vụ của các nhân sự / thợ thi công / quản lý trong toàn công ty",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "ASSIGNED"],
    parameters: {
      type: "OBJECT",
      properties: {
        employeeName: {
          type: "STRING",
          description: "Tên hoặc mã nhân viên cụ thể muốn tra cứu công việc (tùy chọn)",
        },
        status: {
          type: "STRING",
          description: "Lọc trạng thái công việc: 'doing', 'todo', 'done', 'awaiting_acceptance' (tùy chọn)",
        },
      },
    },
  },
  {
    name: "getMyAssignedTasks",
    description:
      "Tra cứu danh sách các đầu việc / nhiệm vụ được phân công cho chính nhân viên đang hỏi",
    requiredPermission: "work_report.create",
    allowedScopes: ["OWN", "ASSIGNED", "ORG"],
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description: "Lọc theo trạng thái công việc: 'todo', 'in_progress', 'completed'",
        },
      },
    },
  },
  {
    name: "listWorkReports",
    description:
      "Tra cứu các báo cáo nhật trình công việc hàng ngày do thợ xưởng hoặc thợ hiện trường gửi về (tiến độ, vật tư phát sinh)",
    requiredPermission: "work_report.read",
    allowedScopes: ["ORG", "ASSIGNED", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        keyword: {
          type: "STRING",
          description: "Từ khóa nội dung báo cáo hoặc tên công trình",
        },
      },
    },
  },
  {
    name: "listProjectAcceptances",
    description:
      "Tra cứu danh sách các biên bản bàn giao & nghiệm thu công trình với khách hàng kèm giá trị nghiệm thu",
    requiredPermission: "acceptance.read",
    allowedScopes: ["ORG", "ASSIGNED", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },

  // --- NHÓM 4: VẬN CHUYỂN & ĐỘI XE ---
  {
    name: "listVehiclesAndTrips",
    description:
      "Tra cứu đội xe vận chuyển của xưởng và các chuyến xe điều động chở biển hiệu / thợ ra công trình gần đây",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "ASSIGNED", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description: "Trạng thái chuyến xe: 'pending', 'delivering', 'completed'",
        },
      },
    },
  },

  // --- NHÓM 5: NHÂN SỰ & CHẤM CÔNG ---
  {
    name: "listEmployees",
    description:
      "Tra cứu danh sách nhân sự, cán bộ công nhân viên trong công ty (họ tên, mã nhân viên, phòng ban/xưởng, số điện thoại, tình trạng)",
    requiredPermission: "employee.read",
    allowedScopes: ["ORG", "DEPARTMENT"],
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "getAttendanceSummary",
    description:
      "Tra cứu tình hình chấm công, tổng số ngày công và ca làm việc thực tế của nhân sự trong tháng",
    requiredPermission: "attendance.read",
    allowedScopes: ["ORG", "DEPARTMENT", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },

  // --- NHÓM 6: MUA HÀNG & NHÀ CUNG CẤP ---
  {
    name: "searchSuppliersAndPurchases",
    description:
      "Tra cứu danh sách nhà cung cấp vật tư và tình hình đơn đặt mua hàng (PO) gần đây",
    requiredPermission: "purchase_order.read",
    allowedScopes: ["ORG", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        keyword: {
          type: "STRING",
          description: "Tên nhà cung cấp hoặc mã đơn mua hàng",
        },
      },
    },
  },

  // --- NHÓM 7: KHÁCH HÀNG & CRM ---
  {
    name: "searchCustomers",
    description:
      "Tra cứu danh sách khách hàng, đối tác đặt hàng biển hiệu (tên đối tác, số điện thoại, hạn mức nợ, số dư công nợ)",
    requiredPermission: "customer.read",
    allowedScopes: ["ORG", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        keyword: {
          type: "STRING",
          description: "Tên công ty hoặc số điện thoại khách hàng",
        },
      },
    },
  },

  // --- NHÓM 8: TÀI CHÍNH & CÔNG NỢ ---
  {
    name: "getProjectFinancialOverview",
    description:
      "Tra cứu số liệu tài chính điều hành tổng quan: doanh thu, chi phí, quỹ tiền mặt, ngân hàng, công nợ",
    requiredPermission: "project_finance.read",
    allowedScopes: ["ORG"],
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "getDebtSummary",
    description:
      "Tra cứu chi tiết công nợ doanh nghiệp: công nợ phải thu từ khách hàng và công nợ phải trả cho nhà cung cấp",
    requiredPermission: "receivable.read",
    allowedScopes: ["ORG"],
    parameters: {
      type: "OBJECT",
      properties: {
        side: {
          type: "STRING",
          description: "Loại công nợ: 'receivable' (phải thu khách), 'payable' (phải trả NCC), 'all' (cả hai)",
        },
      },
    },
  },
  {
    name: "listCashAccounts",
    description:
      "Tra cứu số dư quỹ tiền mặt và tài khoản ngân hàng của công ty",
    requiredPermission: "project_finance.read",
    allowedScopes: ["ORG"],
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },

  // --- NHÓM 9: ĐỀ XUẤT HÀNH ĐỘNG (HUMAN-IN-THE-LOOP PROPOSAL) ---
  {
    name: "proposeDataAction",
    description:
      "Khởi tạo Bản xem trước (Action Proposal Preview) cho người dùng kiểm tra và bấm xác nhận lưu vào DB. Dành cho 4 tác vụ: 'work_report' (nhật trình/tiến độ thi công), 'stock_issue' (xuất kho vật tư), 'acceptance' (nghiệm thu bàn giao), 'disbursement' (phiếu chi tiền mặt phát sinh).",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        actionType: {
          type: "STRING",
          description:
            "Loại hành động: 'work_report', 'stock_issue', 'acceptance', 'disbursement'",
        },
        actionTitle: {
          type: "STRING",
          description: "Tiêu đề hành động ngắn gọn rõ ràng",
        },
        taskCode: {
          type: "STRING",
          description: "Mã công việc liên quan nếu có (vd: 'TK-001-THICONG')",
        },
        projectCode: {
          type: "STRING",
          description: "Mã dự án liên quan nếu có (vd: 'PRJ-001')",
        },
        completionPercentage: {
          type: "NUMBER",
          description: "Phần trăm tiến độ cần cập nhật (ví dụ: 100)",
        },
        description: {
          type: "STRING",
          description: "Nội dung chi tiết hoặc giải trình của đề xuất",
        },
      },
      required: ["actionType", "description"],
    },
  },
];

/**
 * Lọc bỏ các thuộc tính nội bộ (requiredPermission, allowedScopes)
 * trước khi gửi vào Gemini API để tránh lỗi 400 Bad Request
 */
export function toGeminiTools(tools: AiToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
