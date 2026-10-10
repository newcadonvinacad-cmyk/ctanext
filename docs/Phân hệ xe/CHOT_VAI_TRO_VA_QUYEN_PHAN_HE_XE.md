# Chốt vai trò và quyền phân hệ xe

Ngày: 10/10/2026. Mục đích: đặc tả đủ để sửa quyền và kiểm thử; chưa triển khai code hay thay đổi quyền người dùng thật.

Tài liệu này thay phần phân quyền tại mục 16 của `THIET_KE_PHAN_HE_DOI_XE_VA_VAN_CHUYEN.md` và cụ thể hóa yêu cầu quyền trong `KE_HOACH_HOAN_THIEN_IMPORT_GPS_BINH_MINH.md`. Các nghiệp vụ khác giữ theo hai tài liệu đó.

## 1. Chốt cách chia người dùng

**Cài sẵn hai vai trò nghiệp vụ xe: Điều phối xe và Quản lý đội xe.** Dùng tài khoản, nhân viên và màn hình phân quyền chung của ERP. Một người có thể kiêm nhiệm nhiều vai trò; không tạo hệ thống tài khoản riêng cho xe.

| Vai trò | Mã | Quyền mặc định trong phân hệ xe |
|---|---|---|
| Điều phối xe — tên thống nhất thay “Admin xe” | `FLEET_OPERATOR` — thêm mới | Vận hành toàn đội: lập/phát hành lệnh, nhập Excel, xử lý nhật ký, lập đề nghị OT, ghi nhiên liệu/chi phí, hồ sơ/lịch và theo dõi vấn đề. Không duyệt OT, sửa chính sách hoặc chốt/mở kỳ. |
| Quản lý đội xe | `FLEET_MANAGER` — thêm mới | Toàn bộ quyền Điều phối; thêm duyệt OT, quyết định xử lý vấn đề, sửa chính sách, chốt/mở điều chỉnh kỳ. |
| Kế toán | `ACCOUNTANT` — dùng lại | Xem lệnh và báo cáo kết quả đã duyệt/chốt toàn công ty; xuất phần được xem. Không nhập GPS, sửa vận hành hay duyệt OT xe. Thanh toán/nhận vào lương theo quyền Tài chính/HRM hiện có. |
| Phụ trách dự án | `PROJECT_MANAGER` — dùng lại | Xem phần lệnh và chi phí đã công bố của dự án được phân công; đính kèm bảng tuyến của phần dự án đó. Không tự điều xe hoặc xem GPS/OT của cả đội. |
| Thủ kho | `WAREHOUSE_KEEPER` — dùng lại | Không có quyền đội xe mặc định. Người kiêm điều phối được gán thêm `FLEET_OPERATOR`. Quyền xuất/nhập kho vẫn thuộc Kho. |
| Thợ / lái xe | `FIELD_WORKER` — dùng lại nếu đã có tài khoản | Giữ quyền đọc/hoàn thành lệnh trong phạm vi được giao của luồng cũ. Không nhập GPS, đọc toàn bộ nhật ký, xem tiền OT người khác. Không tạo thêm role hoặc ứng dụng tài xế trong đợt này. |
| Quản trị hệ thống | `SUPER_ADMIN`; tương thích mã `ADMIN` đang được xử lý trong mã nguồn | Toàn quyền trong công ty đang truy cập, gồm quản trị người dùng. Vẫn chịu quy tắc khóa kỳ, phiên bản và lưu lịch sử nghiệp vụ. Không dùng tài khoản này để kiểm thử quyền Điều phối. |

Hai role mới không kèm quyền quản trị tài khoản, bảng lương, phê duyệt thanh toán hoặc quản lý kho. Mặc định, chỉ Quản trị hệ thống cấp/thu hồi hai role mới; người đã được ủy quyền quản trị IAM tiếp tục dùng cơ chế IAM hiện có.

## 2. Ma trận quyền cài sẵn

Ký hiệu: **O** = toàn công ty hiện tại (`ORG`); **A** = được phân công (`ASSIGNED`); **—** = không cấp. Các quyền không có trong bảng không được tự cấp thêm cho hai role xe. `SUPER_ADMIN` có toàn bộ quyền O; Thủ kho không có grant nào trong bảng.

