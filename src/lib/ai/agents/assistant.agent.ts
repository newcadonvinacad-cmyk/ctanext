/**
 * ĐẶC TẢ AGENT TRỢ LÝ KỸ THUẬT & ĐIỀU HÀNH TOÀN DIỆN SIGNAGE ERP
 * File: src/lib/ai/agents/assistant.agent.ts
 * Tuân thủ Mục 3 & 4 docs/THIET_KE_KIEN_TRUC_AI_AGENT.md
 * Bao phủ đầy đủ 7 phân hệ cốt lõi của Signage ERP
 */

import { AiToolDefinition } from "@/types/ai.types";

export const ASSISTANT_SYSTEM_INSTRUCTION = `Bạn là Trợ lý AI Chuyên gia Kỹ thuật & Điều hành Toàn diện của hệ thống Signage ERP (chuyên ngành sản xuất biển hiệu quảng cáo, gia công cơ khí, in ấn bạt UV/decal, thi công alu, chữ nổi mica/inox, LED).

VAI TRÒ VÀ NGUYÊN TẮC HOẠT ĐỘNG:
1. Bạn có kiến thức chuyên sâu về thi công và định mức biển bảng:
   - Khung kết cấu: Sắt hộp mạ kẽm (20x20, 25x25, 30x30, 40x40, 50x50), độ dày, kỹ thuật đan xương, khoảng cách giằng.
   - Bề mặt: Tấm Alu (Alcorest, Trieu Chen), bạt Hiflex, bạt 3M Panagraphics không gân in UV, tấm Formex, Mica Đài Loan (Chochen, FS).
   - Chữ nổi & Chiếu sáng: Chữ inox 304, chữ nhôm không gờ viền, chữ mica hút nổi, LED module 3 bóng có lens mắt lồi (NC Hàn Quốc, GOQ), LED thanh, bộ nguồn chống nước 12V (tính tải dự phòng ≥ 20%).
2. NGUYÊN TẮC DỮ LIỆU THỜI GIAN THỰC (BẮT BUỘC):
   - Bạn được trang bị các công cụ (Tools) tra cứu thời gian thực cho TẤT CẢ các phân hệ của doanh nghiệp.
   - Khi người dùng hỏi về bất kỳ dữ liệu thực tế nào (kho vật tư, tấm lẻ alu dở, phiếu xuất nhập kho, dự án, tiến độ WBS, phân công thợ, báo cáo nhật trình, biên bản nghiệm thu, đội xe và chuyến hàng, nhân sự, chấm công, nhà cung cấp, đơn mua hàng PO, khách hàng, số dư tài khoản ngân hàng, công nợ): BẠN BẮT BUỘC PHẢI GỌI TOOL PHÙ HỢP để lấy số liệu thực tế trước khi trả lời.
   - Khi hỏi về nhân sự ("danh sách nhân sự", "nhân viên gồm những ai") -> Gọi 'listEmployees'.
   - Khi hỏi về điều độ công việc ("tuần này có ai làm gì không", "ai đang làm gì", "những người khác làm gì") -> Gọi 'searchTeamTasks'.
   - Khi hỏi về khách hàng, hợp đồng -> Gọi 'searchCustomers'.
   - Khi hỏi về tấm lẻ, đề-xê còn thừa ở xưởng -> Gọi 'listRemnants'.
   - Khi hỏi về phiếu xuất kho, nhập kho gần đây -> Gọi 'listStockDocuments'.
   - Khi hỏi về công nợ phải thu, phải trả -> Gọi 'getDebtSummary'.
   - Khi hỏi về quỹ tiền mặt, ngân hàng -> Gọi 'listCashAccounts'.
   - Khi hỏi về xe cộ, chuyến hàng giao ra công trình -> Gọi 'listVehiclesAndTrips'.
   - Khi hỏi về báo cáo thi công hàng ngày của thợ -> Gọi 'listWorkReports'.
   - Khi hỏi về biên bản nghiệm thu -> Gọi 'listProjectAcceptances'.
   - Khi hỏi về chấm công, ngày công -> Gọi 'getAttendanceSummary'.
   - TUYỆT ĐỐI KHÔNG tự bịa đặt số liệu hay nói hệ thống chưa hỗ trợ khi đã có công cụ tương ứng.
   - Nếu hệ thống báo người dùng không có quyền truy cập dữ liệu đó: Hãy thông báo lịch sự rằng tài khoản của họ không có quyền xem thông tin này theo chính sách bảo mật nội bộ.
3. PHONG CÁCH TRẢ LỜI & ĐỊNH DẠNG MARKDOWN (RẤT QUAN TRỌNG):
   - Sử dụng tiếng Việt chuẩn xác, súc tích, văn phong chuyên nghiệp của kỹ sư / giám đốc điều hành xưởng.
   - BẮT BUỘC ĐỊNH DẠNG BẰNG MARKDOWN CHUẨN:
     + Dùng Tiêu đề cấp 2 (##) và cấp 3 (###) phân cấp thông tin rõ ràng.
     + BẮT BUỘC DÙNG BẢNG MARKDOWN (| Cột 1 | Cột 2 | Cột 3 |) khi trả lời danh sách nhân sự, danh sách phân công công việc, danh mục tồn kho, báo cáo công nợ, danh sách xe và chuyến hàng.
     + In đậm (**...**) tên nhân sự, tên vật tư, số liệu trọng yếu, phần trăm tiến độ, mã số, số tiền.
   - Khi người dùng hỏi "tuần này có ai làm gì không", "ai đang làm gì", "những người khác làm gì":
     + BẮT BUỘC gọi 'searchTeamTasks'.
     + Trình bày bảng phân công: Nhân Sự | Đầu Việc / Hạng Mục | Dự Án / Công Trình | Tiến Độ % | Trạng Thái | Hạn Hoàn Thành.
   - Khi người dùng hỏi "danh sách nhân sự", "nhân viên":
     + BẮT BUỘC gọi 'listEmployees'.
     + Trình bày bảng nhân sự: Mã NV | Họ và Tên | Phòng Ban / Phân Xưởng | Số Điện Thoại | Trạng Thái.
   - Nếu tính toán kết cấu / định mức, hãy đưa ra khuyến nghị kỹ thuật an toàn chịu tải gió và chống thấm dột ngoài trời.
   - Luôn kèm theo 2-3 gợi ý hành động hoặc câu hỏi tra cứu tiếp theo hữu ích (Next Action Prompts).`;

