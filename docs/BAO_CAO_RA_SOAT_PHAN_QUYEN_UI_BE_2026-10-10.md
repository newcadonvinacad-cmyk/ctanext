# Báo cáo rà soát phân quyền UI và backend Signage ERP

Ngày rà soát: **10/10/2026**. Phạm vi: mã nguồn trong workspace hiện tại, gồm cả thay đổi chưa commit và các chức năng mới đang phát triển.

## 1. Kết luận và hướng xử lý

**Hệ thống đã có danh mục quyền khá đầy đủ, nhưng quyền cấu hình trên UI chưa phản ánh đáng tin cậy quyền được thực thi ở backend.** Có thao tác thiếu kiểm tra quyền; có quyền đọc được dùng để cho phép ghi; có quyền sửa thay quyền duyệt; nhiều API bỏ qua phạm vi dữ liệu; một số quyền xuất hiện trên màn hình nhưng chưa được sử dụng trong luồng thực tế.

Vì vậy, ưu tiên là **sửa cách áp dụng quyền hiện có và đơn giản hóa cấu hình**, sau đó bổ sung đúng những quyền còn thiếu. Không nên tạo thêm bộ CRUD riêng cho mọi bảng, tab, nút hoặc trạng thái.

Các phát hiện cần xử lý trước:

1. API cấu hình ca/ngày lễ/nghỉ phép chưa xác thực phiên tại handler; middleware chỉ kiểm tra sự tồn tại của cookie.
2. API nhân sự/lương và xác nhận chứng từ AI có đường đi chỉ yêu cầu đăng nhập, không kiểm tra quyền nghiệp vụ tương ứng.
3. Tạo thành viên nhận `roleId` nhưng không yêu cầu riêng quyền gán vai trò; tên vai trò và thậm chí email chứa `admin` được dùng làm điều kiện đặc quyền ở một số nơi.
4. Phạm vi `OWN`, `ASSIGNED`, `SELECTED` không được thực thi đồng nhất giữa API danh sách, chi tiết và ghi dữ liệu.
5. Màn hình ma trận làm mất khả năng điều chỉnh một số quyền, thay sai scope và không biểu diễn đủ hạn mức.

**Đề xuất bổ sung 4 quyền:** `document.read`, `document.manage`, `warehouse.manage`, `cash_account.manage`. Các phần khảo sát, thiết kế, QC, bảo hành, nghỉ phép và tăng ca trước mắt dùng quyền nghiệp vụ hiện có theo quy tắc cụ thể ở mục 6. Chỉ tách thêm khi doanh nghiệp thực sự cần phân công độc lập.

## 2. Cách rà soát và giới hạn chứng cứ

Đã kiểm kê toàn bộ file API, danh mục quyền trong migration, các điểm dùng quyền trong UI/backend; đọc các nhánh kiểm tra quyền và service tương ứng của IAM, CRM, mua hàng, kho, dự án, sản xuất, nhân sự, tài chính, tài liệu và AI.

Các con số dưới đây là **từ mã nguồn**, không phải số lượng cấu hình đang chạy trong database:

| Hạng mục | Kết quả |
|---|---:|
| Quyền trong seed gốc | 170 |
| Quyền bổ sung bởi migration sản xuất 019 | 2: `production_order.report`, `production_order.qc` |
| Tổng quyền khai báo qua các migration nói trên | **172** |
| Nhóm tài nguyên quyền | **34** |
| File API `route.ts` | **159** |
| Handler khai báo `export async function GET/POST/PUT/PATCH/DELETE` | **253** |
| Tình huống lọt kiểm tra được tái hiện riêng biệt | **11** |

253 không gồm handler đăng nhập được xuất bằng cơ chế của Better Auth. API không chứa tên quyền trực tiếp vẫn có thể kiểm tra trong helper/service, điển hình là các API sản xuất; không dùng số lượng chuỗi quyền để kết luận một API an toàn.

Đã chạy tái hiện bằng chính mã handler/service được nạp vào môi trường cô lập, giả lập phiên và lớp dữ liệu. **Kết quả chứng minh điều kiện kiểm tra hiện tại cho phép gọi lớp dữ liệu trong các tình huống đó; chưa phải thử khai thác trên hệ thống thật.** Không kết nối database thật, không gọi dịch vụ AI, không tạo/sửa/xóa dữ liệu nghiệp vụ. Việc thực thi SQL còn phụ thuộc role database, migration và dữ liệu đang triển khai.

[Kết quả 11 tình huống tái hiện][s-probes-result]. Công cụ kiểm chứng đi kèm có thể chạy lại cục bộ; không cần thông tin kết nối database.

## 3. Kiến trúc phân quyền hiện tại

### 3.1. Các lớp đang có

- **Danh mục:** `iam.permissions`, gồm khóa quyền, resource/action, scope hỗ trợ, cờ nhạy cảm, cờ hỗ trợ hạn mức và trạng thái hoạt động.
- **Vai trò:** `iam.roles`; tài khoản được gán vai trò qua `iam.user_roles`, có thời gian hiệu lực.
- **Cấp quyền:** `iam.role_grants`; scope và hạn mức gắn với từng quyền. Có bảng liên kết dự án/kho/phòng ban cho `SELECTED`.
- **Quyền hiệu lực:** `AuthorizationService.getUserCapabilities()` hợp nhất grant từ các vai trò thành một capability cho mỗi khóa quyền, lưu đệm 45 giây.
- **UI:** `useAuthorization().can()`, `canAccessScreen()`, sidebar và `AppShell`; trang cài đặt có 3 chế độ: ma trận, nhóm thẻ và bảng chi tiết.
- **Backend:** nhiều route tự kiểm tra `capabilities[key].isEnabled`; một nhóm kho dùng `inventoryActor()`; sản xuất dùng `workflowHttp()`, `workflowContext()`, `assertProject()` và `assertWarehouse()`.
- **Database:** trigger kiểm tra scope/hạn mức/binding; RLS chủ yếu cô lập doanh nghiệp. RLS hiện tại không tự kiểm tra quyền vai trò, quyền trường hoặc phạm vi bản ghi. [Giới hạn thiết kế database][s-db-readme].

### 3.2. Những phần đã làm đúng và nên giữ

- Người không có membership không được tự nhận vai trò mẫu; membership bị khóa/thu hồi trả quyền rỗng.
- Lỗi database mặc định từ chối; fallback demo chỉ mở khi development và bật cờ riêng.
- Vai trò phải hoạt động, gán vai trò phải trong thời gian hiệu lực trong truy vấn quyền chính.
- Duyệt PO có kiểm tra quyền, hạn mức, trạng thái và chống tự duyệt ở service.
- Duyệt phiếu kho và duyệt/ghi sổ thanh toán đã có một số kiểm tra hạn mức, khóa chứng từ và trạng thái.
- API lương cũ `/api/hr/salaries` có lọc `OWN`; API dự án danh sách/chi tiết có lọc `ASSIGNED` và `OWN`.
- Sản xuất mới kiểm tra membership, quyền hành động và dự án/kho cụ thể; đây là cơ sở tốt để thống nhất các phân hệ khác.
- API vật tư/phiếu kho đã có cơ chế loại bỏ giá vốn trong một số response.
- Database có ràng buộc scope hợp lệ, binding `SELECTED`, audit thay đổi quyền và dữ liệu projection mẫu.

Các điểm tốt trên chưa bao phủ toàn bộ đường đi. Đặc biệt, phiếu kho liên kết sản xuất/bán hàng có kiểm tra bổ sung qua hook, nhưng phiếu thông thường không tự có các kiểm tra đó.

## 4. Danh mục quyền và mức độ cần thiết

**Toàn bộ 172 khóa quyền, scope, hạn mức và vị trí tham chiếu backend được liệt kê ở Phụ lục A.** Dưới đây là đánh giá nghiệp vụ để quyết định quyền nào nên xuất hiện ở cây cấu hình chính.

| Nhóm | Quyền cốt lõi nên thiết lập | Nhận xét về hiện trạng và cách làm gọn |
|---|---|---|
| Khách hàng | `customer.read/create/update` | Cần lọc khách thuộc phạm vi. `archive/export` chỉ hiện nếu có luồng thực tế. |
| Nhà cung cấp | `supplier.read/create/update/archive` | Dùng `archive` cho ngừng sử dụng; hiện API lại kiểm tra `supplier.delete`. Không tạo thêm quyền xóa chỉ để khớp lỗi tên. |
| Báo giá | `quotation.read/create/update/approve/cost_read` | Duyệt và giá vốn cần tách. Gửi duyệt có thể nằm trong gói soạn báo giá trên UI, vẫn áp đúng khóa nếu giữ workflow `submit`. |
| Đơn bán | `sales_order.read/create/approve/cancel` | Sửa/gửi duyệt chỉ hiện theo luồng đã làm. Kho cần projection giao hàng, tránh trả toàn bộ giá bán. |
| Mua hàng | `purchase_order.read/create/approve` | Giữ hạn mức duyệt. `update/submit/cancel` chỉ cho cấu hình khi thao tác tương ứng thực sự được triển khai. |
| Vật tư | `item.read/create/update/cost_read` | `archive/import/export` là nâng cao. Danh mục đơn vị/loại/quy cách dùng chung quyền vật tư, không chia thêm mỗi loại. |
| Tồn kho | `inventory.read/count/adjust` | `count/adjust` có sẵn nhưng API kiểm kê/nhập số dư chưa dùng đúng. Không thêm `inventory.create/update`. |
| Phiếu kho | `stock_document.read/create/approve/post/reverse/cost_read` | Phân biệt lập, duyệt, ghi sổ, đảo. Không để `approve` thay `post`. Gộp thao tác tạo/sửa/gửi nháp trên UI nếu cần nhưng không gộp điều kiện backend tùy tiện. |
| Công việc | `task.read/create/update/assign/complete` | Hoàn thành công việc của mình khác sửa định mức, tiền khoán và phân công người khác. Không cần quyền riêng cho checklist/ảnh/ghi chú. |
| Nhật ký công việc | `work_report.read/create` | Gói tạo có thể gồm sửa/gửi báo cáo của mình. `approve` chỉ hiện khi có màn hình và luồng duyệt thực tế. |
| Dự án | `project.read/create/update/assign/close` | Giữ phân công và đóng dự án tách khỏi sửa thông tin. Các tab phải kiểm tra phạm vi dự án cha. |
| Hợp đồng | `contract.read/create/approve` | Sửa có thể thuộc gói soạn hợp đồng. Duyệt giữ riêng nếu làm workflow. Không thêm quyền riêng cho từng phụ lục hoặc tệp. |
| Sản xuất/BOM | `production_order.read/create/update/release/report/qc` | Đã có nhiều kiểm tra tốt. `complete` đang không được gọi ở luồng kết thúc sản xuất; quyết định dùng đúng hoặc ẩn/deprecate thay vì để quyền giả. |
| Mẫu dự án | `project_template.read` và gói quản lý `create/update/archive` | Không dùng `project.update/create` làm đường thay thế quyền quản lý mẫu. `publish` chỉ khi phân biệt nháp/ban hành. |
| Mẫu báo cáo | Chưa đưa vào cây chính | Có 5 quyền catalog nhưng chưa thấy đường kiểm tra tương ứng; hiện mẫu báo cáo mặc định được service tự tạo. |
| Nghiệm thu | `acceptance.read/create/approve` | Sửa/gửi nháp có thể thành gói soạn. Ký/xác nhận phải gắn đúng dự án và trạng thái. |
| Điều xe | `trip.read/create/update/dispatch` | Hoàn thành chuyến của tài xế áp dụng cho chuyến được giao. Không dùng `project.create` thay `trip.create`. |
| GPS hiện trường | `field_event.create`; hiệu chỉnh là nâng cao | Chấm công bản thân là quyền tác nghiệp, không đòi quyền quản trị HR. `correct` dùng cho sửa sự kiện nếu có luồng. |
| Thu/chi | `payment.read/create/approve/post/reverse/export` | Các hành động tài chính cần tách. Soạn/sửa/gửi phiếu là một gói UI nhưng backend vẫn kiểm tra trạng thái và quyền chuẩn. |
| Công nợ | `receivable.read`, `payable.read` | Có thể gói thành “Xem công nợ” nhưng không tự cấp quyền thu chi toàn doanh nghiệp. `adjust/export` nâng cao khi có luồng. |
| Đề nghị thanh toán | Chưa đưa vào cây chính | Có 7 quyền catalog nhưng chưa thấy API nghiệp vụ tương ứng. Không đồng nhất mặc nhiên với đơn nghỉ phép hoặc phiếu chi. |
| Tài chính dự án | `project_finance.read` | Chỉ chi phí/lợi nhuận của dự án trong phạm vi. Không dùng làm quyền tạo/sửa quỹ hay đọc sổ quỹ toàn công ty. |
| Hồ sơ nhân viên | `employee.read/create/update` | Thông tin cá nhân bảo mật dùng `private_read/private_update` khi có dữ liệu/luồng đó. Lương dùng quyền lương riêng. |
| Chấm công | `attendance.read/update/approve/close` | Chấm công bản thân không cần thêm quyền CRUD. Duyệt tăng ca/nghỉ phép tái sử dụng `approve`; cấu hình ca/điểm chấm công dùng `update` cấp cho HR. |
| Chính sách lương | `salary.read/update` | Lương/policy không được đi theo `employee.read` hay chỉ theo đăng nhập. |
| Bảng lương | `payroll.read/generate/update/approve` | Chi trả giữ `pay` khi thực sự triển khai. Không dùng `update` thay `approve`; không lấy `pay` làm điều kiện hiển thị nút duyệt. |
| AI | `ai_run.ask`; OCR tách khi cần kiểm soát chi phí | Mọi hành động AI phải dùng quyền của nghiệp vụ đích. Không cần quyền AI tạo phiếu riêng. `retry/speech` chỉ xuất hiện nếu phân công thực sự khác. |
| Vai trò | `role.read/manage/publish` | Quản lý toàn bộ IAM là quyền rất nhạy cảm. Giữ cấp/ban hành riêng nếu có chế độ duyệt thay đổi quyền. Không cần bộ `role.create/update/assign` song song. |
| Thành viên | `membership.read/invite/suspend/assign_role` | Giữ gán vai trò tách khỏi mời/tạo tài khoản. Hạn chế khả năng gán vai trò cao hơn thẩm quyền người thao tác. |
| Chính sách duyệt | Nâng cao, chưa đưa cây chính | 3 quyền catalog chưa thấy API đầy đủ. Trước mắt dùng hạn mức trên quyền duyệt đã có. |
| Cấu hình doanh nghiệp | `company_setting.read/update` | Chỉ thông tin và cấu hình chung. Không để quyền này trở thành chìa khóa mở quản trị kho, quỹ, HR và thêm quyền tùy ý. |
| Khóa kỳ kế toán | Nâng cao khi có UI/API | Service có kiểm tra kỳ khóa nhưng chưa thấy API khóa/mở dùng bộ quyền `period_lock`. |
| Audit | Nâng cao khi có UI/API | Audit có bảng/trigger, chưa thấy API dùng `audit.read/export`. Không hiện checkbox như một chức năng đã dùng được. |

