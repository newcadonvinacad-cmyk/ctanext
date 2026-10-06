# QUY TẮC CẤU TRÚC VÀ TỔ CHỨC MÃ NGUỒN (SIGNAGE ERP)

---

## 1. Sơ Đồ Cấu Trúc Tổng Thể

```text
src/
├── types/          # HỢP ĐỒNG DỮ LIỆU & SCHEMA (Data Contracts & DTOs)
├── services/       # TẦNG NGHIỆP VỤ CỐT LÕI (Business Logic Layer)
├── lib/            # TẦNG HẠ TẦNG & KẾT NỐI NGOÀI (Infrastructure & Drivers)
├── app/            # TẦNG ĐIỀU HƯỚNG & ROUTING (Next.js App Router)
├── components/     # TẦNG GIAO DIỆN TÁI SỬ DỤNG (Presentation / UI Components)
├── hooks/          # TẬP HỢP CUSTOM HOOKS (Reusable UI State & Device APIs)
└── constants/      # HẰNG SỐ & ENUM CỐ ĐỊNH HỆ THỐNG (System Config & Constants)
```

---

## 2. Chi Tiết Cấu Trúc `src/components/` (Tầng Giao Diện)

Thư mục `components/` chia làm 3 nhóm rõ ràng theo mức độ trừu tượng:

```text
src/components/
├── ui/                 # 1. COMPONENT NGUYÊN TỬ DÙNG CHUNG (UI Primitives)
│   ├── Button.tsx      # Nút bấm chuẩn (các biến thể: primary, outline, danger)
│   ├── Input.tsx       # Ô nhập văn bản, số, tìm kiếm
│   ├── Modal.tsx       # Hộp thoại pop-up, xác nhận
│   ├── Badge.tsx       # Thẻ trạng thái (vd: "Đang gia công", "Đã duyệt")
│   └── Table.tsx       # Bảng hiển thị dữ liệu chuẩn
│
├── layouts/            # 2. COMPONENT KHUNG ĐIỀU HƯỚNG (Shell & Layout Components)
│   ├── Sidebar.tsx     # Menu dọc trên Desktop
│   ├── Header.tsx      # Thanh công cụ trên cùng (thông tin người dùng, chuông báo)
│   └── BottomNav.tsx   # Thanh điều hướng dưới đáy màn hình (tối ưu cho thợ dùng điện thoại)
│
└── shared/             # 3. COMPONENT NGHIỆP VỤ PHỨC HỢP (Domain-specific Widgets)
    ├── CameraCapture.tsx   # Bộ chụp ảnh có đóng dấu ngày giờ & GPS
    ├── SignaturePad.tsx    # Bảng vẽ cảm ứng để khách ký tay nghiệm thu
    ├── ImageDropzone.tsx   # Kéo thả upload ảnh hóa đơn / bằng chứng
    └── BarcodeScanner.tsx  # Quét mã QR / Barcode tem vật tư trong kho
```

### 3 Quy tắc vàng cho Component:
1. **Chỉ làm nhiệm vụ hiển thị (Dumb / Presentational Component)**: Nhận dữ liệu qua `props`, kích hoạt sự kiện qua hàm callback (`onClick`, `onSave`). Không gọi thẳng câu lệnh SQL.
2. **Khai báo `"use client"` đúng chỗ**:
   * Chỉ thêm dòng `"use client"` ở đầu file khi component có dùng: `useState`, `useEffect`, thao tác chuột/phím, camera, canvas.
   * Các component chỉ hiển thị dữ liệu tĩnh (Text, Icon, Badge) thì để mặc định (Server Component) để chạy nhanh nhất.
3. **Tính độc lập**: Component trong `components/ui/` không được import logic từ `services/` để đảm bảo có thể mang đi tái sử dụng ở bất kỳ trang nào.

---

## 3. Chi Tiết Cấu Trúc `src/app/` (Routing & Pages)

Next.js App Router sử dụng quy tắc **File-system Routing** (tên thư mục chính là đường dẫn URL):