| Mã quyền | Phạm vi hành động | Điều phối | Quản lý xe | Kế toán | Phụ trách DA | Thợ/lái xe |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `trip.read` | Xem lệnh và phần công việc được phép | O | O | O | A | A |
| `trip.create`, `trip.update` | Lập/sửa nội dung lệnh; sửa sau phát hành phải có phiên bản | O | O | — | — | — |
| `trip.assign` | Gán/đổi xe, tài xế trên lệnh | O | O | — | — | — |
| `trip.dispatch` | Phát hành/điều động lệnh | O | O | — | — | — |
| `trip.complete` | Xác nhận hoàn thành lệnh | O | O | — | — | A |
| `trip.cancel` **mới** | Hủy lệnh, lưu lý do | O | O | — | — | — |
| `trip.attach` **mới** | Gắn/thay tài liệu tuyến thuộc phần lệnh được phép | O | O | — | A | — |
| `fleet.read` **mới** | Xem vận hành: GPS, lịch sử nhập, nhật ký, OT đề nghị/đã duyệt, chi phí, hồ sơ/lịch, vấn đề, chính sách và báo cáo tạm tính | O | O | — | — | — |
| `fleet.update` **mới** | Cập nhật nghiệp vụ vận hành quy định bên dưới | O | O | — | — | — |
| `fleet.import` **mới** | Tải Excel lên, xem trước, xác nhận nhập/thay thế/thu hồi đợt nhập theo điều kiện dữ liệu | O | O | — | — | — |
| `fleet.export` **mới** | Xuất báo cáo/tải file GPS gốc trong phần dữ liệu đã được quyền đọc | O | O | O | A | — |
| `fleet_ot.approve` **mới** | Duyệt, từ chối, duyệt lại OT xe | — | O | — | — | — |
| `fleet_issue.close` **mới** | Quyết định xử lý, đóng/mở lại vấn đề mọi mức độ | — | O | — | — | — |
| `fleet_setting.update` **mới** | Sửa định mức, đơn giá OT, mốc ngày công và chính sách xe có ngày hiệu lực | — | O | — | — | — |
| `fleet_period.close` **mới** | Chốt kỳ đội xe; xác nhận chuyển/thử lại chuyển bản chốt sang phân hệ nhận | — | O | — | — | — |
| `fleet_period.reopen` **mới** | Mở điều chỉnh kỳ đội xe, bắt buộc lý do | — | O | — | — | — |
| `fleet_report.read` **mới** | Xem kết quả đã duyệt/chốt hoặc đã công bố cho bên nhận; không đọc hồ sơ nguồn | O | O | O | A | — |

**Ranh giới của quyền gộp:** `fleet.update` gồm phân loại/giải trình nhật ký, bằng chứng, phân công lái thực tế, lập/sửa/gửi đề nghị OT, ghi nhiên liệu/chi phí, hồ sơ xe, thông tin vận hành tài xế, lịch và cập nhật tiến độ vấn đề. Không sửa định danh nhân viên/lương trong HRM, sửa trực tiếp số GPS nguồn, tự xác nhận thanh toán hoặc thay quyết định phê duyệt. Vấn đề nhẹ/trung bình chỉ được Điều phối đóng sau khi đã có quyết định xử lý của người có `fleet_issue.close`; vấn đề nặng do người có quyền này đóng.

Các thao tác ghi cần thêm quyền đọc tương ứng: lệnh cần `trip.read`; nghiệp vụ xe cần `fleet.read`. `fleet.export` không tự cấp quyền đọc. Không tạo thêm quyền riêng cho từng nút hoặc từng cột Excel.

**Phạm vi hỗ trợ:** các quyền `fleet.read/update/import`, phê duyệt, chính sách và kỳ chỉ hỗ trợ O trong đợt này, phù hợp một đội xe dùng chung. `fleet_report.read`, `fleet.export`, `trip.cancel/attach` hỗ trợ `ORG`, `ASSIGNED`, `SELECTED`; giữ phạm vi khai báo của sáu quyền `trip.*` cũ. Không tạo thêm cơ chế chia chi nhánh/nhóm xe khi chưa có nhu cầu.

## 3. Phạm vi dữ liệu và những điều không được suy diễn