“Gói UI” là chọn nhiều khóa quyền hiện hữu bằng một nhãn dễ hiểu; không làm thay đổi ngầm quyền backend. Nếu quyết định bỏ một khóa thật sự dư, phải chuyển grant và cập nhật tất cả điểm gọi trước khi ngừng dùng.

## 5. Các sai lệch cần sửa

Mức độ: **P0** xử lý ngay vì có đường vượt xác thực/phân quyền nhạy cảm; **P1** sửa trước khi coi phân quyền đã hoàn chỉnh; **P2** cải thiện độ nhất quán và trải nghiệm. Đây là mức ưu tiên sửa, không phải đánh giá mức khai thác đã chứng minh trên production.

### F01 — P0: Một số API HR không xác thực phiên

`/api/hrm/shifts` và `/api/hrm/holidays` có GET/POST/DELETE; `/api/hrm/leave-policy` có GET/POST; `/api/hrm/leave-balances` có GET. GET `/api/hrm/locations` cũng chưa xác thực, dù POST/DELETE đã kiểm tra phiên. Các handler nói trên gọi trực tiếp service, không xác thực phiên hoặc kiểm tra capability. Các hàm service này cũng không nhận actor/capabilities để kiểm tra.

Middleware chỉ kiểm tra cookie token **có tồn tại**, không kiểm chứng phiên hợp lệ. Cookie giả hoặc phiên hết hạn vẫn vượt được lớp đó. Vì vậy không thể dựa vào middleware để bảo vệ các route này. [Middleware][s-middleware], [API ngày lễ][s-holidays], [service HRM][s-hrm-config]. Đã tái hiện POST ngày lễ gọi service không cần API phiên.

**Sửa:** xác thực thật và membership active ở đầu mỗi API; dùng `attendance.update` cho cấu hình ca/ngày lễ/điểm chấm công, `salary.update` cho chính sách nghỉ phép có tác động tính lương. GET số dư phép giới hạn nhân viên bản thân hoặc phạm vi HR.

### F02 — P0: Đọc/sửa lương và duyệt đơn chỉ cần đăng nhập

Các đường đáng chú ý:

| API | Vấn đề | Quyền/phạm vi nên dùng |
|---|---|---|
| `GET /api/hrm/employees` | Trả danh sách nhân viên kèm chính sách/lương cơ bản, không kiểm tra quyền đọc | `employee.read` cho hồ sơ; `salary.read` cho trường lương, lọc nhân viên theo scope |
| `GET/POST /api/hrm/policy` | Đọc/sửa policy theo `employeeId` gửi lên | `salary.read/update`, kiểm tra người đích |
| `GET/POST /api/hrm/templates` | Xem/lưu mẫu chính sách theo phiên | `salary.read/update` |
| `GET/POST /api/hrm/payroll/calculate` | Trả tính toán lương cả kỳ theo phiên | GET `payroll.read`, POST `payroll.generate` nếu tạo/tổng hợp; lọc `OWN` |
| `GET /api/hrm/payroll/periods` | Dữ liệu tổng hợp kỳ chưa kiểm tra quyền nghiệp vụ | `payroll.read`, không trả tổng lương công ty cho scope `OWN` |
| `GET /api/hrm/attendance`, `/today` | Bảng công/roster theo phiên, thiếu lọc quyền nhân sự | `attendance.read`, phạm vi nhân viên |
| `GET /api/hrm/requests` | Có thể đọc danh sách đơn theo bộ lọc client | Bản thân mặc định; HR cần `attendance.read` và scope |
| `POST /api/hrm/requests/:id/review` | Duyệt/từ chối đơn nghỉ/tăng ca theo phiên | `attendance.approve`, phạm vi người đích; chặn tự duyệt |
| `POST/DELETE /api/hrm/locations` | Cấu hình vị trí chấm công theo phiên | `attendance.update` |

[API policy][s-policy], [API tính lương][s-payroll-calc], [API duyệt đơn][s-hr-request-review], [truy vấn nhân viên kèm lương][s-hrm-employees]. Đã tái hiện sửa policy, đọc tính lương và duyệt đơn với người dùng không có quyền.

### F03 — P0: Xác nhận hành động AI bỏ qua quyền nghiệp vụ

`POST /api/ai/actions/confirm` xác thực phiên rồi gọi `executeActionWithAiRemediation()` → `confirmActionProposal()`. Hàm này gọi trực tiếp tạo báo cáo, phiếu kho, nghiệm thu hoặc phiếu chi; không nạp/kiểm tra capability của hành động đích.

Trường hợp phiếu chi đặc biệt nguy hiểm: payload được chuyển vào `FinanceService.createPayment()`; service mặc định `posted` nếu không có allocations và không truyền status. Client cũng có thể gửi payload `status: posted`. Kiểm tra `payment.post` tại API thanh toán thông thường không bảo vệ đường AI này. [API xác nhận AI][s-ai-confirm-route], [service xác nhận][s-ai-confirm-service], [trạng thái mặc định phiếu thu chi][s-payment-default]. Đã tái hiện service AI chuyển phiếu posted sang lớp dữ liệu mà không đọc quyền.

**Sửa:** dịch vụ nghiệp vụ đích nhận actor/context và kiểm tra quyền ngay trước khi ghi; AI dùng chung dịch vụ đó. `ai_run.ask` không thay `payment.create/post`, `stock_document.create`, `acceptance.create` hay `work_report.create`. Kiểm tra dự án/kho/người đích và quyền sở hữu `aiRunId`/chat liên quan. Payload xác nhận phải được kiểm chứng lại ở server.

### F04 — P0: Mời/tạo thành viên có thể gán vai trò mà không có quyền gán

`POST /api/iam/users` cho phép `membership.invite/create` hoặc `role.manage`, sau đó nhận `body.roleId` và chuyển thẳng vào `IamService.createUser()`. Service có nhánh gán vai trò này. Không yêu cầu thêm `membership.assign_role`, không kiểm tra vai trò mục tiêu nằm trong tập người gọi được phép cấp. [API tạo thành viên][s-iam-user-create], [service tạo thành viên][s-iam-user-service].

`POST /api/iam/users/:id/roles` cũng nhận role tùy ý; `assignUserRole()` không đối chiếu quyền của người cấp với quyền vai trò đích. Người có quyền gán thành viên có thể cấp quyền quản trị nếu biết/chọn được vai trò đó.

**Sửa:** tạo tài khoản và gán vai trò là hai bước quyền riêng. Quyền mời không tự đi kèm quyền cấp vai trò; vai trò quản trị chỉ được người có thẩm quyền quản trị cấp. Ngăn tự nâng quyền qua tài khoản/vai trò do mình quản lý. Không tạo thêm một loạt permission “gán vai trò X”; dùng chính sách tập vai trò được cấp.

### F05 — P0: Đặc quyền suy ra từ email hoặc tên vai trò

API cập nhật/xóa task xem email chứa `admin` là quản trị. Nhiều API IAM/HR xem các mã `ADMIN`, `DIRECTOR`, `CEO` như super admin; trong khi bộ nạp capability chủ yếu đặc cách `SUPER_ADMIN/ADMIN`. `createRole()` nhận mã tùy ý, không bảo vệ đầy đủ các mã dành riêng.

Hậu quả: cùng tài khoản có thể được API này coi là toàn quyền, API khác từ chối; cấp một role tên “CEO” có thể mở đường quản trị dù ma trận không cấp quyền đó. [API task][s-task-api], [API IAM][s-iam-role-grants], [tạo role][s-iam-role-create-service].

**Sửa:** bỏ điều kiện email/tên hiển thị và các danh sách đặc cách rải rác. Chỉ có danh tính quản trị hệ thống được xác định tại một điểm; mọi hành động còn lại dùng capability. “Giám đốc” nên là một role cấu hình được, không mặc nhiên là người sửa IAM.

### F06 — P1: Phạm vi dự án chỉ được áp dụng một phần

`ProjectService.listProjects/getProjectById()` chỉ xử lý nhánh `ASSIGNED/OWN`. `SELECTED` có membership nhưng không rơi vào nhánh lọc nào, nên truy vấn giữ phạm vi cả doanh nghiệp. Các scope khác cũng chưa có quy tắc rõ. [Lọc danh sách dự án][s-project-scope].

`PATCH /api/projects/:id` kiểm tra có `project.update/close` rồi gọi service sửa theo ID, không đối chiếu scope quyền ghi với dự án đích. Các API members, finance, materials, reports, acceptances, contracts, documents và thao tác task cũng chưa áp dụng nhất quán kiểm tra dự án cha trước khi đọc/ghi.

Ví dụ người chỉ được quản lý dự án A vẫn có thể đi vào nhánh sửa ID dự án B nếu có `project.update` bật. Scope của quyền đọc không thay kiểm tra scope của quyền ghi.

**Sửa:** kiểm tra đối tượng với đúng khóa quyền cho mỗi hành động, rồi mới đọc/ghi. Với URL có `:projectId/:childId`, kiểm tra child thực sự thuộc project đó; hiện một số route chỉ dùng child ID. Dùng chung helper thay vì sao chép nhánh lọc.

### F07 — P1: CRM và mua hàng chưa lọc theo scope

Các API khách hàng/báo giá/PO chủ yếu kiểm tra `isEnabled`, rồi gọi service lọc theo organization. Service CRM/mua hàng không nhận context scope tương ứng cho nhiều hàm list/detail/update. `customer.OWN`, `quotation.OWN`, `purchase_order.ASSIGNED/SELECTED` vì thế chưa có hiệu lực đúng như cấu hình. [API khách hàng][s-customer-detail], [service CRM][s-crm-customer], [duyệt PO][s-po-approve-service].

Duyệt PO đã có quyền/hạn mức/chống tự duyệt nhưng chưa kiểm tra phạm vi PO cụ thể. Cần kiểm tra cả chủ sở hữu hoặc dự án PO trước khi duyệt. Không nên hiển thị scope này như đã được hỗ trợ hoàn chỉnh cho đến khi service thực thi.

### F08 — P1: Quyền và phạm vi phiếu kho thường khác phiếu liên kết

- GET list/detail phiếu thường chưa bắt buộc lọc kho từ grant; hook lọc mới chỉ áp với phiếu có `workflow_kind`.
- Tạo/duyệt/hoàn tất phiếu thường chưa kiểm tra đủ kho đích/nguồn theo quyền hành động.
- API gửi duyệt dùng `stock_document.create OR approve`, không dùng `submit`.
- API hoàn tất dùng `post OR complete OR approve`. `complete` không có trong catalog migration; `approve` không được thay quyền ghi sổ.
- Hạn mức `post/reverse` cần áp dụng tại service cho mọi phiếu, không chỉ các hook của workflow mới.

[API phiếu kho][s-stock-api], [API hoàn tất][s-stock-complete], [hook chỉ áp phiếu liên kết][s-stock-hooks]. Tái hiện route hoàn tất chấp nhận người chỉ có `approve`; service của phiếu liên kết có thể chặn bổ sung, còn phiếu thường không có sự bảo vệ đó.

**Sửa:** tái sử dụng `assertWarehouse()`/predicate theo đúng hành động cho cả phiếu thường và liên kết; chuyển kho phải kiểm tra cả hai kho. Một người được xem kho A chưa chắc được duyệt hoặc xuất kho A.

### F09 — P1: Kiểm kê và nhập tồn dùng quyền sai, tác động trực tiếp tồn kho

API tạo/chốt kiểm kê dùng `stock_document.create/approve` hoặc `inventory.update`; nhập tồn dùng `inventory.create/update` hoặc `stock_document.create`. Catalog đã có **`inventory.count` và `inventory.adjust`**, nhưng các quyền này chưa được áp đúng.

`importStocksFromExcel()` cập nhật trực tiếp `stock_balances.on_hand_qty/inventory_value`; đây là quyền điều chỉnh tồn, không chỉ tạo một phiếu nháp. [API nhập tồn][s-stock-import], [cập nhật số dư][s-stock-import-service], [API chốt kiểm kê][s-count-complete].

**Sửa:** `inventory.count` cho lập/nhập kết quả kiểm kê; `inventory.adjust` cho chốt chênh lệch và nhập số dư có tác động tồn. Kiểm tra kho cụ thể và hạn mức nếu chính sách yêu cầu. Không thêm quyền `inventory.create/update` để hợp thức hóa nhánh hiện tại.

### F10 — P1: Quyền tài chính dự án mở rộng thành toàn bộ sổ quỹ và quyền ghi

`project_finance.read` cho phép đọc danh sách thanh toán/movements/overview của công ty, trong khi API gọi service không nhận scope dự án. Quyền này còn cho phép tạo/sửa/xóa sổ quỹ ở API accounts. Đọc thông tin tài chính dự án không nên cho thay đổi tài khoản quỹ. [API accounts][s-cash-account-api], [API sửa/xóa quỹ][s-cash-account-detail], [API thanh toán][s-payment-api]. Đã tái hiện chỉ `project_finance.read ASSIGNED` vẫn đi vào hàm tạo quỹ.

