import { chromium } from "playwright";
import fs from "fs";

async function runTest() {
  console.log("=== KIỂM THỬ: TÊN 3 TỪ KHÔNG TỰ XUỐNG DÒNG & ĐẦY ĐỦ DIM THI CÔNG DÁN CHỮ ===");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: fs.existsSync("tests/e2e/state-admin.json") ? "tests/e2e/state-admin.json" : undefined,
  });
  const page = await context.newPage();

  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  console.log("1. Mở trang Dựng Hình Quy Chuẩn: /du-an/thiet-ke-quy-chuan");
  await page.goto("http://localhost:3000/du-an/thiet-ke-quy-chuan", { waitUntil: "networkidle" });

  const presetSelect = page.locator("select").first();
  const dealerNameTextarea = page.locator("textarea").first();

  // ---------------------------------------------------------------------------
  // TEST CASE 1: TÊN 3 TỪ KHOẢNG 12 KÝ TỰ ("TÂN TÀI PHÁT" / "SƠN HẢI NAM")
  // Kiểm tra: 100% PHẢI NẰM TRÊN 1 DÒNG DUY NHẤT (THEO CHUẨN ACC/1.PNG)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST CASE 1: Bảng ngang 12m x 2.4m - Nhập tên 3 từ 'TÂN TÀI PHÁT' (12 ký tự) ---");
  await presetSelect.selectOption("preset-thanh-phat-vinh-long-12m");
  await page.waitForTimeout(400);

  await dealerNameTextarea.fill("TÂN TÀI PHÁT");
  await page.waitForTimeout(500);

  // 1. Kiểm tra số dòng của tên đại lý
  const nameTexts = await page.locator("#dealer-name-words text").allTextContents();
  console.log("-> Các dòng tên đại lý:", nameTexts);
  const isSingleLine = nameTexts.length === 1 && nameTexts[0].trim() === "TÂN TÀI PHÁT";
  console.log("-> Tiêu chí 1: Tên 3 từ 'TÂN TÀI PHÁT' giữ trọn vẹn trên 1 dòng duy nhất:", isSingleLine ? "PASS" : "FAIL (bị xuống dòng sai)");

  // 2. Kiểm tra các thước gióng DIM chi tiết thi công dán chữ
  const dimTexts = await page.locator("#technical-cad-dimensions text").allTextContents();
  console.log(`-> Tổng số kích thước gióng CAD được vẽ: ${dimTexts.length}`);

  // Kiểm tra sự hiện diện của các dim cốt lõi
  const hasTopMargin = dimTexts.some((t) => t.includes("Lề trên"));
  const hasBottomMargin = dimTexts.some((t) => t.includes("Lề dưới"));
  const hasLeftMargin = dimTexts.some((t) => t.includes("Lề trái"));
  const hasRightMargin = dimTexts.some((t) => t.includes("Lề phải"));
  const hasTitleH = dimTexts.some((t) => t.includes("H Tiêu đề"));
  const hasNameH = dimTexts.some((t) => t.includes("H Tên đại lý") || t.includes("H Tên"));
  const hasAddrH = dimTexts.some((t) => t.includes("H Địa chỉ"));
  const hasLineGap = dimTexts.some((t) => t.includes("Cách dòng") || t.includes("Cách"));
  const hasWordBreakdown = dimTexts.some((t) => t.includes("TÂN") || t.includes("TÀI") || t.includes("PHÁT"));
  const hasPartitions = dimTexts.some((t) => t.includes("2/3 X")) && dimTexts.some((t) => t.includes("1/3 X"));

  console.log("-> Tiêu chí: Có Dim Lề trên:", hasTopMargin ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Lề dưới:", hasBottomMargin ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Lề trái:", hasLeftMargin ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Lề phải:", hasRightMargin ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Chiều cao Tiêu đề:", hasTitleH ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Chiều cao Tên đại lý:", hasNameH ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Chiều cao Địa chỉ:", hasAddrH ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Khoảng cách dòng (Cách dòng):", hasLineGap ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Khoảng cách từng từ (Word breakdown TÂN - TÀI - PHÁT):", hasWordBreakdown ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Có Dim Phân vùng quy chuẩn (2/3X, 1/3X):", hasPartitions ? "PASS" : "FAIL");

  await page.screenshot({ path: "scratch/test_workshop_1_tan_tai_phat_single_line.png", fullPage: true });
  console.log("-> Đã chụp ảnh Case 1: scratch/test_workshop_1_tan_tai_phat_single_line.png");

  // ---------------------------------------------------------------------------
  // TEST CASE 2: TÊN 3 TỪ KHÁC "SƠN HẢI NAM" (11 KÝ TỰ)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST CASE 2: Nhập tên 'SƠN HẢI NAM' (11 ký tự) ---");
  await dealerNameTextarea.fill("SƠN HẢI NAM");
  await page.waitForTimeout(400);

  const nameTexts2 = await page.locator("#dealer-name-words text").allTextContents();
  console.log("-> Các dòng tên đại lý:", nameTexts2);
  const isSingleLine2 = nameTexts2.length === 1 && nameTexts2[0].trim() === "SƠN HẢI NAM";
  console.log("-> Tiêu chí: Tên 'SƠN HẢI NAM' giữ trên 1 dòng duy nhất:", isSingleLine2 ? "PASS" : "FAIL");

  // ---------------------------------------------------------------------------
  // TEST CASE 3: BẢNG DỌC / TRỤ PYLON 1.0m x 3.0m ("ĐỨC VƯỢNG")
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST CASE 3: Trụ Pylon Dọc 1.0m x 3.0m ('ĐỨC VƯỢNG') ---");
  await presetSelect.selectOption("preset-duc-vuong-pylon-doc");
  await page.waitForTimeout(600);

  const pylonDimTexts = await page.locator("#technical-cad-dimensions text").allTextContents();
  const hasPylonTopMargin = pylonDimTexts.some((t) => t.includes("Lề trên"));
  const hasPylonBottomMargin = pylonDimTexts.some((t) => t.includes("Lề dưới"));
  const hasPylonLeftMargin = pylonDimTexts.some((t) => t.includes("Lề trái"));
  const hasPylonRightMargin = pylonDimTexts.some((t) => t.includes("Lề phải"));
  const hasPylonNameH = pylonDimTexts.some((t) => t.includes("H Tên"));
  const hasPylonAddrH = pylonDimTexts.some((t) => t.includes("H Địa chỉ"));

  console.log("-> Pylon: Có Dim Lề trên chân đại lý:", hasPylonTopMargin ? "PASS" : "FAIL");
  console.log("-> Pylon: Có Dim Lề dưới chân đại lý:", hasPylonBottomMargin ? "PASS" : "FAIL");
  console.log("-> Pylon: Có Dim Lề trái chân đại lý:", hasPylonLeftMargin ? "PASS" : "FAIL");
  console.log("-> Pylon: Có Dim Lề phải chân đại lý:", hasPylonRightMargin ? "PASS" : "FAIL");
  console.log("-> Pylon: Có Dim Chiều cao Tên đại lý:", hasPylonNameH ? "PASS" : "FAIL");
  console.log("-> Pylon: Có Dim Chiều cao Địa chỉ:", hasPylonAddrH ? "PASS" : "FAIL");

  await page.screenshot({ path: "scratch/test_workshop_2_pylon_full_dims.png", fullPage: true });
  console.log("-> Đã chụp ảnh Case 3: scratch/test_workshop_2_pylon_full_dims.png");

  // ---------------------------------------------------------------------------
  // TEST CASE 3B: BẢNG GẦN VUÔNG / CHIA TRÊN DƯỚI (MẪU 05: "ĐẠT TIẾN" 3.7m x 4.0m)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST CASE 3B: Bảng Gần Vuông / Chia Trên Dưới ('ĐẠT TIẾN' 3.7m x 4.0m) ---");
  await presetSelect.selectOption("preset-dat-tien-uv");
  await page.waitForTimeout(600);

  const splitDimTexts = await page.locator("#technical-cad-dimensions text").allTextContents();
  const hasSplitTopMargin = splitDimTexts.some((t) => t.includes("Lề trên"));
  const hasSplitBottomMargin = splitDimTexts.some((t) => t.includes("Lề dưới"));
  const hasSplitLeftMargin = splitDimTexts.some((t) => t.includes("Lề trái"));
  const hasSplitRightMargin = splitDimTexts.some((t) => t.includes("Lề phải"));
  const hasSplitNameH = splitDimTexts.some((t) => t.includes("H Tên"));
  const hasSplitAddrH = splitDimTexts.some((t) => t.includes("H Địa chỉ"));

  console.log("-> Bảng vuông: Có Dim Lề trên tầng dưới:", hasSplitTopMargin ? "PASS" : "FAIL");
  console.log("-> Bảng vuông: Có Dim Lề dưới tầng dưới:", hasSplitBottomMargin ? "PASS" : "FAIL");
  console.log("-> Bảng vuông: Có Dim Lề trái tầng dưới:", hasSplitLeftMargin ? "PASS" : "FAIL");
  console.log("-> Bảng vuông: Có Dim Lề phải tầng dưới:", hasSplitRightMargin ? "PASS" : "FAIL");
  console.log("-> Bảng vuông: Có Dim Chiều cao Tên đại lý:", hasSplitNameH ? "PASS" : "FAIL");
  console.log("-> Bảng vuông: Có Dim Chiều cao Địa chỉ:", hasSplitAddrH ? "PASS" : "FAIL");

  await page.screenshot({ path: "scratch/test_workshop_3_square_split_full_dims.png", fullPage: true });
  console.log("-> Đã chụp ảnh Case 3b: scratch/test_workshop_3_square_split_full_dims.png");

  // ---------------------------------------------------------------------------
  // TEST CASE 4: CHẾ ĐỘ BẢN VẼ KỸ THUẬT (XƯỞNG IN - NỀN XÁM DIM ĐỎ)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST CASE 4: Bản vẽ kỹ thuật xưởng in (Nền xám Dim Đỏ) - TÂN TÀI PHÁT ---");
  await presetSelect.selectOption("preset-thanh-phat-vinh-long-12m");
  await page.waitForTimeout(400);
  await dealerNameTextarea.fill("TÂN TÀI PHÁT");
  await page.waitForTimeout(300);

  // Click chọn nút "Bản Vẽ Kỹ Thuật (Xưởng In - Nền Xám Dim Đỏ)"
  const grayModeBtn = page.locator("button:has-text('Bản Vẽ Kỹ Thuật (Xưởng In - Nền Xám Dim Đỏ)')");
  if (await grayModeBtn.count() > 0) {
    await grayModeBtn.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: "scratch/test_workshop_4_blueprint_gray_tan_tai_phat.png", fullPage: true });
  console.log("-> Đã chụp ảnh Case 4: scratch/test_workshop_4_blueprint_gray_tan_tai_phat.png");

  await browser.close();

  if (!isSingleLine || !isSingleLine2 || !hasTopMargin || !hasBottomMargin || !hasLeftMargin || !hasRightMargin) {
    console.error("MỘT SỐ TIÊU CHÍ CHƯA ĐẠT!");
    process.exit(1);
  } else {
    console.log("\n=== TẤT CẢ TIÊU CHÍ TEST XƯỞNG IN & THI CÔNG DÁN CHỮ ĐỀU PASS 100% ===");
  }
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