1. **Công ty:** lấy từ phiên và membership đang hoạt động, kiểm tra trên máy chủ. Không nhận công ty từ nội dung Excel hoặc tin `organizationId` do trình duyệt gửi; không tự rơi về “công ty mặc định”. O không có nghĩa được xem mọi công ty.
2. **Dự án được phân công:** đối với quyền A của dự án, lấy dự án mà người dùng là phụ trách hoặc thành viên còn hiệu lực. Chốt đổi mặc định `PROJECT_MANAGER.trip.read` từ `SELECTED` cũ sang `ASSIGNED`, đồng bộ `trip.attach`, `fleet_report.read` và `fleet.export`; không phải cấu hình lại danh sách dự án trong một màn hình xe riêng. Với quyền tùy chỉnh `SELECTED`, kiểm tra `iam.grant_projects` gắn với đúng quyền/grant còn hiệu lực; danh sách rỗng trả rỗng.
3. **Lệnh được giao:** `trip.read` A cho phép đọc phần việc thuộc dự án ở mục 2 hoặc lệnh mà nhân viên được phân công lái. `trip.complete` A chỉ cho hoàn thành phần việc/lệnh được giao trực tiếp; là thành viên dự án không đủ để hoàn thành thay tài xế.
4. **Lệnh nhiều dự án:** trả về phần việc, điểm phục vụ, tài liệu và chi phí được phép. Không trả GPS cả ngày, tiền OT từng người hoặc phần dự án khác rồi chỉ ẩn trên giao diện. Nếu kết quả công bố chưa tách được theo dự án thì chưa cung cấp cho người chỉ có quyền A/SELECTED.
5. **Kế toán:** `fleet_report.read` chỉ mở kết quả đã duyệt/chốt; OT đã duyệt có thể bàn giao trước chốt tháng nếu nghiệp vụ cho phép. Dòng OT theo nhân viên còn phải thuộc phạm vi `payroll.read` của người xem; thiếu quyền đó chỉ thấy tổng chi phí OT. `payroll.read` phạm vi OWN không được nâng thành quyền đọc cả đội. `fleet.read` cho phép xem OT nghiệp vụ xe, không mở dữ liệu lương khác của nhân viên.
6. **Tệp và xuất:** tải Excel GPS gốc cần `fleet.read` + `fleet.export`. Tệp đính kèm lệnh theo quyền đọc phần lệnh; tệp chung chứa dữ liệu ngoài phạm vi không được tải toàn bộ. Xuất báo cáo dùng giao của quyền đọc và quyền xuất, kể cả báo cáo tổng hợp và số đếm.
7. **Kiêm nhiệm:** hợp quyền theo từng hành động và hợp các tập bản ghi được phép; không gộp nhầm phạm vi. Quản lý xe được nhập dữ liệu rồi duyệt OT của người khác. Mặc định không tự duyệt OT mà mình là người hưởng; phải có người duyệt khác, kể cả khi mang role hệ thống. Không bắt hai người khác nhau cho mọi lần nhập file.
8. **Ranh giới phân hệ:** `project.read/create` không thay quyền xe. `company_setting.update` không thay `fleet_setting.update`; `period_lock.close/reopen` của ERP không tự mở/chốt kỳ đội xe; `attendance.approve` không thay `fleet_ot.approve`. Ngược lại, quyền đội xe không tự cấp quyền ghi sổ, trả tiền hoặc mở kỳ đích.

Mọi lần ghi vẫn kiểm tra trạng thái/phiên bản hiện tại. Nhập file lại không cho phép ghi đè âm thầm dữ liệu đã dùng duyệt/chốt: giữ bản hiệu lực, lưu bản mới chờ điều chỉnh; mở kỳ và duyệt lại theo quyền tương ứng. Thu hồi đợt nhập cũng chịu cùng quy tắc.

## 4. Hiển thị và cách cấp quyền

- Cài sẵn hai role mới ở **Cài đặt → Vai trò & phân quyền**. Gán tại màn hình người dùng hiện có; không thêm trang “người dùng đội xe”. Tên “Admin xe” trên UI/tài liệu được thống nhất thành “Điều phối xe”.
- `FLEET_MANAGER` được seed đầy đủ các grant của Điều phối cộng quyền quản lý; không cần gán cả hai role mới. Hai role là mẫu cấp quyền ban đầu; thực thi theo permission hiệu lực, không kiểm tra tên role trong từng chức năng.
- Cổng vào `APP_FLEET`/`M15`: có ít nhất `fleet.read`, `trip.read` hoặc `fleet_report.read`. Bỏ `project.read` và quyền chỉ-tạo khỏi điều kiện vào; các đường dẫn `/doi-xe`, `/van-chuyen`, `/apps/van-chuyen` sau chuyển hướng chịu cùng kiểm tra.
- Người có `fleet.read` thấy các màn vận hành; nút Nhập Excel cần `fleet.import`, Duyệt OT cần `fleet_ot.approve`, Chốt/Mở kỳ cần quyền tương ứng. Chỉ có `trip.read` thì vào Điều xe; chỉ có `fleet_report.read` thì vào Báo cáo. Tổng quan chỉ chứa dữ liệu trong quyền đọc của người đó.
- Phụ trách dự án thấy Điều xe và Báo cáo trong phạm vi dự án. Kế toán thấy Điều xe và Báo cáo được công bố. Người chỉ có quyền đọc không thấy nút ghi; người có quyền ghi nhưng kỳ khóa thấy lý do thao tác bị khóa.
- Role xe mới có trang mặc định `/apps/doi-xe`. Người đang kiêm role ERP giữ trang mặc định hiện có và thêm lối vào Đội xe. Bỏ nhãn dự phòng “Quản trị Đội xe”; hiển thị đúng vai trò đã gán.
- Màn quyền hiệu lực phải thể hiện quyền, phạm vi và role cấp quyền. Đổi/thu hồi role phải làm mất quyền ở lần gọi máy chủ kế tiếp; xóa cache quyền và tải lại giao diện theo cơ chế IAM hiện có.