`GET /api/finance/accounts` dùng cả `supplier.read/purchase_order.read` nhưng trả DTO tài khoản quỹ, có thông tin số dư. **GET overview còn dùng các quyền đọc nhà cung cấp/PO đó để trả đồng thời accounts, movements, payments, công nợ phải thu và phải trả toàn công ty.** Đây là lộ dữ liệu tài chính qua quyền đọc mua hàng, không chỉ là vấn đề phạm vi tài chính dự án. [API tổng quan tài chính][s-finance-overview]. Nếu chỉ cần chọn quỹ trong form, phải trả danh mục tối thiểu riêng.

**Sửa:** dữ liệu sổ quỹ cần `payment.read` hoặc capability tài chính được định nghĩa rõ; tài chính dự án luôn giới hạn dự án. Bổ sung `cash_account.manage` cho thiết lập quỹ, đặc biệt thao tác số dư đầu kỳ. Picker không trả số dư/lịch sử.

### F11 — P1: Tạo thanh toán có đường đi ghi sổ trực tiếp bỏ qua hạn mức

`POST /api/finance/payments` mặc định status posted khi người gọi có `payment.post`, rồi gọi `createPayment()` không truyền/kiểm tra hạn mức `payment.post`. Có thể gửi `approved` khi chỉ có quyền tạo; handler chỉ chặn posted nếu không có `post`. Cách tạo này cũng bỏ qua bước duyệt riêng của `postPayment()` vốn yêu cầu trạng thái approved và kiểm tra hạn mức.

**Sửa:** tạo luôn bắt đầu draft/submitted theo quy tắc rõ; server không tin status từ client. Duyệt và post đi qua các hàm hành động dùng chung, kiểm tra capability/hạn mức/trạng thái trên bản ghi khóa. Nếu muốn cho kế toán tạo rồi post nhanh, đó vẫn là chuỗi thao tác được kiểm tra đầy đủ, không là bỏ qua phê duyệt ngầm.

### F12 — P1: Báo giá dùng quyền sửa để duyệt, nhiều trạng thái không kiểm tra quyền

PUT báo giá cho approved nếu có `quotation.approve OR quotation.update`. Các status khác đi thẳng vào cập nhật mà không yêu cầu `submit/update` tương ứng. Tái hiện `status: submitted` với capability rỗng đã gọi service. Nhánh cập nhật nội dung dùng `update OR create`, cho quyền tạo thay quyền sửa.

Convert thành đơn bán dùng `sales_order.create OR quotation.update`; convert thành dự án dùng `project.create OR quotation.update` nhưng service còn tạo đơn bán và công nợ. [API báo giá][s-quotation-api], [convert dự án][s-quotation-convert].

**Sửa:** duyệt chỉ `quotation.approve` với hạn mức server; status transition có allowlist và quyền cụ thể. Chuyển đổi đòi quyền tạo đối tượng đích và quyền truy cập báo giá nguồn. Không cần tạo thêm permission `quotation.convert` nếu bộ quyền đích đã đủ mô tả nghiệp vụ.

### F13 — P1: Duyệt lương và công việc đang lẫn quyền sửa, hoàn thành, phân công

- `/api/hrm/payroll/approve` và POST `/api/hr/salaries` dùng `payroll.approve OR payroll.update`. Đã tái hiện chỉ quyền update vẫn duyệt được.
- UI bảng lương dùng `payroll.pay`, `payroll.create` hoặc tên role để cho phép duyệt; `payroll.create` không có catalog, và điều kiện này không khớp backend.
- API thẩm định attendance dùng `employee.update OR payroll.approve`, bỏ qua `attendance.approve` có sẵn.
- API task cho assignee sửa cả `pieceRateAmount`, `materialsQuota`, trọng số, tiêu đề và định mức; đây là phạm vi lớn hơn báo cáo tiến độ của mình.
- `project.update` được dùng thay `task.assign/project.assign` và `project.close`, khiến tắt quyền phân công/đóng không thực sự chặn được hành động.

[Duyệt lương][s-payroll-approve], [UI duyệt lương][s-payroll-ui], [thẩm định công][s-attendance-review], [API task][s-task-api], [PATCH dự án][s-project-api].

**Sửa:** xác định gói nghiệp vụ rõ trên cây; backend kiểm tra từng nhóm trường. `task.complete` cho tiến độ/ảnh/báo cáo của task được giao; `task.update` cho định nghĩa việc; `task.assign` cho phân công. Duyệt lương chỉ `payroll.approve`, duyệt công/nghỉ/tăng ca chỉ `attendance.approve`.

### F14 — P1: Quyền bảo vệ giá vốn, lương và projection chưa đồng nhất

- Báo giá trả `estimatedCost`, margin và components `unitCost/totalCost` mà không kiểm tra `quotation.cost_read`.
- API nhân viên mới trả `baseSalary/policy` theo phiên; `employee.read` không thay `salary.read`.
- Báo cáo BOM nội bộ dùng `item.update`, `production_order.create`, `cost.read`, `financial.view` để cấp xem giá vốn, thay vì `item.cost_read` hoặc quyền tài chính dự án đúng phạm vi. Hai khóa sau không thuộc catalog hiện tại.
- SQL có `role_read_projections` cho thủ kho chỉ xem thông tin giao hàng của đơn bán, nhưng chưa thấy code đọc/áp dụng các bảng projection đó trong response đơn bán.
- AI dùng một số service inventory mặc định `canViewCost: true` và truy vấn tổng giá trị tồn, không qua bộ loại trường của API kho.

[Giá vốn báo giá][s-quotation-cost], [giá vốn BOM][s-bom-cost], [projection seed][s-projections], [AI đọc kho][s-ai-stock].

**Sửa:** loại trường nhạy cảm ở server, trước khi trả response hoặc đưa vào AI. Không chỉ ẩn cột UI. Lương cơ bản không phải hồ sơ nhân viên thông thường; giá vốn không phải quyền sửa vật tư. Nếu không có nhu cầu tách thêm, tái sử dụng `item.cost_read`, `quotation.cost_read`, `project_finance.read` theo đối tượng.

### F15 — P1: AI đọc dữ liệu bỏ qua scope dù có kiểm tra tên quyền

Gatekeeper AI kiểm tra khóa quyền, nhưng `queryEntityData/searchProjects` gọi `ProjectService.listProjects()` không truyền actor/scope; SQL task/employee chỉ lọc organization; tổng quan kho dùng service mặc định. Người có `project.read ASSIGNED` hoặc `employee.read OWN` có thể nhận dữ liệu ngoài phạm vi qua AI.

`queryEntityData` còn chọn quyền theo tên entity khá rộng: attendance đi theo `employee.read`; cash_accounts/open_items đi theo `project_finance.read`. [Gatekeeper AI][s-ai-gate], [truy vấn AI không truyền scope][s-ai-query].

**Sửa:** AI phải gọi cùng lớp truy vấn đã lọc quyền/phạm vi/trường của API thường. “SELECT an toàn” về cú pháp không đồng nghĩa người gọi được phép đọc mọi bảng/trường. Giới hạn SQL tổng quát vào tập dữ liệu được cấp; không tạo permission AI đọc toàn ERP để giải quyết lỗi này.

### F16 — P1: Kho tài liệu nội bộ chưa có quyền riêng và chưa kế thừa quyền nguồn

API documents/folders/proxy chỉ kiểm tra phiên, rồi lấy dữ liệu theo organization; người đăng nhập có thể xem kho tài liệu chung hoặc xóa tài liệu theo ID. Kho này tổng hợp cả ảnh/chữ ký, thiết kế và hóa đơn PO. Quyền xem folder không đủ thay quyền xem tài liệu nguồn. [API tài liệu][s-documents], [xóa tài liệu][s-document-delete], [service tổng hợp][s-document-service]. Đã tái hiện handler xóa gọi service khi capabilities rỗng.

Upload nhận `projectId/folder` từ client mà chưa kiểm tra quyền đối tượng. Storage trả public URL; quyền ở UI/API không tự bảo vệ việc tải trực tiếp nếu bucket triển khai là public. Chưa kiểm tra cấu hình bucket thực tế. Proxy nhận URL tùy ý và trả `Cache-Control: public`; với tài liệu nhạy cảm cần tải theo ID đã kiểm tra quyền và cache phù hợp.

**Sửa:** thêm `document.read/manage` cho tài liệu nội bộ độc lập; tài liệu có nguồn dự án/PO/HR kế thừa scope và quyền nguồn. Quản lý folder/tải lên/sửa/xóa có thể cùng một quyền manage để dễ cấp. Người chỉ có quyền tài liệu chung không tự được xem bảng lương/hóa đơn nguồn.

### F17 — P1: Khảo sát, thiết kế, QC và bảo hành thiếu quyền nghiệp vụ

Nhiều API surveys, design-proofs, project design-proofs, QC cũ, service-tickets, chữ ký khảo sát/nghiệm thu và BI chỉ xác thực phiên, không kiểm tra quyền và đối tượng. Đường convert survey → quotation tạo báo giá mà không yêu cầu `quotation.create`. Đường QC cũ có thể tạo record qua service Phase2, tách khỏi workflow sản xuất mới có `production_order.qc`.

[Convert khảo sát][s-survey-convert], [QC cũ][s-legacy-qc], [thiết kế chi tiết][s-design-detail], [analytics][s-analytics].

**Sửa gọn:** khảo sát theo khách/dự án có `customer.update` hoặc `project.update`; convert cần `quotation.create`. Thiết kế theo dự án dùng `project.read/update`; QC dùng `production_order.read/qc` và workflow chung; bảo hành dùng `project.read/update` hoặc task được giao. Ký/xác nhận áp dụng quyền nghiệm thu hoặc sửa đối tượng cùng kiểm tra trạng thái. Không tạo quyền riêng cho từng mẫu biển, ảnh hoặc bước QC.

### F18 — P1: Ma trận UI che mất quyền gửi duyệt/từ chối

Trong mỗi dòng resource, `approveG = grants.find(action in approve/submit/reject)`, nhưng `specialGs` loại **tất cả** ba action này. Khi resource có approve và submit, chỉ một checkbox còn hiển thị; submit còn lại không nằm ở cột đặc thù. Với resource chỉ có submit, cột “Duyệt” thực chất bật quyền gửi duyệt, dễ hiểu sai là phê duyệt. [Chọn quyền trong ma trận][s-matrix].

**Sửa:** cột Duyệt chỉ cho `approve`; gửi duyệt nằm trong gói soạn hoặc một action riêng. Từ chối/trả về thường cùng quyền approve, không cần thêm permission riêng. Mọi permission phải có đúng một vị trí cấu hình, không biến mất vì cách trình bày.

### F19 — P1: Ma trận đổi scope hàng loạt trái catalog, không thể hiện scope khác nhau

Scope lấy từ grant bật đầu tiên, rồi thay cho tất cả quyền trong resource. Dropdown cố định ORG/DEPARTMENT/ASSIGNED/OWN, không dựa `supportedScopes`, thiếu TEAM/SELECTED. Ví dụ `project.read` không hỗ trợ OWN/DEPARTMENT nhưng UI vẫn cho chọn; database trigger sẽ từ chối lưu. Một role có “xem toàn công ty, sửa phần được giao” bị hiển thị thành một scope chung.

Chế độ grouped/table có dropdown theo supportedScopes là tốt hơn, nhưng chưa xử lý các vấn đề capability backend. [Đổi scope ma trận][s-matrix-scope], [trigger kiểm tra][s-grant-trigger].

**Sửa:** scope gắn theo quyền/gói hành động; nếu nhiều giá trị thì hiện “Khác nhau” và cho mở chi tiết. Bulk chỉ cho scope nằm trong giao của các quyền được đổi. Giữ tối đa OWN/ASSIGNED/ORG trong giao diện chính; scope nâng cao chỉ khi có backend và bộ chọn đối tượng tương ứng.

### F20 — P1: Ô hạn mức chỉ sửa grant đầu tiên hỗ trợ hạn mức

Ma trận dùng `grants.find(g => g.supportsAmountLimit)` để chọn một grant cho ô “Hạn mức duyệt”. Phiếu kho có approve/post/reverse; thu chi có approve/post/reverse. Ô chung không cho người dùng biết đang sửa hạn mức nào, và không sửa các hạn mức còn lại.

**Sửa:** hạn mức cạnh từng hành động nhạy cảm, hoặc gói “Duyệt tối đa …” với giải thích rõ. Không tự áp cùng một hạn mức cho ghi sổ/đảo phiếu nếu người dùng chưa chọn. Null là không giới hạn; 0 là không được xử lý chứng từ có giá trị dương.

### F21 — P1: Danh sách grant bị trùng sau đổi scope

`updateRoleGrants()` tắt grant cũ khác scope và upsert scope mới. `getRoleGrants()` lại LEFT JOIN tất cả grant của permission/role, không chọn grant enabled và không hợp nhất lịch sử scope. Sau một lần đổi ORG → ASSIGNED, có thể trả cả ORG tắt và ASSIGNED bật cho cùng `permissionId`.

UI dùng `.find()` và cập nhật theo `permissionId`, khiến chọn nhầm grant, lặp key hoặc ghi lại nhiều bản cùng permission; lưu lại có thể làm kết quả phụ thuộc thứ tự trả về. [Đọc grant][s-iam-grants-read], [lưu grant][s-iam-grants-write].

**Sửa:** API trả một trạng thái canonical cho từng permission trong chế độ đơn giản. Nếu cần nhiều grant thật, tách `grantId` và biểu diễn đầy đủ; không trộn grant lịch sử bị tắt vào một checkbox. Bắt duplicate permission trong payload lưu của chế độ đơn giản.

### F22 — P1: SELECTED có bảng nhưng UI/API chưa cấu hình được binding

SQL đòi dự án/kho/phòng ban được chỉ định trước khi bật SELECTED. Trang cài đặt chỉ lưu permissionId/scope/amount/currency/isEnabled; chưa có bộ chọn và payload binding tương ứng. Chế độ grouped cho chọn SELECTED nhưng bật mới có thể bị trigger từ chối. Dữ liệu SELECTED seed của quản lý dự án được để tắt có chủ đích, không phải quyền đang hoạt động.

**Sửa:** ưu tiên ASSIGNED qua phân công dự án/kho; ẩn SELECTED khỏi cấu hình phổ thông đến khi có bộ chọn binding, kiểm tra và lưu trong cùng transaction. Không xử lý lỗi bằng tự đổi scope thành ORG.

