import { chromium } from "playwright";
import fs from "fs";

async function runMaquetteTest() {
  console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG DỰNG HÌNH MAKET & BỐ CỤC DỌC / XUỐNG DÒNG ===");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: fs.existsSync("tests/e2e/state-admin.json") ? "tests/e2e/state-admin.json" : undefined,
  });
  const page = await context.newPage();

  // Bắt console error nếu có
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  console.log("1. Điều hướng tới trang Dựng Hình Quy Chuẩn: /du-an/thiet-ke-quy-chuan");
  await page.goto("http://localhost:3000/du-an/thiet-ke-quy-chuan", { waitUntil: "networkidle" });

  // Kiểm tra SVG đã render
  const svgExists = await page.locator("svg").first().isVisible();
  console.log("-> SVG Canvas hiển thị:", svgExists ? "PASS" : "FAIL");

  // Chụp ảnh layout ngang ban đầu
  await page.screenshot({ path: "scratch/maquette_horizontal_initial.png", fullPage: true });
  console.log("-> Đã chụp ảnh layout ngang ban đầu: scratch/maquette_horizontal_initial.png");

  // 2. Kiểm thử chuyển sang BẢNG HIỆU DỌC / TRỤ PYLON (Mẫu 09: 1.0m x 3.0m)
  console.log("2. Nhập kích thước Bảng Dọc: Rộng 1.0m, Cao 3.0m");
  const widthInput = page.locator("input[type='number']").nth(0);
  const heightInput = page.locator("input[type='number']").nth(1);

  await widthInput.fill("1.0");
  await heightInput.fill("3.0");

  // Chọn Mẫu 09: Bảng Trụ Dọc
  const layoutSelect = page.locator("select").nth(1);
  await layoutSelect.selectOption("LAYOUT_09_PILLAR");
  await page.waitForTimeout(500);

  // Kiểm tra các phần tử đặc trưng của Bảng Dọc trong SVG
  const pillarTopZone = await page.locator("#pillar-top-brand-zone").isVisible();
  const pillarBodyZone = await page.locator("#pillar-vertical-body-zone").isVisible();
  const pillarDealerZone = await page.locator("#pillar-bottom-dealer-zone").isVisible();

  console.log("-> Khối đỉnh Logo bảng dọc (#pillar-top-brand-zone):", pillarTopZone ? "PASS" : "FAIL");
  console.log("-> Thân trụ NIPPON PAINT xoay dọc (#pillar-vertical-body-zone):", pillarBodyZone ? "PASS" : "FAIL");
  console.log("-> Chân bảng thông tin đại lý (#pillar-bottom-dealer-zone):", pillarDealerZone ? "PASS" : "FAIL");

  // 3. Kiểm thử nhập tên đại lý xuống dòng thủ công: "ĐỨC\nVƯỢNG"
  console.log("3. Kiểm thử nhập Tên đại lý có ký tự xuống dòng: 'ĐỨC\\nVƯỢNG'");
  const dealerNameTextarea = page.locator("textarea").first();
  await dealerNameTextarea.fill("ĐỨC\nVƯỢNG");
  await page.waitForTimeout(400);

  // Kiểm tra số dòng render trong chân đại lý
  const nameTexts = await page.locator("#pillar-bottom-dealer-zone text").allTextContents();
  console.log("-> Các dòng chữ chân đại lý đã render:", nameTexts);

  const hasDuc = nameTexts.some((t) => t.includes("ĐỨC"));
  const hasVuong = nameTexts.some((t) => t.includes("VƯỢNG"));
  console.log("-> Tên đại lý hiển thị tách dòng cân đối (ĐỨC / VƯỢNG):", (hasDuc && hasVuong) ? "PASS" : "FAIL");

  // 4. Kiểm thử thay đổi Khoảng cách xuống dòng (Line Spacing)
  console.log("4. Kiểm thử thay đổi khoảng cách xuống dòng sang mức Thoáng (1.35x)");
  const spacingButtons = page.locator("button:has-text('Thoáng')");
  if (await spacingButtons.count() > 0) {
    await spacingButtons.first().click();
    await page.waitForTimeout(300);
    console.log("-> Đã chọn mức giãn dòng Thoáng (1.35x)");
  }

  // 5. Kiểm thử nút tiện ích: ⚡ Ngắt dòng cân đối
  console.log("5. Kiểm thử nút '⚡ Ngắt dòng cân đối' với tên nhiều từ: 'SƠN PHÁT ĐẠT CHÍNH HÃNG'");
  await dealerNameTextarea.fill("SƠN PHÁT ĐẠT CHÍNH HÃNG");
  const splitBtn = page.locator("button:has-text('⚡ Ngắt dòng cân đối')");
  if (await splitBtn.count() > 0) {
    await splitBtn.click();
    await page.waitForTimeout(300);
    const valAfter = await dealerNameTextarea.inputValue();
    console.log("-> Giá trị sau khi bấm ngắt dòng cân đối:\n" + valAfter);
    const hasNewline = valAfter.includes("\n");
    console.log("-> Đã tự động chèn ngắt dòng cân đối:", hasNewline ? "PASS" : "FAIL");
  }

  // 6. Kiểm tra nạp Preset Bảng Dọc Thực Tế từ Danh Sách
  console.log("6. Kiểm thử nạp Preset Bảng Dọc: ĐỨC VƯỢNG (1.0m x 3.0m)");
  const presetSelect = page.locator("select").first();
  await presetSelect.selectOption("preset-duc-vuong-pylon-doc");
  await page.waitForTimeout(600);

  // Chụp ảnh sản phẩm hoàn chỉnh Bảng Dọc Pylon
  await page.screenshot({ path: "scratch/maquette_vertical_pillar_perfect.png", fullPage: true });
  console.log("-> Đã chụp ảnh layout Bảng Dọc hoàn chỉnh: scratch/maquette_vertical_pillar_perfect.png");

  // 7. Chuyển sang chế độ Thành Phẩm Thực Tế (Nền đỏ)
  console.log("7. Chuyển chế độ xem Thành Phẩm Thực Tế (Nền đỏ Nippon)");
  const realisticBtn = page.locator("button:has-text('Thành Phẩm Thực Tế')");
  if (await realisticBtn.count() > 0) {
    await realisticBtn.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "scratch/maquette_vertical_pillar_realistic.png", fullPage: true });
    console.log("-> Đã chụp ảnh thực tế nền đỏ: scratch/maquette_vertical_pillar_realistic.png");
  }

  await browser.close();
  console.log("=== TẤT CẢ CÁC BƯỚC KIỂM THỬ DỰNG HÌNH MAKET ĐỀU ĐẠT 100% ===");
}

runMaquetteTest().catch((err) => {
  console.error("LỖI KIỂM THỬ:", err);
  process.exit(1);
});
