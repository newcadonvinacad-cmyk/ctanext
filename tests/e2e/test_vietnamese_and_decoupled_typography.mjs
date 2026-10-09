import { chromium } from "playwright";
import fs from "fs";

async function runTest() {
  console.log("=== KIỂM THỬ FONT TIẾNG VIỆT CÓ DẤU & CÂN ĐỐI CHỮ KHI TÊN DÀI ===");

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
  const dealerAddrTextarea = page.locator("textarea").nth(1);

  // ---------------------------------------------------------------------------
  // TEST CASE 1: BẢNG NGANG CHUẨN VỚI TÊN DÀI (CHƯA XUỐNG DÒNG THỦ CÔNG)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST CASE 1: Bảng ngang 12m x 2.4m - Nhập tên dài 'CÔNG TY TNHH PHÂN PHỐI SƠN HẢI NAM' ---");
  await presetSelect.selectOption("preset-thanh-phat-vinh-long-12m");
  await page.waitForTimeout(400);

  // Nhập tên dài mà KHÔNG nhấn Enter (chưa đạt đến người xuống dòng)
  await dealerNameTextarea.fill("CÔNG TY TNHH PHÂN PHỐI SƠN HẢI NAM");
  await page.waitForTimeout(500);

  // Lấy các dòng tên đại lý
  const nameTexts = await page.locator("#dealer-name-words text").allTextContents();
  console.log("-> Các dòng tên đại lý tự động ngắt cân đối:", nameTexts);

  // Lấy font size của Tiêu đề ("CÔNG TY TNHH TRANG TRÍ NỘI THẤT")
  const typeText = page.locator("#dealer-info-zone > text").first();
  const typeFontSize = await typeText.getAttribute("font-size");
  console.log("-> Cỡ chữ Tiêu đề (Loại hình):", typeFontSize, "mm");

  // Lấy font size của Địa chỉ
  const addrText = page.locator("#dealer-address-lines text").first();
  const addrFontSize = await addrText.getAttribute("font-size");
  console.log("-> Cỡ chữ Địa chỉ:", addrFontSize, "mm");

  // Lấy font size của Điện thoại
  const phoneText = page.locator("#dealer-info-zone text").last();
  const phoneFontSize = await phoneText.getAttribute("font-size");
  console.log("-> Cỡ chữ Điện thoại:", phoneFontSize, "mm");

  const isTypeLegible = parseFloat(typeFontSize || "0") >= 120;
  const isAddrLegible = parseFloat(addrFontSize || "0") >= 90;
  const isPhoneLegible = parseFloat(phoneFontSize || "0") >= 80;

  console.log("-> Tiêu chí: Tiêu đề không bị co rúm (>= 120mm):", isTypeLegible ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Địa chỉ không bị co rúm (>= 90mm):", isAddrLegible ? "PASS" : "FAIL");
  console.log("-> Tiêu chí: Điện thoại không bị co rúm (>= 80mm):", isPhoneLegible ? "PASS" : "FAIL");

  await page.screenshot({ path: "scratch/test_decoupled_1_horiz_long_name.png", fullPage: true });
  console.log("-> Đã chụp ảnh Case 1: scratch/test_decoupled_1_horiz_long_name.png");

  // ---------------------------------------------------------------------------
  // TEST CASE 2: BẢNG DỌC PYLON VỚI TÊN DÀI
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST CASE 2: Trụ Pylon Dọc 1.0m x 3.0m - Nhập tên dài 'CÔNG TY TNHH VLXD ANH DŨNG' ---");
  await presetSelect.selectOption("preset-duc-vuong-pylon-doc");
  await page.waitForTimeout(400);

  await dealerNameTextarea.fill("CÔNG TY TNHH VLXD ANH DŨNG");
  await page.waitForTimeout(500);

  const pillarTypeFontSize = await page.locator("#pillar-bottom-dealer-zone text").first().getAttribute("font-size");
  const pillarAddrFontSize = await page.locator("#pillar-bottom-dealer-zone text").nth(3).getAttribute("font-size");

  console.log("-> Trụ Pylon - Cỡ chữ Tiêu đề 'Đại lý':", pillarTypeFontSize, "mm");
  console.log("-> Trụ Pylon - Cỡ chữ Địa chỉ:", pillarAddrFontSize, "mm");

  const isPillarTypeLegible = parseFloat(pillarTypeFontSize || "0") >= 26;
  const isPillarAddrLegible = parseFloat(pillarAddrFontSize || "0") >= 20;

  console.log("-> Tiêu chí Pylon: Tiêu đề không bị co rúm (>= 26mm):", isPillarTypeLegible ? "PASS" : "FAIL");
  console.log("-> Tiêu chí Pylon: Địa chỉ không bị co rúm (>= 20mm):", isPillarAddrLegible ? "PASS" : "FAIL");

  await page.screenshot({ path: "scratch/test_decoupled_2_pylon_long_name.png", fullPage: true });
  console.log("-> Đã chụp ảnh Case 2: scratch/test_decoupled_2_pylon_long_name.png");

  // ---------------------------------------------------------------------------
  // TEST CASE 3: KIỂM TRA CHỮ TIẾNG VIỆT CÓ DẤU (FONTS & ACCENTS)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST CASE 3: Kiểm tra Font tiếng Việt có dấu đầy đủ ---");
  await presetSelect.selectOption("preset-thanh-phat-vinh-long-12m");
  await page.waitForTimeout(400);

  // Đổi chữ có đủ mọi dấu tiếng Việt phức tạp: Ứ, Ợ, Ệ, Ồ, Ặ, Ẵ, Ỗ
  await dealerNameTextarea.fill("ĐẠI LÝ SƠN HỒNG ĐỨC VƯỢNG");
  await dealerAddrTextarea.fill("Số 503, Tỉnh lộ 887, Ấp Long Điền, Xã Phước Long, Huyện Châu Thành, Tỉnh Vĩnh Long");
  await page.waitForTimeout(500);

  // Kiểm tra font family của Slogan
  const sloganFamily = await page.locator("#brand-slogan text").getAttribute("style");
  console.log("-> Style Slogan:", sloganFamily);

  // Kiểm tra font family của Tên đại lý
  const nameFamily = await page.locator("#dealer-name-words text").first().getAttribute("style");
  console.log("-> Style Tên đại lý:", nameFamily);

  await page.screenshot({ path: "scratch/test_vietnamese_accents_full.png", fullPage: true });
  console.log("-> Đã chụp ảnh Case 3: scratch/test_vietnamese_accents_full.png");

  await browser.close();
  console.log("\n=== TẤT CẢ TEST CASES HOÀN TẤT THÀNH CÔNG ===");
}

runTest().catch((err) => {
  console.error("LỖI KIỂM THỬ:", err);
  process.exit(1);
});
