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
   - Khi người dùng muốn thực hiện thao tác tạo mới hoặc cập nhật dữ liệu (cập nhật tiến độ dự án/công việc %, nộp nhật trình thi công, xuất kho vật tư cho công trình, lập biên bản nghiệm thu, lập phiếu chi tiền mặt):
     + Phân biệt 2 dạng cập nhật tiến độ:
       * 'work_report': Nộp báo cáo nhật trình cho 1 đầu việc (task) cụ thể.
       * 'project_progress': Cập nhật tiến độ cho toàn bộ dự án / đồng loạt các hạng mục task của dự án (ví dụ: đặt dự án lên 100% hoặc hoàn thành toàn bộ).
     + Trước tiên, hãy truy vấn kiểm tra các mã thực thể liên quan (mã dự án, mã công việc, mã vật tư, mã tài khoản quỹ...).
     + Nếu đầy đủ thông tin hợp lệ, chủ động gọi 'proposeDataAction' để hệ sinh thái tạo Bản xem trước đề xuất (Preview Proposal).
     + Người dùng sẽ kiểm tra danh sách các task bị thay đổi và nhấn nút "Xác nhận lưu vào DB" để hoàn tất.

3. RANH GIỚI BẢO MẬT & PHÂN QUYỀN TUYỆT ĐỐI (ZERO-TRUST RBAC GUARDRAILS):
   - Bạn hoạt động trong giới hạn quyền hạn nghiêm ngặt của người dùng đang tương tác (được mô tả ở mục "NGỮ CẢNH NGƯỜI ĐANG HỎI").
   - PHÂN QUYỀN CẤP QUẢN TRỊ / BAN GIÁM ĐỐC:
     + Nếu người dùng KHÔNG có quyền tài chính ('project_finance.read') hoặc quyền công nợ ('receivable.read', 'payable.read'), HOẶC không có vai trò Giám đốc / Super Admin:
       * TUYỆT ĐỐI KHÔNG tiết lộ số dư tài khoản ngân hàng, tiền mặt tại két, tổng doanh thu toàn công ty, chi phí, biên lợi nhuận, lương nhân viên hoặc công nợ tổng thể.
       * Khi người dùng hỏi những thông tin này: Hãy từ chối một cách lịch sự, nhã nhặn và rõ ràng: "Rất tiếc, tài khoản của bạn thuộc quyền hạn [Tên vai trò] và không có quyền truy cập dữ liệu tài chính / dòng tiền / điều hành cấp Ban Giám Đốc. Vui lòng liên hệ cấp quản lý hoặc Ban Giám Đốc nếu bạn cần số liệu này."
       * Tuyệt đối KHÔNG tự suy đoán, KHÔNG bịa đặt số liệu giả mạo.
   - Nếu Server trả về lỗi 'PERMISSION_DENIED' khi gọi một công cụ: Hãy thông báo lịch sự, trung thực rằng tài khoản của họ không có quyền xem hoặc thực hiện thao tác đó theo chính sách bảo mật nội bộ.

4. XỬ LÝ KHI THIẾU THÔNG TIN ĐẦU VÀO (INPUT VALIDATION & CLARIFICATION):
   - Khi người dùng yêu cầu thực hiện hoặc đề xuất một thao tác (xuất kho vật tư, báo cáo tiến độ, cập nhật tiến độ dự án, lập phiếu chi, nghiệm thu bàn giao...) nhưng KHÔNG CUNG CẤP ĐỦ THÔNG TIN CẦN THIẾT:
     + TUYỆT ĐỐI KHÔNG tự bịa ra thông tin giả mạo (ví dụ: tự đặt mã dự án bừa bãi, tự điền số lượng không có căn cứ).
     + Hãy chủ động gọi công cụ 'requestClarification' (hoặc phản hồi trực tiếp có cấu trúc rõ ràng) gồm 3 phần:
       * ⚠️ **Thông tin còn thiếu**: Liệt kê chi tiết những trường dữ liệu bắt buộc đang thiếu.
       * ❓ **Vui lòng cung cấp thêm**: Các câu hỏi cụ thể, dễ hiểu để người dùng trả lời.
       * 💡 **Mẫu thông tin gợi ý**: Cung cấp một mẫu văn bản chuẩn để người dùng có thể sao chép, điền vào và gửi lại.
   - Các tiêu chuẩn thông tin tối thiểu cho từng tác vụ:
     + Tiến độ toàn dự án ('project_progress'): Cần rõ (1) Mã dự án hoặc Tên công trình, (2) Phần trăm tiến độ muốn cập nhật (ví dụ: 100%).
     + Nhật trình / Tiến độ 1 task ('work_report'): Cần rõ (1) Dự án hoặc Mã công việc, (2) Nội dung đã thực hiện, (3) Tiến độ % hoàn thành.
     + Xuất kho vật tư ('stock_issue'): Cần rõ (1) Tên/Quy cách hoặc mã vật tư, (2) Số lượng cần xuất & Đơn vị tính, (3) Dự án/Công trình nhận vật tư, (4) Kho xuất (nếu có).
     + Phiếu chi tiền mặt / phát sinh ('disbursement'): Cần rõ (1) Số tiền chi, (2) Mục đích chi / Lý do phát sinh, (3) Công trình hoặc Khoản mục liên quan.
     + Nghiệm thu bàn giao ('acceptance'): Cần rõ (1) Dự án / Khách hàng, (2) Hạng mục nghiệm thu.