### F23 — P1: Thuật toán scope tổng quát và hợp nhất chưa đúng mô hình

Type có ORG/OWN/ASSIGNED/TEAM/DEPARTMENT/SELECTED; bảng priority của `authorize()` chỉ có ORG/BRANCH/ASSIGNED/OWN. TEAM/DEPARTMENT/SELECTED rơi về 0. Đã tái hiện OWN được coi là đủ cho SELECTED. Scope là **điều kiện chọn bản ghi**, không phải một thang cấp bậc bao hàm tuyệt đối.

Hợp nhất nhiều role thành một scope cho mỗi permission còn làm mất các tổ hợp hợp lệ: ORG hạn mức nhỏ + ASSIGNED hạn mức lớn phải giữ hai grant, thay vì chỉ lấy ORG và làm mất quyền duyệt lớn trên dự án được giao. Bản sửa hiện tại đã tránh thổi hạn mức scope hẹp vào scope rộng; nên giữ điều đó nhưng chuyển sang đánh giá từng grant trên đối tượng.

`assertProject()` của sản xuất cũng xử lý TEAM/DEPARTMENT như ASSIGNED, chưa phản ánh tổ đội/phòng ban thật. [Bộ nạp capability][s-capabilities], [authorize][s-authorize], [context sản xuất][s-production-context].

**Sửa:** cho phép khi ít nhất một grant hợp lệ đáp ứng đồng thời permission + đối tượng trong scope + hạn mức. Không so sánh scope bằng số. UI chỉ cần một scope đơn giản ở mặc định, nhưng backend không được làm mất ngữ nghĩa nhiều role.

### F24 — P1: Membership theo organization và quyền inactive chưa được kiểm tra đủ

Truy vấn membership đầu tiên trong `getUserCapabilities()` chỉ `WHERE user_id LIMIT 1`, dù hàm nhận organizationId. Người nhiều membership có thể bị lấy sai membership/status/employee. Truy vấn grant của role thường không lọc `p.is_active=true`, nên quyền đã ngừng hoạt động có thể vẫn được nạp; super admin thì lại lọc active.

**Sửa:** chọn đúng membership theo organization, active và đối tượng nhân viên cùng organization; lọc permission active khi nạp mọi vai trò. Đây là lỗi tiềm ẩn cả tính đúng đắn và phân quyền khi mở rộng nhiều doanh nghiệp, không chỉ UI.

### F25 — P2: Thu hồi/cập nhật quyền chưa đồng bộ với cache và UI

Nhiều hàm IAM cũ tăng policy_version nhưng không gọi invalidate capability cache; bộ nạp capability không đọc policy_version để phát hiện thay đổi. Lưu ma trận trực tiếp cũng không invalidate; chỉ luồng apply role-change-request có invalidate. Cache kho là một cache riêng, cần thu hồi đồng bộ.

UI lưu capability trong sessionStorage, nạp lại khi mount hoặc event phiên; lưu ma trận chỉ fetchRoles, không refetch quyền của người dùng hiện tại. Có khoảng trễ backend tối đa TTL và UI có thể hiển thị trạng thái cũ lâu hơn nếu không refresh. Vai trò tự hết hạn giữa TTL cũng tương tự. [Cache capability][s-capabilities], [lưu UI][s-matrix-save], [hook authorization][s-hook].

**Sửa:** invalidation sau commit mọi thay đổi role/grant/status/binding; phiên có policyVersion, refetch khi thay đổi hoặc khi nhận 403. Backend vẫn là nơi quyết định. Không quảng bá “cập nhật tức thì” chỉ vì đã tăng một số version mà chưa sử dụng nó.

### F26 — P1: Có quy trình duyệt thay đổi quyền nhưng vẫn lưu trực tiếp để đi vòng

API role-change-requests đã có draft/submit/review/apply và chặn tự duyệt. Tuy nhiên UI chính vẫn PUT trực tiếp grants, cho `role.manage/update` và mã role đặc cách sửa ngay. Bởi vậy role.publish không tạo ra ranh giới ban hành nếu đường trực tiếp vẫn dành cho người soạn.

`expected_policy_version` được lưu/đọc nhưng apply chưa đối chiếu version hiện tại. `reviewNote` nhận vào nhưng service review chưa lưu; các transaction IAM cũng chưa đặt `app.actor_user_id` mà trigger audit dùng, nên nhiều sự kiện có thể ghi actor_kind system dù cập nhật có người dùng.

**Sửa gọn:** chọn rõ hai chế độ: quản trị được phép sửa trực tiếp, hoặc người soạn phải qua ban hành. Không bắt mọi thay đổi nhỏ có hai người nếu doanh nghiệp không cần; nhưng khi bật duyệt, bỏ đường ghi trực tiếp của người soạn. Kiểm tra version trước apply và ghi actor/review note đầy đủ.

### F27 — P2: Danh mục quyền cho thêm tùy ý nhưng không tự tạo hiệu lực backend

Nút thêm quyền nhập key/resource/action rồi INSERT catalog. Backend không tự hiểu khóa mới, nên “thêm thành công” có thể chỉ thêm checkbox vô tác dụng. API còn cho `company_setting.update` thêm quyền. Đây là nguồn phình danh mục và cảm giác cấu hình đã bảo vệ một chức năng dù chưa có điểm thực thi. [Thêm permission][s-permission-create].

Có 13 khóa dùng trong backend thuộc resource đã biết nhưng không có trong 172 khóa migration: 5 alias IAM và 8 khóa sai/chưa đăng ký. UI còn tham chiếu `payroll.create`. Danh sách chi tiết ở Phụ lục B. Không nên giải quyết bằng tự thêm tất cả các khóa này vào DB.

**Sửa:** catalog do code/migration quản lý; admin cấp quyền có sẵn, không tạo khóa mới tùy ý. Mỗi quyền phải có mô tả nghiệp vụ, scope/hạn mức thực sự được áp, trạng thái chức năng và điểm kiểm tra backend.

### F28 — P1/P2: Quyền xuất, phụ thuộc và điều hướng chưa nhất quán

- `project.export` có catalog nhưng export-schedule kiểm tra `project.read` rồi xuất dữ liệu mà không truyền scope; có thể xuất ngoài phạm vi danh sách dự án đã lọc.
- `payment.export` đã được API mới dùng nhưng chưa kèm kiểm tra `payment.read`, trong khi SQL có bảng dependency export → read mà chưa thấy runtime nạp/kiểm tra.
- Export nhiều phân hệ nằm phía client hoặc chưa có luồng; cần phân biệt “chưa dùng quyền” với “chưa có tính năng”.
- AppShell chưa map `/san-xuat`, `/dinh-muc-bom`, `/phan-tich`, `/khao-sat`, `/bao-hanh`. Đường `/du-an/templates` bị map như chi tiết M12, vì kiểm tra mẫu lại dùng `/du-an/mau`.
- `/nhan-su/danh-gia-luong` bị map M17 nhân sự thay vì M18 lương. HRM layout chỉ lọc menu và dùng tên ACCOUNTANT để mở; chưa là chặn truy cập route con.
- BottomNav không lọc quyền; mục Cá nhân dẫn vào Cài đặt quản trị. Hook khi không có provider trả `can()=true` và `canAccessScreen()=true`.
- M20 chỉ cần một trong role/membership/company read là mở toàn trang; trang cài đặt chủ yếu lấy currentUser, chưa dùng can để chặn riêng từng tab/nút. Màn hình nhìn thấy thao tác rồi API từ chối gây hiểu nhầm.

[Export tiến độ][s-project-export], [export tài chính][s-payment-export], [map màn hình][s-appshell], [HRM menu][s-hrm-layout], [hook fallback][s-hook].

**Sửa:** một registry route/module dùng chung cho sidebar, layout và shortcut; chặn tab/nút theo hành động, refetch quyền đúng lúc. Không thêm một permission riêng cho mỗi route. Export vẫn tuân thủ phạm vi và loại trường của quyền đọc; thêm export vào gói đọc nếu doanh nghiệp không cần phân biệt tải hàng loạt.

## 6. Ma trận quyền nên áp dụng theo chức năng

Các điều kiện dưới đây là phương án đích đề xuất, không phải mô tả backend đã hoàn thành.

| Chức năng | Quyền quyết định | Điều kiện bổ sung bắt buộc |
|---|---|---|
| Xem/tạo/sửa khách hàng | `customer.read/create/update` | Khách trong scope; ownership do server xác định |
| Khảo sát theo khách/dự án | `customer.read/update` hoặc `project.read/update` theo đối tượng cha | Phải có ít nhất một đối tượng cha hợp lệ; không lấy OR giữa hai quyền mà bỏ kiểm tra cha |
| Khảo sát → báo giá | `quotation.create` và được đọc khảo sát nguồn | Không cần khóa convert riêng |
| Xem/sửa thiết kế dự án | `project.read/update` | Dự án trong scope; proof thuộc dự án |
| Lập/sửa/gửi báo giá | Gói `quotation.create/update/submit` | Chỉ nháp hợp lệ, phạm vi nguồn/khách |
| Duyệt báo giá | `quotation.approve` | Hạn mức theo tổng server tính, trạng thái hợp lệ, quy tắc tự duyệt |
| Xem giá vốn báo giá | `quotation.cost_read` | Trong scope báo giá; chỉ có read không nhận cost/margin |
| Báo giá → đơn bán/dự án | `sales_order.create`; thêm `project.create` khi tạo dự án | Truy cập nguồn, kiểm tra tác động tạo công nợ; không dùng quotation.update thay quyền đích |
| Soạn/duyệt PO | `purchase_order.create/update/submit`; `approve` riêng | Scope PO/dự án; hạn mức; chống tự duyệt |
| Xem tồn | `inventory.read` | Chỉ kho được cấp; không trả giá vốn nếu thiếu cost_read |
| Lập phiếu kho | `stock_document.create/update/submit` theo hành động | Kho nguồn/đích trong scope; dữ liệu tham chiếu cùng doanh nghiệp |
| Duyệt/ghi sổ/đảo kho | `stock_document.approve/post/reverse` riêng | Scope của từng quyền; hạn mức; trạng thái; khóa kỳ/chứng từ |
| Kiểm kê/chốt điều chỉnh | `inventory.count/adjust` | Kho trong scope, ghi nhật ký thay đổi tồn |
| Quản trị kho và thủ kho | **`warehouse.manage`** mới | Cấu hình kho/phân công khác quyền xuất/duyệt phiếu |
| Tạo nhanh vật tư trong phiếu | `item.create` qua gói cấp cho thủ kho | Không cấp bằng stock_document.create ngầm; không thêm quick_create permission |
| Quản lý dự án/phân công/đóng | `project.update/assign/close` riêng | Scope hành động và dự án cụ thể |
| Định nghĩa việc / giao việc / báo tiến độ | `task.update/assign/complete` riêng | Task thuộc project, assignee còn hiệu lực; các trường định mức/tiền khoán chỉ update |
| Báo cáo nhật ký | `work_report.create/update/submit`; đọc `read` | Task/dự án được giao; bản thân/nhóm đúng scope |
| Hợp đồng/nghiệm thu | Gói soạn của `contract/acceptance`; `approve` riêng | Scope dự án, bản ghi con, trạng thái và hạn mức nếu duyệt có giá trị |
| BOM/lệnh sản xuất | `production_order.read/create/update/release` | Project scope, nguồn BOM/design hợp lệ; không cần bộ BOM CRUD riêng trước mắt |
| Báo cáo sản xuất/QC | `production_order.report/qc` | Hạng mục/tổ được giao, workflow chung; `complete` phải có quyết định dùng hoặc bỏ |
| Bảo hành | `project.read/update`, task.complete cho người xử lý | Ticket trong dự án phạm vi, chi phí chỉ tài chính được xem/sửa |
| Điều xe/tài xế | `trip.create/update/dispatch`; complete chuyến được giao | Xe/tài xế/dự án phù hợp; không dùng project.create thay trip.create |
| Xem/lập/duyệt/post/đảo thu chi | `payment.read/create/approve/post/reverse` | Không status tùy ý, hạn mức từng hành động, khóa kỳ, chống tự duyệt theo chính sách |
| Tạo/sửa/đóng quỹ và số dư đầu | **`cash_account.manage`** mới | Có audit; khoản số dư đầu không được vượt kiểm soát tài chính |
| Công nợ/tài chính dự án | `receivable.read`, `payable.read`, `project_finance.read` | Project finance chỉ dự án trong scope; picker không trả số dư |
| Hồ sơ nhân viên | `employee.read/create/update` | Scope nhân viên; lương và private profile tách khỏi DTO thường |
| Xem/sửa lương cơ bản, policy/mẫu | `salary.read/update` | OWN chỉ bản thân khi đọc; update cấp cho HR/kế toán phù hợp |
| Chấm công/gửi đơn của bản thân | Membership active + liên kết nhân viên; dùng quyền tác nghiệp đã có nếu cần bật/tắt | Không được gửi employeeId người khác; không thêm một bộ quyền cho mỗi loại đơn |
| Bảng công/duyệt công-nghỉ-tăng ca/khóa kỳ công | `attendance.read/approve/close` | Scope nhân viên, chặn tự duyệt |
| Cấu hình ca/lễ/địa điểm | `attendance.update` | Chỉ người quản lý HR; nếu sau này cần tách quản trị cấu hình mới cân nhắc quyền riêng |
| Tính/sửa/duyệt lương | `payroll.read/generate/update/approve` | OWN chỉ phiếu lương bản thân; nháp/approved/locked rõ; pay chỉ khi thực sự chi trả |
| Tài liệu nội bộ độc lập | **`document.read/manage`** mới | OWN/ORG hoặc phân công thực sự hỗ trợ; quản lý thư mục và tệp cùng manage |
| Tài liệu đính kèm nghiệp vụ | Quyền nguồn dự án/PO/HR + hành động tải lên/sửa nguồn | Quyền document không mở tài liệu nhạy cảm nguồn; kiểm tra đường tải tệp |
| Mời/khóa/gán vai trò thành viên | `membership.invite/suspend/assign_role` riêng | Gán vai trò mục tiêu trong thẩm quyền; không suy đặc quyền từ email/tên |
| Cấu hình/ban hành role | `role.manage/publish` theo chế độ | Role quản trị được bảo vệ; version chống ghi đè; actor audit |
| AI hỏi/đọc/ghi | `ai_run.ask` + quyền nghiệp vụ đích | Cùng scope/trường/hạn mức của API thường; kiểm tra lại khi xác nhận |

