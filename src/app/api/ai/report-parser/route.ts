import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { geminiService } from "@/lib/ai/gemini";
import { getDbPool, getCachedOrgId } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface AiReportParseResult {
  workSummary: string;
  tasksCompleted: string[];
  completionPercentage: number;
  workingHours: number;
  materialsUsed: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  materialsRequested: Array<{
    name: string;
    quantity: number;
    unit: string;
    reason: string;
  }>;
  issuesOrObstacles: string | null;
  nextDayPlan: string | null;
  performanceEvaluation: {
    score: number; // 1 to 10
    rating: "Xuất sắc" | "Tốt" | "Đạt yêu cầu" | "Cần cải thiện";
    speedRating: "Vượt tiến độ" | "Đúng tiến độ" | "Chậm tiến độ";
    qualityComment: string;
    aiRecommendations: string;
  };
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    const { rawText, taskTitle, projectName, currentProgress, employeeName } = body;

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp nội dung mô tả hoặc lời thoại công việc" },
        { status: 400 }
      );
    }

    const prompt = `
Bạn là Trợ lý Giám sát & Điều phối Kỹ thuật cấp cao của Công ty Biển Quảng Cáo & Thi Công Biển Hiệu ERP.
Nhiệm vụ của bạn là phân tích đoạn văn bản báo cáo công việc (do thợ thi công hoặc quản lý dự án nhập bằng lời nói/văn bản thô) và bóc tách thành đối tượng JSON chuẩn xác theo đúng định dạng được yêu cầu, đồng thời đánh giá năng suất (Performance Evaluation) của nhân sự.

---
NGỮ CẢNH CÔNG VIỆC:
- Tên dự án: ${projectName || "Dự án thi công biển hiệu"}
- Nhiệm vụ đang thực hiện: ${taskTitle || "Hạng mục thi công"}
- Tiến độ hiện tại trước báo cáo: ${currentProgress ?? 0}%
- Nhân sự báo cáo: ${employeeName || session.user.name || "Thợ thi công"}
- Nội dung báo cáo thô của người dùng:
"""
${rawText.trim()}
"""

---
YÊU CẦU ĐẦU RA JSON (TUYỆT ĐỐI CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG KÈM TEXT GIẢI THÍCH):
{
  "workSummary": "Tóm tắt ngắn gọn, súc tích và chuyên nghiệp về khối lượng công việc đã hoàn thành trong ngày/ca làm việc",
  "tasksCompleted": [
    "Hạng mục công việc cụ thể 1",
    "Hạng mục công việc cụ thể 2"
  ],
  "completionPercentage": 85, // Số nguyên từ 1 đến 100 thể hiện tổng % tiến độ của nhiệm vụ sau khi hoàn thành ca này (phải >= tiến độ trước đó)
  "workingHours": 7.5, // Số giờ làm việc ước tính hoặc được nhắc đến (mặc định 8 nếu là cả ngày, hoặc số giờ cụ thể)
  "materialsUsed": [
    {
      "name": "Tên vật tư đã sử dụng (sắt hộp, alu, mica, led module, nguồn, bạt 3M, keo titebond...)",
      "quantity": 10,
      "unit": "Đơn vị tính (CAY, TAM, CAI, M2, TUYP, CUON...)"
    }
  ],
  "materialsRequested": [
    {
      "name": "Tên vật tư đề xuất cấp bổ sung nếu phát sinh thiếu",
      "quantity": 2,
      "unit": "ĐVT",
      "reason": "Lý do cần cấp thêm"
    }
  ],
  "issuesOrObstacles": "Các khó khăn hiện trường (mưa gió, vướng kết cấu, mất điện, mặt bằng hẹp...) hoặc null nếu không có",
  "nextDayPlan": "Kế hoạch công việc tiếp theo dự kiến hoặc null",
  "performanceEvaluation": {
    "score": 8.5, // Điểm năng suất từ 1.0 đến 10.0 (chấm điểm dựa trên khối lượng công việc đạt được, thời gian và tính chủ động xử lý khó khăn)
    "rating": "Tốt", // Một trong các giá trị: "Xuất sắc", "Tốt", "Đạt yêu cầu", "Cần cải thiện"
    "speedRating": "Đúng tiến độ", // Một trong: "Vượt tiến độ", "Đúng tiến độ", "Chậm tiến độ"
    "qualityComment": "Nhận xét khách quan, mang tính xây dựng về năng suất và chất lượng tay nghề của thợ/tổ đội",
    "aiRecommendations": "Đề xuất kỹ thuật hoặc phương án hỗ trợ của AI cho Quản lý dự án để đẩy nhanh tiến độ và đảm bảo an toàn"
  }
}
`;

    const parsedResult = await geminiService.generateJSON<AiReportParseResult>({
      prompt,
      systemInstruction:
        "Bạn là chuyên gia giám sát thi công biển quảng cáo. Hãy trích xuất thông tin chính xác từ văn bản và đánh giá hiệu suất khách quan, chính xác.",
    });

    // Ghi nhật ký vào erp.ai_runs phục vụ audit và học hỏi
    try {
      const pool = getDbPool();
      const orgId = await getCachedOrgId("SIGNAGE");
      const memRes = await pool.query(
        "SELECT id FROM erp.memberships WHERE user_id = $1 LIMIT 1",
        [session.user.id]
      );
      const memId = memRes.rows[0]?.id;
      await pool.query(
        `INSERT INTO erp.ai_runs (
           organization_id, agent_code, status, model, input_snapshot, output_json,
           schema_version, request_id, requested_by, created_by
         )
         VALUES ($1, 'WORK_REPORT_PARSER', 'completed', 'gemini-3.5-flash-lite', $2, $3, 'v1', $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          orgId,
          JSON.stringify({ rawText, taskTitle, projectName, currentProgress }),
          JSON.stringify(parsedResult),
          crypto.randomUUID(),
          memId,
          session.user.id,
        ]
      );
    } catch (logErr) {
      console.warn("Failed to log ai_run for report parser:", logErr);
    }

    return NextResponse.json({ success: true, data: parsedResult });
  } catch (err: any) {
    console.error("Lỗi parse AI work report:", err);
    return NextResponse.json(
      { error: "Lỗi AI phân tích báo cáo: " + (err.message || "Không thể xử lý văn bản") },
      { status: 500 }
    );
  }
}