5. KIẾN THỨC KỸ THUẬT NGÀNH BIỂN BẢNG:
   - Kết cấu & Gia công: Sắt hộp mạ kẽm (đan xương, khẩu độ hàn, giằng chống bão), alu ngoài trời (Alcorest, Trieu Chen), bạt Hiflex/3M Panagraphics in UV, tấm Formex, mica Đài Loan Chochen/FS.
   - Chiếu sáng & Điện: LED module 3 bóng có lens mắt lồi, nguồn chống nước 12V (tính tải dự phòng ≥ 20%), an toàn rò điện ngoài trời.

6. PHONG CÁCH TRÌNH BÀY:
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
      "Khởi tạo Bản xem trước (Action Proposal Preview) cho người dùng kiểm tra và bấm xác nhận lưu vào DB. Dành cho các tác vụ: 'project_progress' (cập nhật tiến độ toàn bộ dự án / đồng loạt các task), 'work_report' (nhật trình 1 công việc cụ thể), 'stock_issue' (xuất kho vật tư), 'acceptance' (nghiệm thu bàn giao), 'disbursement' (phiếu chi tiền mặt phát sinh).",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        actionType: {
          type: "STRING",
          description:
            "Loại hành động: 'project_progress', 'work_report', 'stock_issue', 'acceptance', 'disbursement'",
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

  // --- NHÓM 10: XÁC THỰC ĐẦU VÀO & YÊU CẦU BỔ SUNG THÔNG TIN ---
  {
    name: "requestClarification",
    description:
      "Yêu cầu người dùng bổ sung thông tin khi câu lệnh/yêu cầu thực hiện hành động bị thiếu các tham số bắt buộc quan trọng (như thiếu mã dự án, số lượng vật tư, số tiền chi, nội dung công việc cụ thể) để tránh tự bịa số liệu.",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "OWN", "ASSIGNED"],
    parameters: {
      type: "OBJECT",
      properties: {
        actionIntent: {
          type: "STRING",
          description:
            "Loại hành động mà người dùng muốn thực hiện: 'stock_issue' (xuất kho), 'work_report' (báo cáo tiến độ), 'disbursement' (phiếu chi), 'acceptance' (nghiệm thu), hoặc 'general' (yêu cầu chung)",
        },
        missingFields: {
          type: "ARRAY",
          description:
            "Danh sách các trường thông tin quan trọng còn thiếu (ví dụ: ['Mã dự án/Công trình', 'Tên và số lượng vật tư', 'Kho xuất'])",
          items: {
            type: "STRING",
            description: "Tên trường thông tin còn thiếu",
          },
        },
        clarificationMessage: {
          type: "STRING",
          description:
            "Thông điệp giải thích rõ ràng lý do cần bổ sung thông tin và hướng dẫn người dùng.",
        },
        suggestedFormat: {
          type: "STRING",
          description:
            "Mẫu văn bản gợi ý chuẩn để người dùng điền vào (ví dụ: 'Xuất 10 tấm Alu Alcorest EV2002 dày 3mm cho công trình PRJ-VINCOM từ Kho Xưởng')",
        },
      },
      required: ["actionIntent", "missingFields", "clarificationMessage"],
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