```text
src/app/
├── (auth)/                     # NHÓM TRANG XÁC THỰC (Route Group - Không hiện lên URL)
│   └── login/
│       └── page.tsx            # URL: /login (Màn hình đăng nhập)
│
├── (dashboard)/                # NHÓM TRANG QUẢN TRỊ (Dùng chung Sidebar & Header)
│   ├── layout.tsx              # Khung bọc chung (Giữ nguyên Sidebar/Header khi chuyển trang)
│   ├── page.tsx                # URL: / (Trang chủ dashboard, KPI tổng quan)
│   │
│   ├── kho/                    # URL: /kho
│   │   ├── page.tsx            # Danh sách tồn kho tổng, kho xe, tấm lẻ alu
│   │   ├── nhap-xuat/
│   │   │   └── page.tsx        # URL: /kho/nhap-xuat (Tạo phiếu xuất/nhập)
│   │   └── [id]/               # DYNAMIC ROUTE (Đường dẫn động theo ID)
│   │       └── page.tsx        # URL: /kho/VT001 (Xem chi tiết 1 mã vật tư)
│   │
│   ├── du-an/                  # URL: /du-an
│   │   ├── page.tsx            # Danh sách các công trình biển quảng cáo
│   │   └── [id]/
│   │       └── page.tsx        # URL: /du-an/DA102 (Chi tiết tiến độ WBS 1 công trình)
│   │
│   ├── hien-truong/            # URL: /hien-truong (Màn hình tối ưu Mobile PWA cho thợ)
│   │   └── page.tsx            # Check-in GPS, chụp ảnh trước/trong/sau, ký số
│   │
│   ├── nhan-su/                # URL: /nhan-su
│   │   └── page.tsx            # Bảng chấm công xưởng & hiện trường
│   │
│   └── ai-assistant/           # URL: /ai-assistant
│       └── page.tsx            # Màn hình nói báo cáo & OCR hóa đơn
│
├── api/                        # BACKEND API ROUTE HANDLERS
│   ├── health/route.ts         # GET /api/health
│   ├── warehouse/route.ts      # POST /api/warehouse (Xử lý phiếu kho)
│   ├── field/route.ts          # POST /api/field (Lưu GPS, ảnh)
│   └── ai/route.ts             # POST /api/ai (Gọi Gemini 3.5 Flash-Lite)
│
├── layout.tsx                  # Root Layout (Bọc <html>, <body>, phông chữ, toàn dự án)
├── loading.tsx                 # Màn hình chờ tự động (Skeleton) khi trang đang tải dữ liệu
└── error.tsx                   # Màn hình bắt lỗi tự động khi trang gặp sự cố (tránh vỡ app)
```

---

## 4. Các Loại File Đặc Biệt Trong `src/app/` Cần Nhớ

| Tên File | Vai trò | Ví dụ thực tế trong dự án |
| :--- | :--- | :--- |
| **`page.tsx`** | Là nội dung chính của 1 đường dẫn URL. | `src/app/(dashboard)/kho/page.tsx` &rarr; trang hiển thị bảng kho khi vào `/kho`. |
| **`layout.tsx`** | Khung bao bọc các trang con. **Không bị load lại** khi chuyển giữa các trang con. | `(dashboard)/layout.tsx` chứa Sidebar. Khi bấm từ `/kho` sang `/du-an`, Sidebar giữ nguyên, chỉ phần ruột thay đổi. |
| **`[id]/page.tsx`** | Định tuyến động (Dynamic Route). | `du-an/[id]/page.tsx` sẽ nhận giá trị `id` từ URL (ví dụ `/du-an/DA-01` thì `id = "DA-01"`). |
| **`loading.tsx`** | Tự động hiển thị hiệu ứng xoay (Spinner) hoặc khung xương (Skeleton) khi `page.tsx` đang đợi lấy dữ liệu từ Supabase. | Người dùng bấm chuyển trang sẽ thấy ngay màn hình chờ, không bị đơ. |
| **`error.tsx`** | Bắt lỗi Runtime của trang đó và hiện nút "Thử lại". | Nếu mất mạng hoặc API lỗi, trang hiện thông báo thân thiện thay vì làm trắng màn hình. |
| **`route.ts`** | Viết API Backend (REST API nhận method `GET`, `POST`, `PUT`, `DELETE`). | `src/app/api/ai/route.ts` nhận file ảnh từ client gửi lên để server gọi Gemini. |

---

## 5. Quy Tắc "Nhạc Trưởng" Của File `page.tsx`

File `page.tsx` tuyệt đối không được viết hàng trăm dòng code HTML rối rắm. Nó chỉ đóng vai trò **Nhạc trưởng (Orchestrator)** phối hợp giữa Service và Component:

```typescript
// VÍ DỤ CHUẨN CỦA 1 FILE page.tsx:
// src/app/(dashboard)/kho/page.tsx

import { warehouseService } from "@/services/warehouse.service";
import { InventoryTable } from "@/components/shared/InventoryTable";
import { StockAlertCard } from "@/components/shared/StockAlertCard";

export default async function KhoPage() {
  // 1. Nhạc trưởng gọi Service lấy dữ liệu
  const items = await warehouseService.getInventoryList();
  const alerts = await warehouseService.getLowStockAlerts();

  // 2. Nhạc trưởng chia dữ liệu cho các Component hiển thị
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quản Trị Kho Vật Tư</h1>
      <StockAlertCard data={alerts} />
      <InventoryTable data={items} />
    </div>
  );
}
```

---

## 6. Quy Trình Chuẩn Khi Làm 1 Tính Năng Mới

```text
[1. Khai báo Types]  ──►  [2. Viết Service]  ──►  [3. Tạo Component]  ──►  [4. Nhạc trưởng page.tsx]
   (src/types/)             (src/services/)         (src/components/)             (src/app/)
```
