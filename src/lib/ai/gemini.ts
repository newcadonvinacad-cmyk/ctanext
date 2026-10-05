import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

/**
 * Khởi tạo Google Gen AI Client
 */
export const geminiAI = new GoogleGenAI({ apiKey });

/**
 * Lớp dịch vụ AI giao tiếp qua model gemini-3.5-flash-lite
 */
export const geminiService = {
  /**
   * Gọi văn bản thông thường
   */
  async generateText({
    prompt,
    systemInstruction,
    model = DEFAULT_MODEL,
  }: {
    prompt: string;
    systemInstruction?: string;
    model?: string;
  }): Promise<string> {
    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const response = await geminiAI.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    return response.text?.trim() || "";
  },

  /**
   * Gọi trả về JSON có cấu trúc (Structured JSON)
   */
  async generateJSON<T = any>({
    prompt,
    systemInstruction,
    model = DEFAULT_MODEL,
  }: {
    prompt: string;
    systemInstruction?: string;
    model?: string;
  }): Promise<T> {
    const fullSystemInstruction = `${systemInstruction || ""}\nQUAN TRỌNG: Bạn BẮT BUỘC chỉ trả về duy nhất chuỗi JSON hợp lệ, không thêm bất kỳ văn bản giải thích hay khối markdown (\`\`\`json).`;

    const rawText = await this.generateText({
      prompt,
      systemInstruction: fullSystemInstruction,
      model,
    });

    try {
      // Loại bỏ khối markdown nếu model có kèm vào
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned) as T;
    } catch (err: any) {
      throw new Error(`Lỗi parse kết quả JSON từ Gemini: ${err.message}. Raw: ${rawText}`);
    }
  },

  /**
   * Bước 1: Gửi Prompt kèm Function Declarations (Tools)
   * Gemini sẽ quyết định trả về Text trực tiếp hoặc một danh sách functionCalls
   */
  async callWithTools({
    prompt,
    systemInstruction,
    tools,
    model = DEFAULT_MODEL,
  }: {
    prompt: string;
    systemInstruction?: string;
    tools: any[];
    model?: string;
  }): Promise<{
    hasFunctionCalls: boolean;
    functionCalls: Array<{ id?: string; name: string; args: any }>;
    text: string;
    candidateContent?: any;
  }> {
    const config: any = {
      tools: [{ functionDeclarations: tools }],
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const response = await geminiAI.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    const rawCalls = response.functionCalls || [];
    const validCalls = rawCalls
      .filter((fc): fc is { name: string; args?: any; id?: string } => typeof fc.name === "string")
      .map((fc) => ({
        id: fc.id,
        name: fc.name,
        args: fc.args || {},
      }));

    const candidateContent = response.candidates?.[0]?.content;

    return {
      hasFunctionCalls: validCalls.length > 0,
      functionCalls: validCalls,
      text: response.text?.trim() || "",
      candidateContent,
    };
  },

  /**
   * Bước 2: Gửi kết quả Function Execution trở lại Gemini để tổng hợp câu trả lời cuối cùng
   */
  async sendFunctionResults({
    prompt,
    systemInstruction,
    tools,
    candidateContent,
    functionResults,
    model = DEFAULT_MODEL,
  }: {
    prompt: string;
    systemInstruction?: string;
    tools: any[];
    candidateContent: any;
    functionResults: Array<{ id?: string; name: string; response: any }>;
    model?: string;
  }): Promise<string> {
    const parts = functionResults.map((fr) => {
      const respObj: any = {
        name: fr.name,
        response: fr.response,
      };
      if (fr.id) {
        respObj.id = fr.id;
      }
      return { functionResponse: respObj };
    });

    const contents = [
      { role: "user", parts: [{ text: prompt }] },
      candidateContent,
      { role: "user", parts },
    ];

    const config: any = {
      tools: [{ functionDeclarations: tools }],
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const response = await geminiAI.models.generateContent({
      model,
      contents,
      config,
    });

    return response.text?.trim() || "";
  },

  /**
   * 1. Bóc tách báo cáo nhật trình bằng giọng nói / chat tự nhiên của thợ
   */
  async parseDailySpeechReport(speechText: string) {
    const prompt = `Hãy bóc tách đoạn văn bản báo cáo công việc hàng ngày của thợ làm biển quảng cáo sau đây thành JSON có cấu trúc:
"""
${speechText}
"""

Cấu trúc JSON cần trả về:
{
  "work_summary": "Tóm tắt ngắn gọn công việc",
  "tasks_completed": ["công việc 1", "công việc 2"],
  "materials_used": [
    { "name": "tên vật tư (vd: sắt hộp, led, decal, alu)", "quantity": 0, "unit": "đơn vị (cây, mét, cuộn, bóng...)" }
  ],
  "obstacles_or_delays": "khó khăn hiện trường (mưa gió, thiếu nguồn điện, khách đổi vị trí... nếu có, không có thì null)",
  "next_day_plan": "dự kiến công việc ngày mai",
  "completion_percentage_estimate": 80
}`;

    return this.generateJSON({
      prompt,
      systemInstruction: "Bạn là trợ lý điều độ sản xuất và thi công của xưởng làm biển hiệu quảng cáo.",
    });
  },

  /**
   * 2. Bóc tách hóa đơn / chứng từ mua hàng phục vụ tạo Phiếu mua hàng và Đề xuất nhập kho
   */
  async ocrReceiptImage({
    imageBase64,
    mimeType = "image/jpeg",
  }: {
    imageBase64: string;
    mimeType?: string;
  }) {
    const prompt = `Hãy đóng vai trò chuyên gia bóc tách hóa đơn mua hàng cho xưởng sản xuất biển quảng cáo. Phân tích hình ảnh hóa đơn GTGT / phiếu xuất kho kiêm giao hàng từ nhà cung cấp và trích xuất dữ liệu để lập Phiếu Nhập Kho thành JSON:
{
  "vendor_name": "Tên nhà cung cấp vật tư (đại lý sắt, đại lý alu, led, in ấn...)",
  "invoice_number": "Số hóa đơn hoặc số phiếu giao hàng",
  "invoice_date": "YYYY-MM-DD",
  "total_amount": 0,
  "items": [
    {
      "item_name": "Tên và quy cách vật tư (vd: Sắt hộp 20x20 mạ kẽm, Tấm Alu Alcorest 1.2x2.4m, Led hắt 3 bóng...)",
      "unit": "Đơn vị tính (cây, tấm, cuộn, mét, bóng...)",
      "quantity": 1,
      "unit_price": 0,
      "amount": 0
    }
  ],
  "note": "Ghi chú điều khoản thanh toán hoặc tình trạng hàng"
}`;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await geminiAI.models.generateContent({
      model: DEFAULT_MODEL,
      contents: [
        prompt,
        {
          inlineData: {
            data: cleanBase64,
            mimeType,
          },
        },
      ],
      config: {
        systemInstruction: "Chỉ trả về JSON thuần túy, không có markdown codeblock.",
      },
    });

    const text = response.text?.trim() || "{}";
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  },
};

export default geminiService;