## 5. Các chỗ cần sửa, theo thứ tự

Nhận định hiện trạng dưới đây dựa trên mã nguồn tại thời điểm đọc; chưa đối chiếu dữ liệu phân quyền đang chạy trong database.

| Ưu tiên / nơi sửa | Việc cần làm |
|---|---|
| **1. Chặn đường truy cập thiếu quyền** — `src/app/api/apps/doi-xe/` | `import-gps/preview` và `commit` đang cho đi tiếp khi không lấy được phiên; `history`, `nhat-ky`, `bao-cao` chưa xác thực tại handler. Bắt buộc phiên thật, membership hoạt động, công ty và permission ở tất cả route. Middleware kiểm tra có cookie hiện tại không thay bước này. |
| **2. Danh mục và seed** — migration mới, `src/types/iam.ts`, `src/constants/permissions.ts` | Thêm hai role và **12 quyền mới** đánh dấu trong bảng; dùng lại sáu quyền `trip.*` cũ. Thêm resource/action còn thiếu, nhãn tiếng Việt, phạm vi hỗ trợ, seed grant và route mặc định. Đồng bộ danh mục DB và cấu hình mã nguồn. Không sửa lại lịch sử migration đã chạy. |
| **3. Quyền lệnh cũ** — `src/app/api/fleet/trips/route.ts`, `vehicles/route.ts`, `src/services/project.service.ts` | Bỏ nhánh cho phép bằng `project.read/create`. Tạo lệnh cần `trip.create`; đổi xe/tài xế cần `trip.assign`; phát hành cần `trip.dispatch`; hoàn thành cần `trip.complete`; hủy cần `trip.cancel`. Không dùng `trip.update OR trip.dispatch` để đổi mọi trạng thái. Danh sách xe đầy đủ cần `fleet.read`; người chỉ đọc lệnh nhận tối thiểu thông tin xe liên quan. |
| **4. Dữ liệu và bộ kiểm tra chung** — `src/services/gps-import.service.ts`, dịch vụ xe/lệnh và `src/services/authorization.service.ts` | Truyền ngữ cảnh người dùng/công ty vào dịch vụ; áp phạm vi lên truy vấn danh sách, chi tiết, thống kê, ghi, xuất và tải file. Kho GPS trong bộ nhớ đang dùng chung, khóa theo biển số/ngày chưa tách công ty: phải tách theo công ty hoặc thay bằng lưu DB đúng phạm vi. Không chỉ kiểm tra chuỗi scope rồi trả mọi bản ghi. Khi hợp quyền A/SELECTED phải giữ đủ grant để truy ra đúng tập dữ liệu. |
| **5. Giao diện và IAM** — `src/app/apps/doi-xe/`, `src/app/(dashboard)/cai-dat/page.tsx`, menu/lối tắt | Gắn permission vào trang, tab và hành động; bỏ hiển thị toàn bộ nút theo mặc định. Hiển thị hai role mới và các grant đúng bảng; đồng bộ `APP_FLEET`, `M15`, route mặc định và nhãn người dùng. Không chỉ ẩn nút mà bỏ kiểm tra API. |

**Ánh xạ tối thiểu cho API nhập đang có:**

| API | Quyền bắt buộc |
|---|---|
| `POST /api/apps/doi-xe/import-gps/preview` | `fleet.read` + `fleet.import` |
| `POST /api/apps/doi-xe/import-gps/commit` | `fleet.read` + `fleet.import`; kiểm tra lại quyền và kỳ ngay lúc lưu |
| `GET /api/apps/doi-xe/import-gps/history` | `fleet.read` |
| `GET /api/apps/doi-xe/nhat-ky` | `fleet.read` |
| `GET /api/apps/doi-xe/bao-cao` | `fleet.read` cho báo cáo vận hành/tạm tính; hoặc `fleet_report.read` cho kết quả công bố đã lọc |