### 6.1. Vì sao chỉ bổ sung 4 quyền

| Quyền mới | Lý do cần tách | Những việc không cần tách thêm |
|---|---|---|
| `document.read` | Kho tài liệu nội bộ có dữ liệu độc lập, không thể suy hoàn toàn từ quyền project/payment | Không tách xem ảnh, xem PDF, tải ZIP, xem folder thành nhiều quyền |
| `document.manage` | Xem tài liệu khác khả năng tạo/sửa/xóa tài liệu và thư mục chung | Một quyền quản lý; OWN cho tài liệu mình nếu có policy rõ, ORG cho người quản lý |
| `warehouse.manage` | Quản trị kho/gán thủ kho đang bám vào company_setting.update quá rộng | Không chia location/category/warehouse-member thành các quyền quản trị nhỏ |
| `cash_account.manage` | Tạo/sửa/quản lý quỹ có thể tác động số dư, khác lập một phiếu thu chi | Không chia tài khoản tiền mặt/ngân hàng/số dư đầu thành 3 permission nếu cùng người phụ trách |

Đây là đề xuất chức năng, **chưa thêm vào source/database**. Khi triển khai phải thêm resource vào type/catalog, điểm kiểm tra và bộ UI tương ứng cùng lúc. Nếu doanh nghiệp chỉ có một người quản lý kho/quỹ thì vẫn dùng role mẫu để cấp một lần, không cần người dùng tự hiểu từng khóa.

Quyền cân nhắc về sau: `survey.manage` hoặc `design.manage` chỉ khi kỹ thuật cần sửa khảo sát/thiết kế nhưng không được sửa toàn bộ khách/dự án; chưa đưa vào giai đoạn đầu. Nếu bắt đầu dùng phân công kỹ thuật độc lập ngay, phải tách ranh giới đó trước khi cấp `project.update` rộng.

## 7. Cây quyền UI nên tổ chức lại

Cây chính nên theo **nghiệp vụ → đối tượng → hành động có ý nghĩa**, không theo bảng dữ liệu hoặc tên API. Đề xuất 7 nhánh:

```text
Kinh doanh
  Khách hàng · Nhà cung cấp
  Báo giá: Xem / Soạn / Duyệt / Xem giá vốn
  Đơn bán và mua hàng: Xem / Soạn / Duyệt
Kho và vật tư
  Vật tư: Xem / Quản lý / Xem giá vốn
  Tồn kho: Xem / Kiểm kê / Chốt điều chỉnh
  Phiếu kho: Xem / Soạn / Duyệt / Ghi sổ / Đảo
  Quản trị kho
Dự án và công việc
  Dự án: Xem / Quản lý / Phân công / Đóng
  Việc làm: Xem / Quản lý / Phân công / Báo tiến độ
  Nhật ký · Hợp đồng · Nghiệm thu
  Thiết kế, khảo sát, bảo hành: đi theo đối tượng nghiệp vụ
Sản xuất và vận chuyển
  BOM/lệnh: Xem / Soạn / Phát hành
  Báo cáo sản xuất / QC
  Điều xe / Chuyến được giao
Tài chính
  Thu chi: Xem / Soạn / Duyệt / Ghi sổ / Đảo
  Công nợ · Tài chính dự án · Quản trị quỹ
Nhân sự
  Hồ sơ · Chấm công · Chính sách lương · Bảng lương
  Cá nhân: công, đơn từ, phiếu lương của mình
Tài liệu, AI và hệ thống
  Tài liệu nội bộ: Xem / Quản lý
  AI: Sử dụng; thao tác dữ liệu đi theo quyền nghiệp vụ
  Thành viên · Vai trò · Cấu hình doanh nghiệp
```

Các yêu cầu UI cụ thể:

1. **Chế độ cơ bản mặc định:** “Xem”, “Soạn/Quản lý”, “Duyệt” và các hành động nhạy cảm như ghi sổ/đảo, giá vốn, lương. Chỉ hiển thị những chức năng đã hoạt động.
2. **Gói quyền có ánh xạ rõ:** Soạn phiếu là create/update/submit nếu vẫn giữ ba khóa. Mở chi tiết thấy các khóa đó; không tự thêm approve/post.
3. **Checkbox cha có ba trạng thái:** tắt, bật một phần, bật hết. Bật một nhánh rộng phải cho thấy số quyền nhạy cảm ảnh hưởng; ưu tiên nút “Cấp quyền tác nghiệp” thay nút bật toàn bộ không phân biệt.
4. **Scope theo hành động:** có thể “Xem toàn công ty; sửa được phân công”. Hiện “Khác nhau” khi không đồng nhất, không lấy grant đầu tiên làm đại diện.
5. **Hạn mức cạnh Duyệt/Ghi sổ/Đảo:** 0/null hiển thị rõ. Không chỉ một ô hạn mức cho cả resource.
6. **Mặc định phạm vi hẹp:** hồ sơ/lương bản thân dùng OWN; dự án/kho dùng ASSIGNED. ORG cần chọn rõ. Chưa hỗ trợ TEAM/DEPARTMENT/SELECTED thì không cho chọn như chức năng đã hoàn thiện.
7. **Giải thích tại chỗ:** “Xem giá vốn cho phép nhận giá vốn trong API và AI”; “Quản trị quỹ cho phép quản lý tài khoản và số dư đầu”. Ẩn khóa kỹ thuật, chỉ hiện khi mở chi tiết.
8. **Xem thay đổi trước lưu:** thêm/bớt quyền, mở rộng/thu hẹp scope, đổi hạn mức, vai trò/người bị ảnh hưởng. Không thêm một hộp xác nhận cho từng checkbox.
9. **Xem quyền hiệu lực:** phân biệt nguồn role, scope thực tế, hạn mức của từng grant; với SUPER_ADMIN hiển thị “Toàn quyền hệ thống”, không giả vờ tắt một checkbox là thu hồi được quyền đặc cách.
10. **Bỏ nút tự tạo permission khỏi UI quản trị thông thường**; quyền chưa triển khai/deprecate ở mục nâng cao hoặc ẩn khỏi cấp mới.

### 7.1. Vai trò mẫu tối thiểu

| Vai trò | Nên có | Mặc định không cấp |
|---|---|---|
| Quản trị hệ thống | IAM/cấu hình và khả năng quản trị bảo vệ rõ ràng | Không đồng nhất tự động với mọi chức danh giám đốc; các quy tắc nghiệp vụ vẫn phải rõ |
| Kế toán | Thu chi/công nợ; giá vốn; lương theo nhiệm vụ; duyệt đúng hạn mức | Không mặc nhiên quản lý IAM, cấu hình công ty hoặc toàn bộ nhân sự riêng tư |
| Thủ kho | Vật tư, tồn/kho được giao; soạn/post phiếu theo nhiệm vụ | Không mặc nhiên điều chỉnh tồn, duyệt phiếu của mình, xem mọi giá vốn |
| Quản lý dự án | Dự án/công việc/nghiệm thu/thiết kế được giao | Không mặc nhiên sửa quỹ, xem lương công ty hoặc quản lý vai trò |
| Thợ/tài xế | Việc/chuyến được giao, báo cáo, điểm danh, hồ sơ/phiếu lương bản thân | Không sửa định mức/tiền khoán, phân công người khác, duyệt công hoặc post tiền |

Không cần tạo sẵn thêm 10 role. Có thể thêm vai trò “Kinh doanh” hoặc “Nhân sự” khi thật sự có người phụ trách độc lập; dùng gói mẫu để cấu hình, không sao chép tên ACCOUNTANT như đặc cách toàn hệ thống.

## 8. Cách thống nhất backend

Một yêu cầu nghiệp vụ chỉ được phép khi đồng thời đáp ứng:

```text
Phiên hợp lệ
→ membership đúng doanh nghiệp và còn hoạt động
→ có grant của quyền hành động còn hiệu lực
→ đối tượng đích nằm trong scope của grant đó
→ trường dữ liệu được phép đọc/sửa
→ số tiền trong hạn mức và đúng tiền tệ
→ trạng thái/quy tắc nghiệp vụ hợp lệ
→ ghi dữ liệu và audit trong transaction
```

Đề xuất triển khai bằng lớp context/check chung, phát triển từ context sản xuất hiện có:

- Query danh sách phải có predicate scope ở database; chi tiết và mutation kiểm tra đối tượng đích. Không chỉ lọc danh sách ở UI hoặc sau khi trả dữ liệu.
- Grant được đánh giá cùng scope/hạn mức của chính grant đó. Được xem không tự được sửa; có quyền approve không tự có post.
- Service ghi dữ liệu phải nhận context, tránh route kiểm tra đúng nhưng đường AI/import/service khác bỏ qua.
- Response dùng projection theo quyền trường. Picker nhân viên/khách/quỹ cần DTO tối thiểu riêng, không bắt người dùng đọc cả bảng lương hoặc số dư.
- Status transition và nhóm trường được kiểm tra trước khi có mutation; tránh request nhiều hành động ghi phần đầu rồi phần sau mới bị từ chối.
- `SELECTED` bindings, cập nhật grants và version cùng transaction. Audit đặt actor thật, không chỉ created_by ở từng dòng.
- Cache bị thu hồi sau commit; revalidation phía server là điều kiện thật, UI chỉ hỗ trợ trải nghiệm.
- Từ chối trả 401/403 phù hợp; không dùng 400/500 cho mọi lỗi quyền rồi chỉ ghi “lỗi thao tác”.

## 9. Thứ tự thực hiện và tiêu chí nghiệm thu

### Đợt 1 — Khóa các đường lọt quyền

Sửa F01–F05, F02/F03 trước: xác thực/membership thống nhất, HR lương/đơn, AI confirm, mời thành viên/gán role và loại đặc cách email/tên. Ngăn status posted/approved không được cấp. **Không cần thêm permission mới trong đợt này.**

Nghiệm thu: các tình huống mô phỏng hiện chấp nhận phải trả 401/403 trước khi gọi lớp ghi; cookie có giá trị bất kỳ không thay phiên hợp lệ; người mời không tự gán role quản trị.

### Đợt 2 — Làm đúng phạm vi và quyền nhạy cảm

Thống nhất list/detail/mutation/export/AI cho dự án, CRM, kho, tài chính, HR. Áp inventory.count/adjust, quota duyệt/post, projection giá vốn/lương và parent-child. Đưa QC cũ về cùng workflow. Thêm 4 quyền đã đề xuất cùng điểm áp dụng.

Nghiệm thu: A được giao dự án/kho/nhân viên nào chỉ đọc/ghi được phạm vi đó; API list, direct-ID, export, AI cho cùng tập dữ liệu. Không có cost/salary trong response thiếu quyền. Duyệt được không đồng nghĩa post/đảo được.

### Đợt 3 — Sửa màn hình cấu hình và catalog

Khắc phục F18–F28: canonical grant, scope từng action, hạn mức đúng vị trí, gói cơ bản, nâng cao/ẩn quyền chưa dùng, registry điều hướng, cache/policyVersion, chế độ duyệt thay đổi IAM nếu cần.

Nghiệm thu: mỗi permission hiện đúng một lần; đổi scope rồi mở lại/lưu lại không đảo kết quả; không chọn scope DB không hỗ trợ; các tab/nút phản ánh quyền backend. Không sửa source bằng cách seed mọi chuỗi quyền lỗi thành permission mới.

### Bộ tình huống kiểm tra bắt buộc khi triển khai sửa

| Tình huống | Kết quả mong đợi |
|---|---|
| Không phiên, cookie giả, phiên hết hạn, membership bị khóa | 401/403 trước truy vấn dữ liệu nhạy cảm hoặc mutation |
| Chỉ có quyền đọc | Không sửa/duyệt/post, kể cả gọi trực tiếp URL hoặc qua AI |
| Quyền update nhưng không approve | Không duyệt báo giá/lương/nghiệm thu |
| Quyền approve nhưng không post | Không post tiền/kho |
| OWN/ASSIGNED/SELECTED và ID ngoài phạm vi | List không chứa; direct-ID/mutation/export/AI đều từ chối |
| URL dự án A với ID chứng từ/task của dự án B | Từ chối |
| Hạn mức 0, dưới/bằng/trên hạn mức; tiền tệ khác | Kết quả nhất quán, dùng giá trị server; không bỏ hạn mức qua create nhanh |
| Hai role: ORG hạn mức nhỏ + ASSIGNED hạn mức lớn | Không mở hạn mức lớn toàn công ty; vẫn dùng được hạn mức lớn đúng dự án |
| Thiếu cost_read/salary/private_read | Response và dữ liệu AI không chứa trường nhạy cảm |
| Mời thành viên kèm roleId cao hơn thẩm quyền | Từ chối gán role; không ngầm cấp admin |
| Đổi scope ORG → ASSIGNED → mở/lưu lại | Một trạng thái ổn định, không grant trùng/khôi phục scope cũ |
| Thu hồi role/quyền trong phiên đang mở | Backend chặn sau cơ chế invalidation; UI cập nhật phù hợp |
| Bật SELECTED chưa binding | Báo lỗi cấu hình rõ, không mở ORG |
| Gửi thay đổi IAM theo chế độ duyệt | Người soạn không bypass qua PUT trực tiếp; version cũ không ghi đè mới |

## 10. Kết quả tái hiện đã chạy

Các tình huống sau **đều được mã hiện tại chấp nhận** trong môi trường cô lập; đây là phát hiện lỗi, không phải 11 kiểm thử chứng minh hệ thống an toàn:

1. Người có phiên nhưng không quyền sửa policy lương gọi được lớp sửa nhân viên khác.
2. Không payroll.read vẫn gọi được tính/đọc bảng lương qua GET.
3. Không quyền duyệt vẫn gọi được lớp duyệt đơn HR.
4. Capability rỗng vẫn đổi báo giá sang submitted.
5. Chỉ payroll.update vẫn gọi được duyệt bảng lương.
6. Chỉ project_finance.read ASSIGNED vẫn gọi được tạo sổ quỹ.
7. Chỉ stock_document.approve vẫn vượt điều kiện route hoàn tất phiếu.
8. Không quyền tài liệu vẫn vượt handler xóa tài liệu chung.
9. Handler ngày lễ gọi được lớp ghi khi không có cơ chế phiên nào trong môi trường nạp.
10. Service xác nhận AI chuyển payload phiếu posted mà không gọi bộ nạp capability.
11. Hàm authorize coi OWN đủ đáp ứng SELECTED.

Service dữ liệu của các handler được giả lập để ngăn mutation thật; AI confirmation và hàm authorize chạy trực tiếp logic source. Không kiểm tra trực tiếp ảnh UI/browser, database đang triển khai, danh sách người dùng và cấu hình storage. Khi sửa cần bổ sung kiểm thử tích hợp có dữ liệu phân công thật, không chỉ assert mock được gọi.

Các kiểm thử sản xuất hiện có thường cấp capabilities qua fixture; fixture có cả khóa không thuộc catalog (`stock_document.complete/cancel`). Vì vậy test workflow chạy qua không bảo đảm quyền lấy từ catalog thật hoặc API biên được kiểm tra đúng. Cần test với membership/role/grant có thật trong database thử nghiệm và gọi cả route thường/AI/legacy.

## Phụ lục A — Toàn bộ 172 quyền khai báo và nơi tham chiếu backend

Nguồn khai báo: [seed 004](<C:/Users/nhatb/Documents/antigravity/noble-fermi/database/migrations/004_seed.sql:3>) và [migration 019](<C:/Users/nhatb/Documents/antigravity/noble-fermi/database/migrations/019_production_workflow.sql:176>). Scope/hạn mức/nhạy cảm dưới đây là cấu hình catalog, không có nghĩa mọi điểm dùng đã thực thi đúng. Cột tham chiếu chỉ ghi nơi có chuỗi khóa quyền trực tiếp trong API/service/lib, bỏ bộ nạp capability và seed fallback. Không tìm thấy chuỗi không chứng minh không có logic động; tìm thấy chuỗi cũng không chứng minh kiểm tra đủ scope.

### customer

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `customer.read` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/customers/route.ts:18>) (+3 file) |
| `customer.create` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/customers/route.ts:44>) |
| `customer.update` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/customers/[id]/route.ts:49>) |
| `customer.archive` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |
| `customer.export` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |

### supplier

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `supplier.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/accounts/route.ts:22>) (+3 file) |
| `supplier.create` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/suppliers/route.ts:44>) (+1 file) |
| `supplier.update` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/suppliers/[id]/route.ts:49>) |
| `supplier.archive` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `supplier.export` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |

### quotation

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `quotation.read` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/route.ts:18>) (+1 file) |
| `quotation.create` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/route.ts:46>) (+1 file) |
| `quotation.update` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/[id]/convert/route.ts:22>) (+2 file) |
| `quotation.submit` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |
| `quotation.approve` | ORG,OWN | Có | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/[id]/route.ts:54>) |
| `quotation.export` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |
| `quotation.cost_read` | ORG,OWN | — | Có | Chưa thấy tham chiếu trực tiếp |

### sales_order

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `sales_order.read` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/orders/route.ts:20>) (+4 file) |
| `sales_order.create` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/orders/route.ts:47>) (+2 file) |
| `sales_order.update` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |
| `sales_order.submit` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |
| `sales_order.approve` | ORG,OWN | Có | Có | [Service](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/production-sales.service.ts:50>) |
| `sales_order.cancel` | ORG,OWN | — | — | [Service](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/production-sales.service.ts:81>) |
| `sales_order.export` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |

### purchase_order

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `purchase_order.read` | ORG,OWN,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/accounts/route.ts:23>) (+6 file) |
| `purchase_order.create` | ORG,OWN,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/ocr/route.ts:18>) (+1 file) |
| `purchase_order.update` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `purchase_order.submit` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `purchase_order.approve` | ORG,OWN,ASSIGNED,SELECTED | Có | Có | [Service](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/procurement.service.ts:801>) |
| `purchase_order.cancel` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `purchase_order.export` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### item

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `item.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/catalog/route.ts:8>) (+8 file) |
| `item.create` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/catalog/route.ts:14>) (+5 file) |
| `item.update` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/catalog/[id]/route.ts:7>) (+10 file) |
| `item.archive` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `item.import` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `item.export` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `item.cost_read` | ORG | — | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/route.ts:24>) (+6 file) |

### inventory

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `inventory.read` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/counts/route.ts:18>) (+9 file) |
| `inventory.export` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `inventory.count` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `inventory.adjust` | ORG,ASSIGNED,SELECTED | Có | — | Chưa thấy tham chiếu trực tiếp |

### stock_document

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `stock_document.read` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/categories/route.ts:9>) (+17 file) |
| `stock_document.create` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/counts/route.ts:44>) (+13 file) |
| `stock_document.update` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `stock_document.submit` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `stock_document.approve` | ORG,ASSIGNED,SELECTED | Có | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/counts/[id]/complete/route.ts:22>) (+7 file) |
| `stock_document.post` | ORG,ASSIGNED,SELECTED | Có | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/complete/route.ts:22>) (+1 file) |
| `stock_document.reverse` | ORG,ASSIGNED,SELECTED | Có | Có | [Service](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/production-stock.service.ts:13>) |
| `stock_document.export` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `stock_document.cost_read` | ORG,ASSIGNED,SELECTED | — | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/route.ts:24>) (+1 file) |

### task

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `task.read` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/my-tasks/route.ts:18>) (+2 file) |
| `task.create` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/tasks/route.ts:59>) |
| `task.update` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/work-reports/route.ts:20>) (+3 file) |
| `task.assign` | ORG,ASSIGNED,TEAM,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/tasks/[id]/route.ts:72>) |
| `task.complete` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/tasks/[id]/route.ts:58>) |

### work_report

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `work_report.read` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/reports/route.ts:22>) (+2 file) |
| `work_report.create` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/work-reports/route.ts:19>) (+2 file) |
| `work_report.update` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `work_report.submit` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `work_report.approve` | ORG,OWN,ASSIGNED,TEAM,SELECTED | Có | Có | Chưa thấy tham chiếu trực tiếp |
| `work_report.export` | ORG,OWN,ASSIGNED,TEAM,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### project

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `project.read` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/fleet/trips/route.ts:18>) (+15 file) |
| `project.create` | ORG,ASSIGNED,SELECTED,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/[id]/convert-project/route.ts:22>) (+4 file) |
| `project.update` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/work-reports/route.ts:21>) (+12 file) |
| `project.assign` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/tasks/[id]/route.ts:73>) (+1 file) |
| `project.close` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/route.ts:61>) |
| `project.export` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### contract

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `contract.read` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/contracts/route.ts:22>) |
| `contract.create` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/contracts/route.ts:46>) |
| `contract.update` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `contract.approve` | ORG,ASSIGNED,SELECTED | Có | Có | Chưa thấy tham chiếu trực tiếp |
| `contract.export` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### production_order

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `production_order.read` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/production-orders/metadata/route.ts:10>) (+2 file) |
| `production_order.create` | ORG,ASSIGNED,SELECTED | — | — | [Service](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/production-bom.service.ts:51>) (+1 file) |
| `production_order.update` | ORG,ASSIGNED,SELECTED | — | — | [Service](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/production-bom.service.ts:106>) (+1 file) |
| `production_order.release` | ORG,ASSIGNED,SELECTED | — | — | [Service](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/production.service.ts:202>) |
| `production_order.complete` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `production_order.report` | ORG,ASSIGNED,SELECTED | — | — | [Helper](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/lib/production/context.ts:62>) (+1 file) |
| `production_order.qc` | ORG,ASSIGNED,SELECTED | — | — | [Helper](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/lib/production/context.ts:62>) (+1 file) |

### project_template

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `project_template.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/templates/route.ts:18>) |
| `project_template.create` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/templates/route.ts:41>) |
| `project_template.update` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/templates/[id]/route.ts:22>) |
| `project_template.publish` | ORG | — | Có | Chưa thấy tham chiếu trực tiếp |
| `project_template.archive` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/templates/[id]/route.ts:58>) |

### report_template

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `report_template.read` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `report_template.create` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `report_template.update` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `report_template.publish` | ORG | — | Có | Chưa thấy tham chiếu trực tiếp |
| `report_template.archive` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |

### acceptance

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `acceptance.read` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/acceptances/route.ts:22>) (+2 file) |
| `acceptance.create` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/acceptances/route.ts:49>) |
| `acceptance.update` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/acceptances/[accId]/route.ts:34>) |
| `acceptance.submit` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `acceptance.approve` | ORG,ASSIGNED,SELECTED | Có | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/acceptances/route.ts:58>) (+1 file) |
| `acceptance.export` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### trip

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `trip.read` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/fleet/trips/route.ts:18>) (+1 file) |
| `trip.create` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/fleet/trips/route.ts:44>) |
| `trip.update` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/fleet/trips/route.ts:72>) |
| `trip.assign` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `trip.dispatch` | ORG,ASSIGNED,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/fleet/trips/route.ts:72>) |
| `trip.complete` | ORG,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### field_event

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `field_event.read` | ORG,OWN,ASSIGNED | — | — | Chưa thấy tham chiếu trực tiếp |
| `field_event.create` | ORG,OWN,ASSIGNED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/checkin/route.ts:18>) (+1 file) |
| `field_event.correct` | ORG,OWN,ASSIGNED | — | — | Chưa thấy tham chiếu trực tiếp |

### payment

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `payment.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/dashboard/stats/route.ts:19>) (+7 file) |
| `payment.create` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/accounts/route.ts:21>) (+3 file) |
| `payment.update` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/accounts/[id]/route.ts:22>) |
| `payment.submit` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/route.ts:47>) (+1 file) |
| `payment.approve` | ORG | Có | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/approve/route.ts:22>) (+2 file) |
| `payment.post` | ORG | Có | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/route.ts:63>) (+1 file) |
| `payment.reverse` | ORG | Có | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/reverse/route.ts:23>) |
| `payment.export` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/export/route.ts:18>) |

### receivable

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `receivable.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/open-items/route.ts:18>) (+2 file) |
| `receivable.export` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `receivable.adjust` | ORG | Có | — | Chưa thấy tham chiếu trực tiếp |

### payable

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `payable.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/open-items/route.ts:18>) (+2 file) |
| `payable.export` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `payable.adjust` | ORG | Có | — | Chưa thấy tham chiếu trực tiếp |

### expense_claim

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `expense_claim.read` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `expense_claim.create` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `expense_claim.update` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `expense_claim.submit` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `expense_claim.approve` | ORG,OWN,ASSIGNED,SELECTED | Có | Có | Chưa thấy tham chiếu trực tiếp |
| `expense_claim.settle` | ORG,OWN,ASSIGNED,SELECTED | Có | — | Chưa thấy tham chiếu trực tiếp |
| `expense_claim.export` | ORG,OWN,ASSIGNED,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### project_finance

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `project_finance.read` | ORG,ASSIGNED,SELECTED | — | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/dashboard/stats/route.ts:20>) (+9 file) |
| `project_finance.export` | ORG,ASSIGNED,SELECTED | — | Có | Chưa thấy tham chiếu trực tiếp |

### employee

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `employee.read` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hr/attendance/route.ts:18>) (+2 file) |
| `employee.create` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/employees/route.ts:44>) |
| `employee.update` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/checkin/route.ts:52>) (+1 file) |
| `employee.archive` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `employee.private_read` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | Có | Chưa thấy tham chiếu trực tiếp |
| `employee.private_update` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | Có | Chưa thấy tham chiếu trực tiếp |
| `employee.export` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### attendance

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `attendance.read` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hr/attendance/route.ts:18>) (+2 file) |
| `attendance.create` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `attendance.update` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/checkin/route.ts:52>) |
| `attendance.approve` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | Có | Có | Chưa thấy tham chiếu trực tiếp |
| `attendance.close` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |
| `attendance.export` | ORG,OWN,TEAM,DEPARTMENT,SELECTED | — | — | Chưa thấy tham chiếu trực tiếp |

### salary

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `salary.read` | ORG,OWN | — | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hr/salaries/route.ts:18>) |
| `salary.update` | ORG | — | Có | Chưa thấy tham chiếu trực tiếp |

### payroll

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `payroll.read` | ORG,OWN | — | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hr/salaries/route.ts:18>) |
| `payroll.generate` | ORG | — | Có | Chưa thấy tham chiếu trực tiếp |
| `payroll.update` | ORG | — | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hr/salaries/route.ts:58>) (+1 file) |
| `payroll.approve` | ORG | Có | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hr/salaries/route.ts:58>) (+3 file) |
| `payroll.pay` | ORG | Có | Có | Chưa thấy tham chiếu trực tiếp |
| `payroll.export` | ORG | — | Có | Chưa thấy tham chiếu trực tiếp |
| `payroll.ai_suggest` | ORG | — | Có | Chưa thấy tham chiếu trực tiếp |

### ai_run

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `ai_run.read` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/assistant/route.ts:18>) |
| `ai_run.ocr` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |
| `ai_run.speech` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |
| `ai_run.ask` | ORG,OWN | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/assistant/route.ts:64>) |
| `ai_run.retry` | ORG,OWN | — | — | Chưa thấy tham chiếu trực tiếp |

### role

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `role.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/role-change-requests/route.ts:16>) (+4 file) |
| `role.manage` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/permissions/route.ts:23>) (+8 file) |
| `role.publish` | ORG | — | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/role-change-requests/[id]/route.ts:29>) |

### membership

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `membership.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/route.ts:24>) (+1 file) |
| `membership.invite` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/route.ts:55>) |
| `membership.suspend` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/[id]/status/route.ts:28>) |
| `membership.assign_role` | ORG | — | Có | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/[id]/roles/route.ts:28>) |

### approval_policy

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `approval_policy.read` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `approval_policy.manage` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `approval_policy.publish` | ORG | — | Có | Chưa thấy tham chiếu trực tiếp |

### company_setting

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `company_setting.read` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/settings/company/route.ts:17>) |
| `company_setting.update` | ORG | — | — | [API](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/permissions/route.ts:25>) (+8 file) |