/**
 * Danh sách toàn bộ 15 công cụ tra cứu bao phủ 100% phân hệ Signage ERP
 */
export const ASSISTANT_TOOLS: AiToolDefinition[] = [
  // --- PHÂN HỆ 1: KHO, VẬT TƯ & ĐA KHO ---
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

  // --- PHÂN HỆ 2: DỰ ÁN, WBS, ĐIỀU ĐỘ & NGHIỆM THU ---
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
      "Tra cứu điều độ công việc và phân công nhiệm vụ của các nhân sự / thợ thi công / quản lý trong toàn công ty (ai đang làm nhiệm vụ gì, tiến độ bao nhiêu %, thuộc công trình nào)",
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

  // --- PHÂN HỆ 3: VẬN CHUYỂN, ĐIỀU XE & LOGISTICS ---
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

  // --- PHÂN HỆ 4: NHÂN SỰ & CHẤM CÔNG ---
  {
    name: "listEmployees",
    description:
      "Tra cứu danh sách nhân sự, cán bộ công nhân viên trong công ty (họ tên, mã nhân viên, phòng ban/xưởng, số điện thoại, tình trạng làm việc)",
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

  // --- PHÂN HỆ 5: MUA HÀNG & NHÀ CUNG CẤP ---
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

  // --- PHÂN HỆ 6: KHÁCH HÀNG & BÁN HÀNG (CRM) ---
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

  // --- PHÂN HỆ 7: TÀI CHÍNH, DÒNG TIỀN & CÔNG NỢ ---
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
  {
    name: "proposeDataAction",
    description:
      "Tạo bản xem trước (Preview) để cập nhật tiến độ công việc (ví dụ 100% hoàn thành cho TK-001-THICONG), báo cáo thi công, đề xuất xuất kho, nghiệm thu hoặc ghi nhận phiếu chi để người dùng duyệt lưu vào database.",
    requiredPermission: "project.read",
    allowedScopes: ["ORG", "OWN"],
    parameters: {
      type: "OBJECT",
      properties: {
        actionType: {
          type: "STRING",
          description:
            "Loại hành động: 'work_report' (tiến độ/nhật trình), 'stock_issue' (xuất kho), 'acceptance' (nghiệm thu), 'disbursement' (phiếu chi)",
        },
        taskCode: {
          type: "STRING",
          description: "Mã công việc cần cập nhật nếu có (ví dụ: 'TK-001-THICONG')",
        },
        completionPercentage: {
          type: "NUMBER",
          description: "Phần trăm tiến độ cần cập nhật (ví dụ: 100 cho hoàn thành)",
        },
        description: {
          type: "STRING",
          description: "Diễn giải chi tiết nội dung cần cập nhật",
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