Commit phải dùng đợt xem trước do máy chủ lưu, gắn với công ty và người tạo; không nhận cả đối tượng `preview` do trình duyệt gửi rồi tin số liệu/quyền trong đó. Người khác không được dùng lại mã preview để commit; có thể nhập lại file để tạo preview của mình. Lần lưu kiểm tra lại phiên bản dữ liệu và trạng thái kỳ. Lỗi phiên trả 401; thiếu quyền 403; dữ liệu ngoài phạm vi không được trả nội dung; xung đột phiên bản/kỳ trả lỗi nghiệp vụ rõ ràng.

**Chuyển từ bộ quyền hiện tại:**

1. Tạo role/grant theo công ty, chạy lại không nhân đôi và không tự bật lại quyền đã được quản trị viên tắt sau triển khai. Không tự gán role xe mới cho mọi Thủ kho hoặc Phụ trách dự án.
2. Với mẫu `PROJECT_MANAGER` mặc định, bỏ `trip.create/update/assign/dispatch`, đổi `trip.read` sang A và thêm quyền như bảng. Điều phối thực tế được gán `FLEET_OPERATOR`; người có quyền quyết định được gán `FLEET_MANAGER`. `ACCOUNTANT` giữ `trip.read` và thêm quyền báo cáo/xuất theo bảng. Giữ hai quyền `FIELD_WORKER` đã nêu.
3. Trước migration, lập danh sách grant hiện tại khác mẫu cũ. Chỉ tự chuyển grant xác định được là mặc định chưa tùy chỉnh; giữ cấu hình tùy chỉnh và đưa vào danh sách đối chiếu, không âm thầm xóa quyền do khách đã cấp. Việc giữ tùy chỉnh không được giữ lại lỗ hổng bỏ kiểm tra phiên, công ty hoặc dùng quyền dự án thay quyền xe.
4. Ghi lịch sử thay đổi quyền, làm mới cache. Chuẩn bị tài khoản thử riêng cho Điều phối, Quản lý, Kế toán, hai Phụ trách dự án khác nhau và người không có quyền xe. Không tạo/gán người dùng thật trong công việc viết tài liệu này.

## 6. Điều kiện nghiệm thu

| Ca kiểm thử | Kết quả phải đạt |
|---|---|
| Cài mới và chạy lại seed | Đúng hai role mới, đủ grant theo bảng, không trùng; cấu hình quyền đã chỉnh không bị bật lại. |
| Điều phối nhập hai file thô khách đã cung cấp, nhập lại và nhập bản sửa | Được xem trước/lưu theo kế hoạch import; không được duyệt OT, sửa chính sách hoặc chốt/mở kỳ. |
| Kế toán hoặc tài khoản chỉ có quyền dự án gọi trực tiếp API import | Bị từ chối dù tự hiện nút hoặc tự gửi yêu cầu. Kế toán vẫn xem/xuất được kết quả đã công bố. |
| Không có phiên hợp lệ; cookie giả; membership bị khóa | Tất cả API xe từ chối, không rơi về công ty mặc định hoặc kho dữ liệu dùng chung. |
| Phụ trách dự án A mở lệnh chung A+B, tải tệp và xuất báo cáo | Chỉ nhận phần A; không thấy B, GPS cả ngày hoặc OT từng người ngoài quyền. `SELECTED` rỗng không trả toàn bộ. |
| Hai công ty dùng cùng biển số/ngày hoặc thử đổi mã đợt nhập | Không xem, khử trùng, cập nhật hoặc commit nhầm dữ liệu của nhau. Không commit preview người khác hay preview bị sửa trên trình duyệt. |
| Quản lý duyệt OT; người vừa nhập cũng là người duyệt | Được duyệt OT của người khác; không tự duyệt khoản mình hưởng. Lưu đúng người duyệt, thời điểm và phiên bản. |
| Chỉ có `trip.update` rồi gửi trạng thái hoàn thành/hủy/phát hành | Không vượt qua quyền hành động tương ứng. Thợ/lái xe không hoàn thành thay phần việc không được giao. |
| Kỳ khóa hoặc GPS thay đổi sau duyệt | Điều phối không ghi đè bản hiệu lực; Quản lý mở điều chỉnh có lý do và duyệt/chốt lại đúng quy trình. |
| Thu hồi quyền sau preview, trước commit; hoặc vào đường dẫn cũ | Commit/URL trực tiếp vẫn kiểm tra quyền mới; không dựa vào nút đã hiện hay cache quyền cũ. |

Hoàn tất khi kết quả trên đúng ở cả giao diện lẫn API. Phạm vi sửa này không bổ sung ứng dụng tài xế, phân cấp nhiều tầng duyệt hoặc màn hình quản trị người dùng riêng cho đội xe.