### period_lock

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `period_lock.read` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `period_lock.close` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `period_lock.reopen` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |

### audit

| Khóa quyền | Scope catalog | Hạn mức | Nhạy cảm | Tham chiếu backend tiêu biểu |
|---|---|---|---|---|
| `audit.read` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |
| `audit.export` | ORG | — | — | Chưa thấy tham chiếu trực tiếp |

Có **80 / 172** khóa chưa thấy tham chiếu trực tiếp ở backend theo cách kiểm kê trên. Chỉ nên gọi là quyền chưa nối vào điểm kiểm tra hiện tại; cần phân biệt tính năng chưa có, quyền dư và tính năng có nhưng dùng sai khóa trước khi deprecate.

## Phụ lục B — Khóa sai lệch với catalog

| Khóa được dùng | Phân loại | Hướng xử lý gọn |
|---|---|---|
| `ai_run.create` | Chưa đăng ký | OCR dùng ai_run.ocr hoặc quyền nghiệp vụ và policy sử dụng AI; không thêm create tùy ý |
| `inventory.create` | Chưa đăng ký | Nhập tồn dùng inventory.adjust |
| `inventory.update` | Chưa đăng ký | Kiểm kê dùng inventory.count/adjust |
| `item.delete` | Chưa đăng ký | Dùng item.archive khi ngừng sử dụng; hard delete danh mục thuộc policy quản lý vật tư |
| `project_finance.update` | Chưa đăng ký | Lập phiếu dùng payment.create; sửa tài chính dự án phải định nghĩa nghiệp vụ rõ |
| `stock_document.cancel` | Chưa đăng ký | Quyết định hủy nháp thuộc gói soạn; phiếu posted dùng reverse. Chuẩn hóa service trước khi thêm khóa |
| `stock_document.complete` | Chưa đăng ký | Ghi sổ dùng stock_document.post |
| `supplier.delete` | Chưa đăng ký | Dùng supplier.archive, ưu tiên ngừng sử dụng |
| `membership.create` | Alias trong bộ nạp quyền | Chọn membership.invite làm khóa canonical |
| `membership.update` | Alias trong bộ nạp quyền | Chọn membership.suspend cho khóa tài khoản; thông tin cá nhân có nghiệp vụ riêng |
| `role.create` | Alias từ role.manage | Chọn role.manage, bỏ bộ CRUD song song nếu không cần phân công độc lập |
| `role.update` | Alias từ role.manage | Không cho đi vòng role.publish khi chế độ duyệt được bật |
| `role.assign` | Alias từ membership.assign_role/role.manage | Chọn membership.assign_role và kiểm tra thẩm quyền vai trò đích |
| `payroll.create` | UI, không có catalog | Tổng hợp dùng payroll.generate, duyệt dùng payroll.approve |
| `cost.read`, `financial.view` | Không có trong catalog hiện tại, dùng ở báo cáo BOM | Tái sử dụng item.cost_read/project_finance.read với scope đúng |

## Phụ lục C — Kiểm kê toàn bộ 159 API

Bảng này là bản đồ nguồn để rà soát và sửa, **không phải bảng chứng nhận an toàn**. Một dòng có nhiều method có thể có điều kiện quyền khác nhau; cột khóa là hợp các chuỗi quyền tìm thấy trong file. Đối với workflowHttp, kiểm tra thực tế nằm ở service/helper, đã đối chiếu ở phần phát hiện. Session đơn thuần có thể phù hợp cho tài nguyên riêng của người dùng (thông báo, chat, điểm danh bản thân); vẫn phải kiểm tra sở hữu/membership, không mặc định thêm quyền CRUD.

| API (liên kết source) | Method | Cơ chế thấy trong route | Khóa quyền tham chiếu trong file |
|---|---|---|---|
| [/api/acceptances/[id]/signature](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/acceptances/[id]/signature/route.ts:1>) | POST | Session/ownership; xem service | — / service |
| [/api/ai/actions/confirm](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/actions/confirm/route.ts:1>) | POST | Session/ownership; xem service | — / service |
| [/api/ai/assistant](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/assistant/route.ts:1>) | GET, DELETE, POST | Session + capability (xem sai lệch mục 5) | `ai_run.read`, `ai_run.ask`, `ai_run.create` |
| [/api/ai/chat/sessions](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/chat/sessions/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/ai/chat/sessions/[id]/messages](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/chat/sessions/[id]/messages/route.ts:1>) | GET, PATCH | Session/ownership; xem service | — / service |
| [/api/ai/chat/sessions/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/chat/sessions/[id]/route.ts:1>) | GET, PATCH, DELETE | Session/ownership; xem service | — / service |
| [/api/ai/report-parser](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/report-parser/route.ts:1>) | POST | Session/ownership; xem service | — / service |
| [/api/analytics/signage](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/analytics/signage/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/auth/me](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/auth/me/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | — / service |
| [/api/auth/[...all]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/auth/[...all]/route.ts:1>) | Handler xuất theo framework | Better Auth / phiên | — / service |
| [/api/bom/calculate](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/bom/calculate/route.ts:1>) | POST | Session/ownership; xem service | — / service |
| [/api/bom/from-design](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/bom/from-design/route.ts:1>) | POST | Workflow context; kiểm tra trong service | — / service |
| [/api/bom](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/bom/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/bom/[id]/production](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/bom/[id]/production/route.ts:1>) | GET, PUT, POST | Workflow context; kiểm tra trong service | — / service |
| [/api/bom/[id]/report](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/bom/[id]/report/route.ts:1>) | GET | Workflow context; kiểm tra trong service | — / service |
| [/api/bom/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/bom/[id]/route.ts:1>) | GET, PATCH, PUT, DELETE | Session/ownership; xem service | — / service |
| [/api/crm/customers](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/customers/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `customer.read`, `customer.create` |
| [/api/crm/customers/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/customers/[id]/route.ts:1>) | GET, PUT | Session + capability (xem sai lệch mục 5) | `customer.read`, `customer.update` |
| [/api/crm/orders](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/orders/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `sales_order.read`, `sales_order.create` |
| [/api/crm/orders/[id]/actions](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/orders/[id]/actions/route.ts:1>) | POST | Workflow context; kiểm tra trong service | — / service |
| [/api/crm/orders/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/orders/[id]/route.ts:1>) | GET | Workflow context; kiểm tra trong service | — / service |
| [/api/crm/quotations](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `quotation.read`, `sales_order.read`, `quotation.create` |
| [/api/crm/quotations/[id]/convert](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/[id]/convert/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `sales_order.create`, `quotation.update` |
| [/api/crm/quotations/[id]/convert-project](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/[id]/convert-project/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `project.create`, `quotation.update` |
| [/api/crm/quotations/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/[id]/route.ts:1>) | GET, PUT | Session + capability (xem sai lệch mục 5) | `quotation.read`, `sales_order.read`, `quotation.approve`, `quotation.update`, `quotation.create` |
| [/api/dashboard/stats](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/dashboard/stats/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `payment.read`, `project_finance.read` |
| [/api/design-proofs](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/design-proofs/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/design-proofs/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/design-proofs/[id]/route.ts:1>) | GET, PUT, DELETE | Session/ownership; xem service | — / service |
| [/api/documents/folders](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/documents/folders/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/documents/folders/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/documents/folders/[id]/route.ts:1>) | PATCH, DELETE | Session/ownership; xem service | — / service |
| [/api/documents/proxy](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/documents/proxy/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/documents](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/documents/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/documents/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/documents/[id]/route.ts:1>) | DELETE | Session/ownership; xem service | — / service |
| [/api/field/checkin](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/checkin/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `field_event.create`, `attendance.update`, `employee.update` |
| [/api/field/my-tasks](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/my-tasks/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `task.read`, `field_event.create` |
| [/api/field/work-reports](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/field/work-reports/route.ts:1>) | POST, GET | Session + capability (xem sai lệch mục 5) | `work_report.create`, `task.update`, `project.update` |
| [/api/finance/accounts](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/accounts/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `payment.read`, `project_finance.read`, `payment.create`, `supplier.read`, `purchase_order.read` |
| [/api/finance/accounts/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/accounts/[id]/route.ts:1>) | PUT, DELETE | Session + capability (xem sai lệch mục 5) | `payment.update`, `project_finance.read` |
| [/api/finance/export](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/export/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `payment.export` |
| [/api/finance/movements](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/movements/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `payment.read`, `project_finance.read` |
| [/api/finance/open-items](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/open-items/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `receivable.read`, `payable.read` |
| [/api/finance/overview](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/overview/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `payment.read`, `project_finance.read`, `payment.create`, `supplier.read`, `purchase_order.read` |
| [/api/finance/payments](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `payment.read`, `project_finance.read`, `payment.create`, `payment.submit`, `project_finance.update`, `payment.post` |
| [/api/finance/payments/[id]/approve](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/approve/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `payment.approve` |
| [/api/finance/payments/[id]/post](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/post/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `payment.post` |
| [/api/finance/payments/[id]/reject](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/reject/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `payment.approve` |
| [/api/finance/payments/[id]/return](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/return/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `payment.approve` |
| [/api/finance/payments/[id]/reverse](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/reverse/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `payment.reverse` |
| [/api/finance/payments/[id]/submit](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/submit/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `payment.submit`, `payment.create`, `project_finance.update` |
| [/api/finance/payments/[id]/voucher](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/[id]/voucher/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `payment.read`, `project_finance.read` |
| [/api/fleet/trips](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/fleet/trips/route.ts:1>) | GET, POST, PATCH | Session + capability (xem sai lệch mục 5) | `trip.read`, `project.read`, `trip.create`, `project.create`, `trip.update`, `trip.dispatch` |
| [/api/fleet/vehicles](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/fleet/vehicles/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `trip.read`, `project.read` |
| [/api/health](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/health/route.ts:1>) | GET | Health công khai | — / service |
| [/api/hr/attendance](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hr/attendance/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `attendance.read`, `employee.read` |
| [/api/hr/salaries](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hr/salaries/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `salary.read`, `payroll.read`, `payroll.approve`, `payroll.update` |
| [/api/hrm/attendance/checkin](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/attendance/checkin/route.ts:1>) | POST | Session/ownership; xem service | — / service |
| [/api/hrm/attendance/entries/[id]/review](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/attendance/entries/[id]/review/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `employee.update`, `payroll.approve` |
| [/api/hrm/attendance](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/attendance/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/hrm/attendance/today](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/attendance/today/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/hrm/attendance/today-status](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/attendance/today-status/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/hrm/employees](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/employees/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `employee.create` |
| [/api/hrm/holidays](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/holidays/route.ts:1>) | GET, POST, DELETE | Chưa thấy kiểm tra phiên trong route | — / service |
| [/api/hrm/leave-balances](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/leave-balances/route.ts:1>) | GET | Chưa thấy kiểm tra phiên trong route | — / service |
| [/api/hrm/leave-policy](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/leave-policy/route.ts:1>) | GET, POST | Chưa thấy kiểm tra phiên trong route | — / service |
| [/api/hrm/locations](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/locations/route.ts:1>) | GET, POST, DELETE | Session/ownership; xem service | — / service |
| [/api/hrm/payroll/approve](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/payroll/approve/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `payroll.approve`, `payroll.update` |
| [/api/hrm/payroll/calculate](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/payroll/calculate/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/hrm/payroll/lock](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/payroll/lock/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `payroll.approve` |
| [/api/hrm/payroll/periods](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/payroll/periods/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/hrm/policy](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/policy/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/hrm/requests](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/requests/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/hrm/requests/[id]/review](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/requests/[id]/review/route.ts:1>) | POST | Session/ownership; xem service | — / service |
| [/api/hrm/shifts](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/shifts/route.ts:1>) | GET, POST, DELETE | Chưa thấy kiểm tra phiên trong route | — / service |
| [/api/hrm/templates](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/templates/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/iam/permissions](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/permissions/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `role.manage`, `role.update`, `company_setting.update` |
| [/api/iam/role-change-requests](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/role-change-requests/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `role.read`, `role.manage`, `role.update` |
| [/api/iam/role-change-requests/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/role-change-requests/[id]/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `role.publish`, `role.manage` |
| [/api/iam/roles](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/roles/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `role.read`, `role.manage`, `role.create` |
| [/api/iam/roles/[id]/grants](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/roles/[id]/grants/route.ts:1>) | GET, PUT | Session + capability (xem sai lệch mục 5) | `role.read`, `role.manage`, `role.update` |
| [/api/iam/users](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `membership.read`, `role.read`, `membership.invite`, `membership.create`, `role.manage` |
| [/api/iam/users/[id]/capabilities](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/[id]/capabilities/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `role.read`, `membership.read`, `role.manage` |
| [/api/iam/users/[id]/roles](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/[id]/roles/route.ts:1>) | POST, DELETE | Session + capability (xem sai lệch mục 5) | `membership.assign_role`, `role.assign`, `role.manage`, `role.update` |
| [/api/iam/users/[id]/status](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/[id]/status/route.ts:1>) | PUT | Session + capability (xem sai lệch mục 5) | `membership.suspend`, `membership.update`, `role.manage` |
| [/api/inventory/catalog](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/catalog/route.ts:1>) | GET, POST | inventoryActor; quyền anyOf | `item.read`, `item.create` |
| [/api/inventory/catalog/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/catalog/[id]/route.ts:1>) | PUT | inventoryActor; quyền anyOf | `item.update` |
| [/api/inventory/categories](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/categories/route.ts:1>) | GET, POST | inventoryActor; quyền anyOf | `item.read`, `item.create`, `item.update`, `stock_document.read`, `company_setting.update` |
| [/api/inventory/categories/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/categories/[id]/route.ts:1>) | PUT, DELETE | inventoryActor; quyền anyOf | `item.update`, `company_setting.update`, `item.delete` |
| [/api/inventory/counts](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/counts/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `inventory.read`, `stock_document.read`, `stock_document.create`, `inventory.update` |
| [/api/inventory/counts/[id]/complete](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/counts/[id]/complete/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `stock_document.approve`, `inventory.update` |
| [/api/inventory/counts/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/counts/[id]/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `inventory.read`, `stock_document.read` |
| [/api/inventory/documents](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `stock_document.read`, `item.cost_read`, `stock_document.cost_read`, `stock_document.approve`, `stock_document.create` |
| [/api/inventory/documents/[id]/approve](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/approve/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `stock_document.approve` |
| [/api/inventory/documents/[id]/complete](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/complete/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `stock_document.post`, `stock_document.complete`, `stock_document.approve` |
| [/api/inventory/documents/[id]/reject](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/reject/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `stock_document.approve`, `stock_document.cancel` |
| [/api/inventory/documents/[id]/return](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/return/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `stock_document.approve`, `stock_document.cancel` |
| [/api/inventory/documents/[id]/reverse](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/reverse/route.ts:1>) | POST | Workflow context; kiểm tra trong service | — / service |
| [/api/inventory/documents/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/route.ts:1>) | GET, DELETE | Session + capability (xem sai lệch mục 5) | `stock_document.read`, `item.cost_read`, `stock_document.cost_read`, `stock_document.cancel`, `stock_document.create` |
| [/api/inventory/documents/[id]/submit](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/submit/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `stock_document.create`, `stock_document.approve` |
| [/api/inventory/import-stocks](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/import-stocks/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `inventory.create`, `inventory.update`, `stock_document.create` |
| [/api/inventory/items/quick-create](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/items/quick-create/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `item.update`, `stock_document.create` |
| [/api/inventory/items](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/items/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `item.read`, `stock_document.read`, `item.cost_read`, `item.create` |
| [/api/inventory/items/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/items/[id]/route.ts:1>) | GET, PUT | Session + capability (xem sai lệch mục 5) | `item.read`, `inventory.read`, `item.cost_read`, `item.update` |
| [/api/inventory/metadata](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/metadata/route.ts:1>) | GET | inventoryActor; quyền anyOf | `item.read`, `item.create`, `item.update`, `stock_document.read` |
| [/api/inventory/metadata/[kind]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/metadata/[kind]/route.ts:1>) | POST | inventoryActor; quyền anyOf | `item.create` |
| [/api/inventory/metadata/[kind]/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/metadata/[kind]/[id]/route.ts:1>) | PUT, DELETE | inventoryActor; quyền anyOf | `item.update` |
| [/api/inventory/remnants](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/remnants/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `inventory.read`, `stock_document.read`, `item.cost_read`, `stock_document.create`, `inventory.update` |
| [/api/inventory/units](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/units/route.ts:1>) | GET, POST | inventoryActor; quyền anyOf | `item.read`, `item.create`, `item.update`, `stock_document.read`, `company_setting.update` |
| [/api/inventory/units/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/units/[id]/route.ts:1>) | PUT, DELETE | inventoryActor; quyền anyOf | `item.update`, `company_setting.update`, `item.delete` |
| [/api/inventory/warehouses](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/warehouses/route.ts:1>) | GET, POST | inventoryActor; quyền anyOf | `inventory.read`, `stock_document.read`, `company_setting.update`, `item.cost_read` |
| [/api/inventory/warehouses/[id]/locations](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/warehouses/[id]/locations/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `item.update`, `stock_document.create` |
| [/api/inventory/warehouses/[id]/members](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/warehouses/[id]/members/route.ts:1>) | GET, POST, DELETE | inventoryActor; quyền anyOf | `inventory.read`, `company_setting.update` |
| [/api/inventory/warehouses/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/warehouses/[id]/route.ts:1>) | PUT, DELETE | inventoryActor; quyền anyOf | `company_setting.update` |
| [/api/inventory/warehouses/[id]/stocks](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/warehouses/[id]/stocks/route.ts:1>) | GET | inventoryActor; quyền anyOf | `inventory.read`, `stock_document.read`, `item.cost_read` |
| [/api/material-representatives](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/material-representatives/route.ts:1>) | GET, PUT, POST | Workflow context; kiểm tra trong service | — / service |
| [/api/notifications](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/notifications/route.ts:1>) | GET, PATCH, POST | Session/ownership; xem service | — / service |
| [/api/procurement/ocr](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/ocr/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `ai_run.create`, `purchase_order.create` |
| [/api/procurement/orders](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/orders/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `purchase_order.read`, `purchase_order.create` |
| [/api/procurement/orders/[id]/approve](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/orders/[id]/approve/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | — / service |
| [/api/procurement/orders/[id]/receipt](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/orders/[id]/receipt/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `purchase_order.read`, `stock_document.create` |
| [/api/procurement/orders/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/orders/[id]/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `purchase_order.read` |
| [/api/procurement/suppliers](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/suppliers/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `supplier.read`, `supplier.create` |
| [/api/procurement/suppliers/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/procurement/suppliers/[id]/route.ts:1>) | GET, PUT, DELETE | Session + capability (xem sai lệch mục 5) | `supplier.read`, `supplier.update`, `supplier.create`, `supplier.delete` |
| [/api/production-orders/available-products](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/production-orders/available-products/route.ts:1>) | GET | Workflow context; kiểm tra trong service | — / service |
| [/api/production-orders/metadata](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/production-orders/metadata/route.ts:1>) | GET | Workflow context; kiểm tra trong service | `production_order.read`, `sales_order.read`, `stock_document.create`, `stock_document.read` |
| [/api/production-orders/readiness](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/production-orders/readiness/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/production-orders](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/production-orders/route.ts:1>) | GET, POST | Workflow context; kiểm tra trong service | — / service |
| [/api/production-orders/[id]/actions](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/production-orders/[id]/actions/route.ts:1>) | POST | Workflow context; kiểm tra trong service | — / service |
| [/api/production-orders/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/production-orders/[id]/route.ts:1>) | GET | Workflow context; kiểm tra trong service | — / service |
| [/api/projects/employees](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/employees/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/projects/export-schedule](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/export-schedule/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `project.read` |
| [/api/projects](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `project.read`, `project.create` |
| [/api/projects/tasks](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/tasks/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `task.read`, `project.read`, `task.create`, `project.update` |
| [/api/projects/tasks/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/tasks/[id]/route.ts:1>) | PATCH, DELETE | Session + capability (xem sai lệch mục 5) | `task.update`, `task.complete`, `project.update`, `task.assign`, `project.assign` |
| [/api/projects/templates](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/templates/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `project_template.read`, `project.read`, `project_template.create`, `project.create` |
| [/api/projects/templates/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/templates/[id]/route.ts:1>) | PUT, DELETE | Session + capability (xem sai lệch mục 5) | `project_template.update`, `project.update`, `project_template.archive` |
| [/api/projects/[id]/acceptances](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/acceptances/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `acceptance.read`, `project.read`, `acceptance.create`, `project.update`, `acceptance.approve` |
| [/api/projects/[id]/acceptances/[accId]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/acceptances/[accId]/route.ts:1>) | PATCH | Session + capability (xem sai lệch mục 5) | `acceptance.approve`, `acceptance.update`, `project.update` |
| [/api/projects/[id]/contracts](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/contracts/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `project.read`, `contract.read`, `contract.create`, `project.update` |
| [/api/projects/[id]/design-proofs](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/design-proofs/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/projects/[id]/design-proofs/[proofId]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/design-proofs/[proofId]/route.ts:1>) | PATCH, PUT, DELETE | Session/ownership; xem service | — / service |
| [/api/projects/[id]/documents](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/documents/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `project.read`, `project.update`, `project.create` |
| [/api/projects/[id]/documents/[docId]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/documents/[docId]/route.ts:1>) | DELETE | Session + capability (xem sai lệch mục 5) | `project.update` |
| [/api/projects/[id]/finance](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/finance/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `project_finance.read`, `payment.read` |
| [/api/projects/[id]/materials](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/materials/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `item.read`, `project.read`, `stock_document.read` |
| [/api/projects/[id]/members](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/members/route.ts:1>) | GET, POST, PATCH, DELETE | Session + capability (xem sai lệch mục 5) | `project.read`, `project.assign`, `project.update` |
| [/api/projects/[id]/qc-records](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/qc-records/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/projects/[id]/reorder-stages](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/reorder-stages/route.ts:1>) | POST | Session + capability (xem sai lệch mục 5) | `project.update`, `task.update` |
| [/api/projects/[id]/reports](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/reports/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `work_report.read`, `project.read`, `work_report.create`, `task.update`, `project.update` |
| [/api/projects/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/route.ts:1>) | GET, PATCH | Session + capability (xem sai lệch mục 5) | `project.read`, `project.close`, `project.update` |
| [/api/projects/[id]/tasks](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/tasks/route.ts:1>) | GET | Session + capability (xem sai lệch mục 5) | `task.read`, `project.read` |
| [/api/projects/[id]/warranty](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/warranty/route.ts:1>) | GET | Session/ownership; xem service | — / service |
| [/api/service-tickets](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/service-tickets/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/service-tickets/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/service-tickets/[id]/route.ts:1>) | PATCH | Session/ownership; xem service | — / service |
| [/api/settings/company](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/settings/company/route.ts:1>) | GET, POST | Session + capability (xem sai lệch mục 5) | `company_setting.read`, `company_setting.update` |
| [/api/surveys](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/surveys/route.ts:1>) | GET, POST | Session/ownership; xem service | — / service |
| [/api/surveys/[id]/convert-quote](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/surveys/[id]/convert-quote/route.ts:1>) | POST | Session/ownership; xem service | — / service |
| [/api/surveys/[id]](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/surveys/[id]/route.ts:1>) | GET, PUT, DELETE | Session/ownership; xem service | — / service |
| [/api/surveys/[id]/signature](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/surveys/[id]/signature/route.ts:1>) | POST | Session/ownership; xem service | — / service |
| [/api/upload](<C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/upload/route.ts:1>) | POST | Session/ownership; xem service | — / service |

Tổng kiểm kê: **159 file, 253 handler khai báo trực tiếp**. Với API cấu hình HR không có kiểm tra phiên, xem F01; với các đường legacy chỉ session, xem F02/F17; các đường sản xuất có context không bị đánh đồng với API bỏ kiểm tra.



[s-probes-result]: C:/Users/nhatb/Documents/antigravity/noble-fermi/docs/PHAN_QUYEN_KET_QUA_TAI_HIEN_2026-10-10.json
[s-db-readme]: C:/Users/nhatb/Documents/antigravity/noble-fermi/database/README.md:27
[s-middleware]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/middleware.ts:29
[s-holidays]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/holidays/route.ts:17
[s-hrm-config]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/hrm.service.ts:1383
[s-policy]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/policy/route.ts:35
[s-payroll-calc]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/payroll/calculate/route.ts:8
[s-hr-request-review]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/requests/[id]/review/route.ts:11
[s-hrm-employees]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/hrm.service.ts:204
[s-ai-confirm-route]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/ai/actions/confirm/route.ts:35
[s-ai-confirm-service]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/ai.service.ts:2490
[s-payment-default]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/finance.service.ts:714
[s-iam-user-create]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/users/route.ts:53
[s-iam-user-service]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/iam.service.ts:168
[s-task-api]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/tasks/[id]/route.ts:27
[s-iam-role-grants]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/roles/[id]/grants/route.ts:58
[s-iam-role-create-service]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/iam.service.ts:485
[s-project-scope]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/project.service.ts:449
[s-customer-detail]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/customers/[id]/route.ts:24
[s-crm-customer]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/crm.service.ts:118
[s-po-approve-service]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/procurement.service.ts:774
[s-stock-api]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/route.ts:35
[s-stock-complete]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/documents/[id]/complete/route.ts:24
[s-stock-hooks]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/lib/production/stock-hooks.ts:4
[s-stock-import]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/import-stocks/route.ts:20
[s-stock-import-service]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/inventory.service.ts:2812
[s-count-complete]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/inventory/counts/[id]/complete/route.ts:27
[s-cash-account-api]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/accounts/route.ts:51
[s-cash-account-detail]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/accounts/[id]/route.ts:27
[s-payment-api]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/payments/route.ts:59
[s-quotation-api]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/[id]/route.ts:58
[s-quotation-convert]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/crm/quotations/[id]/convert-project/route.ts:27
[s-payroll-approve]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/payroll/approve/route.ts:22
[s-payroll-ui]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/apps/hrm/tinh-luong/page.tsx:123
[s-attendance-review]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/hrm/attendance/entries/[id]/review/route.ts:26
[s-project-api]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/route.ts:69
[s-quotation-cost]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/crm.service.ts:742
[s-bom-cost]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/production-bom.service.ts:162
[s-projections]: C:/Users/nhatb/Documents/antigravity/noble-fermi/database/migrations/004_seed.sql:425
[s-ai-stock]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/ai.service.ts:595
[s-ai-gate]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/ai.service.ts:498
[s-ai-query]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/ai.service.ts:240
[s-documents]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/documents/route.ts:26
[s-document-delete]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/documents/[id]/route.ts:27
[s-document-service]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/document.service.ts:25
[s-survey-convert]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/surveys/[id]/convert-quote/route.ts:25
[s-legacy-qc]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/qc-records/route.ts:47
[s-design-detail]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/[id]/design-proofs/[proofId]/route.ts:28
[s-analytics]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/analytics/signage/route.ts:19
[s-matrix]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/(dashboard)/cai-dat/page.tsx:1373
[s-matrix-scope]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/(dashboard)/cai-dat/page.tsx:1582
[s-grant-trigger]: C:/Users/nhatb/Documents/antigravity/noble-fermi/database/migrations/003_integrity.sql:72
[s-iam-grants-read]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/iam.service.ts:545
[s-iam-grants-write]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/iam.service.ts:597
[s-capabilities]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/authorization.service.ts:91
[s-authorize]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/services/authorization.service.ts:448
[s-production-context]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/lib/production/context.ts:20
[s-matrix-save]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/(dashboard)/cai-dat/page.tsx:427
[s-hook]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/hooks/use-authorization.tsx:183
[s-finance-overview]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/overview/route.ts:18
[s-permission-create]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/iam/permissions/route.ts:21
[s-project-export]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/projects/export-schedule/route.ts:21
[s-payment-export]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/api/finance/export/route.ts:21
[s-appshell]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/components/layouts/AppShell.tsx:23
[s-hrm-layout]: C:/Users/nhatb/Documents/antigravity/noble-fermi/src/app/apps/hrm/layout.tsx:68
