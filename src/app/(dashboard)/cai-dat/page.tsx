"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Button,
  Input,
  Select,
  Checkbox,
  Badge,
  Avatar,
  Card,
  Modal,
  Drawer,
  Tabs,
  toast,
  Skeleton,
} from "@/components/ui";
import {
  Users,
  Shield,
  Key,
  FileCode,
  Building,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Copy,
  Sliders,
  Save,
  RotateCcw,
  Check,
  ChevronRight,
  UserCheck,
  Lock,
  Unlock,
  Eye,
  Info,
  DollarSign,
  Layers,
  Sparkles,
  HelpCircle,
  Loader2,
  LayoutGrid,
  List,
} from "lucide-react";
import { IamUser, IamRole, IamPermissionGrant } from "@/services/iam.service";
import { ScopeKind } from "@/types/iam";
import { useAuthorization } from "@/hooks/use-authorization";
import { useSetPageHeader } from "@/contexts/page-header-context";

// Phân nhóm tài nguyên nghiệp vụ trực quan
const RESOURCE_CATEGORIES: Record<
  string,
  { label: string; icon: string; resources: string[] }
> = {
  sales: {
    label: "1. Kinh doanh & Khách hàng",
    icon: "🎯",
    resources: ["customer", "quotation", "sales_order"],
  },
  purchase: {
    label: "2. Mua hàng & Nhà cung cấp",
    icon: "🛒",
    resources: ["supplier", "purchase_order"],
  },
  inventory: {
    label: "3. Vật tư & Quản trị kho",
    icon: "📦",
    resources: ["item", "inventory", "stock_document"],
  },
  project: {
    label: "4. Dự án & Thi công WBS",
    icon: "🏗️",
    resources: [
      "project",
      "project_template",
      "contract",
      "production_order",
      "acceptance",
      "project_finance",
    ],
  },
  field: {
    label: "5. Việc làm & Hiện trường",
    icon: "🛠️",
    resources: ["task", "work_report", "trip", "field_event"],
  },
  finance: {
    label: "6. Kế toán & Dòng tiền",
    icon: "💰",
    resources: ["payment", "receivable", "payable", "expense_claim", "period_lock"],
  },
  hr: {
    label: "7. Nhân sự & Chấm công",
    icon: "👥",
    resources: ["employee", "attendance", "salary", "payroll"],
  },
  system: {
    label: "8. AI & Quản trị hệ thống",
    icon: "⚙️",
    resources: ["ai_run", "role", "membership", "approval_policy", "company_setting", "audit"],
  },
};

// Ánh xạ tên Tiếng Việt cho Resource (Tài nguyên)
const RESOURCE_VN: Record<string, { label: string; icon: string }> = {
  customer: { label: "Khách Hàng", icon: "👥" },
  quotation: { label: "Báo Giá & Dự Toán", icon: "📑" },
  sales_order: { label: "Đơn Bán Hàng", icon: "🛒" },
  supplier: { label: "Nhà Cung Cấp", icon: "🏭" },
  purchase_order: { label: "Đơn Mua Hàng (PO)", icon: "📋" },
  item: { label: "Vật Tư & Quy Cách", icon: "📦" },
  inventory: { label: "Tồn Kho Đa Điểm", icon: "🏢" },
  stock_document: { label: "Phiếu Nhập - Xuất - Chuyển", icon: "🔄" },
  project: { label: "Dự Án & Thi Công", icon: "🏗️" },
  project_template: { label: "Thư Viện Mẫu Dự Án", icon: "📐" },
  contract: { label: "Hợp Đồng Kinh Tế", icon: "📜" },
  production_order: { label: "Lệnh Sản Xuất Xưởng", icon: "⚙️" },
  acceptance: { label: "Biên Bản Nghiệm Thu", icon: "✍️" },
  project_finance: { label: "Tài Chính Dự Án", icon: "📊" },
  task: { label: "Việc Làm Phân Công", icon: "✅" },
  work_report: { label: "Nhật Ký Thi Công Thợ", icon: "📝" },
  trip: { label: "Lệnh Điều Xe & Vận Chuyển", icon: "🚚" },
  field_event: { label: "Sự Kiện GPS Hiện Trường", icon: "📍" },
  payment: { label: "Phiếu Thu / Chi Sổ Quỹ", icon: "💰" },
  receivable: { label: "Công Nợ Phải Thu", icon: "📈" },
  payable: { label: "Công Nợ Phải Trả", icon: "📉" },
  expense_claim: { label: "Đề Nghị Thanh Toán", icon: "🧾" },
  period_lock: { label: "Khóa Sổ Kế Toán", icon: "🔒" },
  employee: { label: "Hồ Sơ Nhân Sự", icon: "👤" },
  attendance: { label: "Bảng Chấm Công GPS", icon: "⏰" },
  salary: { label: "Bảng Tính Lương", icon: "💵" },
  payroll: { label: "Ký Duyệt Bảng Lương", icon: "🛡️" },
  ai_run: { label: "Trợ Lý AI Signage", icon: "✨" },
  role: { label: "Vai Trò & Nhóm Quyền", icon: "🛡️" },
  membership: { label: "Tài Khoản Thành Viên", icon: "🔑" },
  approval_policy: { label: "Chính Sách Phê Duyệt", icon: "⚖️" },
  company_setting: { label: "Cấu Hình Doanh Nghiệp", icon: "⚙️" },
  audit: { label: "Nhật Ký Kiểm Toán Hệ Thống", icon: "📜" },
};

// Ánh xạ tên Tiếng Việt toàn diện cho các Hành động (Action)
const ACTION_VN: Record<string, { label: string; badgeClass: string }> = {
  read: { label: "Xem dữ liệu", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  create: { label: "Tạo mới", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  update: { label: "Chỉnh sửa", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  delete: { label: "Xóa bỏ", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  archive: { label: "Lưu trữ / Khóa", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  approve: { label: "Phê duyệt / Ký", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  submit: { label: "Gửi phê duyệt", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  reject: { label: "Từ chối", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  cost_read: { label: "Xem giá vốn & Lợi nhuận", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  export: { label: "Xuất file Excel", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  import: { label: "Nhập file Excel", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  print: { label: "In ấn biểu mẫu", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  complete: { label: "Xác nhận hoàn tất", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  reverse: { label: "Hoàn tác chứng từ", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  post: { label: "Ghi sổ kế toán", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  pay: { label: "Chi trả tiền", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  settle: { label: "Quyết toán tạm ứng", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  adjust: { label: "Điều chỉnh số dư", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  count: { label: "Kiểm kê kho", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  close: { label: "Đóng / Khóa sổ", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  reopen: { label: "Mở lại kỳ", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  assign: { label: "Phân công việc", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  assign_role: { label: "Gán vai trò thành viên", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  suspend: { label: "Tạm khóa tài khoản", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  invite: { label: "Mời thành viên mới", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  ask: { label: "Hỏi đáp Trợ lý AI", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  ocr: { label: "AI Quét hóa đơn (OCR)", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  speech: { label: "AI Giọng nói hiện trường", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  retry: { label: "Chạy lại tác vụ", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  manage: { label: "Quản trị chính sách", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  publish: { label: "Ban hành áp dụng", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  release: { label: "Phát hành lệnh", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  correct: { label: "Hiệu chỉnh GPS", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  convert: { label: "Chuyển thành đơn hàng", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  private_read: { label: "Xem hồ sơ bảo mật", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  private_update: { label: "Sửa hồ sơ bảo mật", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  ai_suggest: { label: "AI Gợi ý chấm công / lương", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  generate: { label: "Tổng hợp bảng lương", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
};

// Ánh xạ tên Tiếng Việt cho Scope (Phạm vi)
const SCOPE_VN: Record<string, string> = {
  ORG: "Toàn công ty",
  DEPARTMENT: "Khối / Phòng ban",
  TEAM: "Tổ đội phụ trách",
  OWN: "Chỉ bản thân tạo",
  ASSIGNED: "Được phân công phụ trách",
  SELECTED: "Chỉ định cụ thể",
};

// Tên Tiếng Việt trực quan cho các mã vai trò chuẩn
const ROLE_VN: Record<string, string> = {
  SUPER_ADMIN: "Ban Giám Đốc (Toàn quyền)",
  ACCOUNTANT: "Kế Toán Trưởng & Tài Chính",
  WAREHOUSE_KEEPER: "Thủ Kho & Quản Lý Vật Tư",
  PROJECT_MANAGER: "Chỉ Huy Trưởng & Quản Lý Dự Án",
  FIELD_WORKER: "Thợ Thi Công & Lái Xe Hiện Trường",
  SALES: "Kinh Doanh & Chăm Sóc Khách Hàng",
};

// Hàm sinh Tên Quyền Tiếng Việt tự nhiên 100%
function getPermissionVietnameseTitle(permissionKey: string, resource: string, action: string, description?: string): string {
  const resLabel = RESOURCE_VN[resource]?.label || resource;
  const actLabel = ACTION_VN[action]?.label || action;
  return `${actLabel} (${resLabel})`;
}

function SettingsContent() {
  const { user: currentUser } = useAuthorization();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Tabs cấp cao: 'users' | 'roles' | 'effective' | 'reports' | 'company'
  const [activeTab, setActiveTab] = React.useState("users");

  React.useEffect(() => {
    if (!tabParam) return;
    if (tabParam === "rbac" || tabParam === "users") setActiveTab("users");
    else if (tabParam === "roles") setActiveTab("roles");
    else if (tabParam === "dynamic-forms" || tabParam === "reports") setActiveTab("reports");
    else if (tabParam === "settings" || tabParam === "company") setActiveTab("company");
  }, [tabParam]);

  // Dữ liệu Người dùng & Vai trò
  const [users, setUsers] = React.useState<IamUser[]>([]);
  const [roles, setRoles] = React.useState<IamRole[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = React.useState(true);

  // Bộ lọc Người dùng
  const [userSearch, setUserSearch] = React.useState("");
  const [userStatusFilter, setUserStatusFilter] = React.useState("all");
  const [userRoleFilter, setUserRoleFilter] = React.useState("all");

  // Bộ lọc Vai trò
  const [roleSearch, setRoleSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");

  // Modals & Drawers
  const [isAddUserModalOpen, setIsAddUserModalOpen] = React.useState(false);
  const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = React.useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = React.useState(false);
  const [isMatrixDrawerOpen, setIsMatrixDrawerOpen] = React.useState(false);
  const [isEffectiveModalOpen, setIsEffectiveModalOpen] = React.useState(false);

  // Target User/Role đang thao tác
  const [selectedUser, setSelectedUser] = React.useState<IamUser | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<IamRole | null>(null);

  // Form Thêm Người Dùng Mới
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserPassword, setNewUserPassword] = React.useState("Signage@2026");
  const [newUserRoleId, setNewUserRoleId] = React.useState("");
  const [newUserReason, setNewUserReason] = React.useState("Thành viên xưởng mới gia nhập");
  const [isSubmittingUser, setIsSubmittingUser] = React.useState(false);

  // Form Gán Vai Trò
  const [assignRoleId, setAssignRoleId] = React.useState("");
  const [assignValidFrom, setAssignValidFrom] = React.useState("");
  const [assignValidTo, setAssignValidTo] = React.useState("");
  const [assignReason, setAssignReason] = React.useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = React.useState(false);

  // Form Tạo/Nhân bản Vai Trò
  const [newRoleCode, setNewRoleCode] = React.useState("");
  const [newRoleName, setNewRoleName] = React.useState("");
  const [newRoleDesc, setNewRoleDesc] = React.useState("");
  const [cloneFromRoleId, setCloneFromRoleId] = React.useState("");
  const [isSubmittingRole, setIsSubmittingRole] = React.useState(false);

  // Ma trận quyền vai trò đang sửa
  const [roleGrants, setRoleGrants] = React.useState<IamPermissionGrant[]>([]);
  const [isLoadingGrants, setIsLoadingGrants] = React.useState(false);
  const [isSavingGrants, setIsSavingGrants] = React.useState(false);
  const [grantSearch, setGrantSearch] = React.useState("");
  const [grantCategory, setGrantCategory] = React.useState("all");
  const [matrixViewMode, setMatrixViewMode] = React.useState<"matrix" | "grouped" | "table">("matrix");

  // Form Thêm Quyền Hạn Mới
  const [isAddPermissionModalOpen, setIsAddPermissionModalOpen] = React.useState(false);
  const [newPermKey, setNewPermKey] = React.useState("");
  const [newPermResource, setNewPermResource] = React.useState("item");
  const [newPermAction, setNewPermAction] = React.useState("read");
  const [newPermDesc, setNewPermDesc] = React.useState("");
  const [newPermSensitive, setNewPermSensitive] = React.useState(false);
  const [newPermSupportsAmount, setNewPermSupportsAmount] = React.useState(false);
  const [isSubmittingPerm, setIsSubmittingPerm] = React.useState(false);

  // Dữ liệu quyền hiệu lực tra cứu
  const [effectiveCapabilities, setEffectiveCapabilities] = React.useState<any>(null);
  const [isLoadingEffective, setIsLoadingEffective] = React.useState(false);

  // Cấu hình tham số doanh nghiệp
  const [companySettings, setCompanySettings] = React.useState({
    companyName: "",
    companyCode: "",
    taxCode: "",
    hotline: "",
    address: "",
    email: "",
    representative: "",
    bankAccount: "",
    bankName: "",
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh",
  });
  const [isLoadingCompany, setIsLoadingCompany] = React.useState(false);
  const [isSavingCompany, setIsSavingCompany] = React.useState(false);

  const fetchCompanySettings = React.useCallback(async () => {
    try {
      setIsLoadingCompany(true);
      const res = await fetch("/api/settings/company");
      if (!res.ok) throw new Error("Không thể tải thông tin doanh nghiệp");
      const data = await res.json();
      if (data.settings) {
        setCompanySettings(data.settings);
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi tải cấu hình công ty");
    } finally {
      setIsLoadingCompany(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === "company") {
      fetchCompanySettings();
    }
  }, [activeTab, fetchCompanySettings]);

  const handleSaveCompanySettings = async () => {
    try {
      setIsSavingCompany(true);
      const res = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companySettings),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Không thể lưu thông tin doanh nghiệp");
      }
      toast.success("Đã cập nhật cấu hình xưởng doanh nghiệp thành công!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu cấu hình");
    } finally {
      setIsSavingCompany(false);
    }
  };

  // 1. Tải danh sách người dùng
  const fetchUsers = React.useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/iam/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      toast.error("Không thể tải danh sách người dùng!");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // 2. Tải danh sách vai trò
  const fetchRoles = React.useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const res = await fetch("/api/iam/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (e) {
      toast.error("Không thể tải danh sách vai trò!");
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // 3. Xử lý mở cấu hình ma trận quyền
  const handleOpenMatrixDrawer = async (role: IamRole) => {
    setSelectedRole(role);
    setIsMatrixDrawerOpen(true);
    setIsLoadingGrants(true);
    try {
      const res = await fetch(`/api/iam/roles/${role.id}/grants`);
      if (res.ok) {
        const data = await res.json();
        setRoleGrants(data.grants || []);
      } else {
        toast.error("Lỗi nạp ma trận quyền của vai trò!");
      }
    } catch (e) {
      toast.error("Không thể kết nối máy chủ để nạp ma trận quyền!");
    } finally {
      setIsLoadingGrants(false);
    }
  };

  // 4. Xử lý lưu ma trận quyền
  const handleSaveMatrix = async () => {
    if (!selectedRole) return;
    setIsSavingGrants(true);
    try {
      const res = await fetch(`/api/iam/roles/${selectedRole.id}/grants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grants: roleGrants.map((g) => ({
            permissionId: g.permissionId,
            scopeKind: g.scopeKind,
            amountLimit: g.amountLimit,
            currency: g.currency,
            isEnabled: g.isEnabled,
          })),
        }),
      });

      if (res.ok) {
        toast.success(`Đã cập nhật ma trận quyền cho vai trò ${selectedRole.name}!`);
        setIsMatrixDrawerOpen(false);
        fetchRoles();
      } else {
        const err = await res.json();
        toast.error(err.details || "Không thể lưu ma trận quyền!");
      }
    } catch (e) {
      toast.error("Lỗi khi lưu ma trận quyền!");
    } finally {
      setIsSavingGrants(false);
    }
  };

  // 5. Xử lý tạo người dùng mới
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName) {
      toast.error("Vui lòng điền Email và Họ tên!");
      return;
    }

    setIsSubmittingUser(true);
    try {
      const res = await fetch("/api/iam/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName,
          password: newUserPassword,
          roleId: newUserRoleId || undefined,
          reason: newUserReason,
        }),
      });

      if (res.ok) {
        toast.success(`Đã tạo thành công tài khoản ${newUserEmail}!`);
        setIsAddUserModalOpen(false);
        setNewUserEmail("");
        setNewUserName("");
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.details || "Lỗi tạo tài khoản!");
      }
    } catch (e) {
      toast.error("Lỗi kết nối khi tạo tài khoản!");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // 6. Xử lý đổi trạng thái thành viên (Khóa/Kích hoạt)
  const handleToggleUserStatus = async (user: IamUser) => {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/iam/users/${user.membershipId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        toast.success(
          `Đã ${nextStatus === "active" ? "mở khóa" : "tạm khóa"} tài khoản ${user.email}!`
        );
        fetchUsers();
      } else {
        toast.error("Không thể cập nhật trạng thái!");
      }
    } catch (e) {
      toast.error("Lỗi kết nối khi cập nhật trạng thái!");
    }
  };

  // 7. Xử lý gán vai trò
  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !assignRoleId) {
      toast.error("Vui lòng chọn vai trò!");
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const res = await fetch(`/api/iam/users/${selectedUser.membershipId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: assignRoleId,
          validFrom: assignValidFrom || undefined,
          validTo: assignValidTo || null,
          reason: assignReason || "Phân công quyền hạn công việc",
        }),
      });

      if (res.ok) {
        toast.success(`Đã gán vai trò cho ${selectedUser.name}!`);
        setIsAssignRoleModalOpen(false);
        setAssignRoleId("");
        setAssignValidFrom("");
        setAssignValidTo("");
        setAssignReason("");
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.details || "Không thể gán vai trò!");
      }
    } catch (e) {
      toast.error("Lỗi kết nối khi gán vai trò!");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // 8. Xử lý tạo / nhân bản vai trò
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleCode || !newRoleName) {
      toast.error("Vui lòng nhập Mã và Tên vai trò!");
      return;
    }

    setIsSubmittingRole(true);
    try {
      const res = await fetch("/api/iam/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newRoleCode,
          name: newRoleName,
          description: newRoleDesc,
          cloneFromRoleId: cloneFromRoleId || undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Đã tạo vai trò ${newRoleName} (${newRoleCode}) thành công!`);
        setIsCreateRoleModalOpen(false);
        setNewRoleCode("");
        setNewRoleName("");
        setNewRoleDesc("");
        setCloneFromRoleId("");
        fetchRoles();
      } else {
        const err = await res.json();
        toast.error(err.details || "Lỗi tạo vai trò mới!");
      }
    } catch (e) {
      toast.error("Lỗi kết nối khi tạo vai trò!");
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // 8b. Xử lý tạo quyền hạn mới vào hệ thống
  const handleCreatePermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermKey.trim() || !newPermDesc.trim()) {
      toast.error("Vui lòng điền mã quyền và mô tả quyền!");
      return;
    }

    setIsSubmittingPerm(true);
    try {
      const res = await fetch("/api/iam/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newPermKey.trim().toLowerCase(),
          resource: newPermResource,
          action: newPermAction,
          description: newPermDesc.trim(),
          isSensitive: newPermSensitive,
          supportsAmountLimit: newPermSupportsAmount,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể tạo quyền mới");
      }

      toast.success(`Đã thêm quyền mới "${newPermKey}" thành công!`);
      setIsAddPermissionModalOpen(false);
      setNewPermKey("");
      setNewPermDesc("");
      if (selectedRole) {
        handleOpenMatrixDrawer(selectedRole);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi thêm quyền");
    } finally {
      setIsSubmittingPerm(false);
    }
  };

  // 9. Xem quyền hiệu lực của người dùng
  const handleViewEffectivePermissions = async (user: IamUser) => {
    setSelectedUser(user);
    setIsEffectiveModalOpen(true);
    setIsLoadingEffective(true);
    try {
      const res = await fetch(`/api/iam/users/${user.userId}/capabilities`);
      if (res.ok) {
        const data = await res.json();
        setEffectiveCapabilities(data);
      } else {
        toast.error("Không thể nạp quyền hiệu lực!");
      }
    } catch (e) {
      toast.error("Lỗi khi tải thông tin quyền!");
    } finally {
      setIsLoadingEffective(false);
    }
  };

  // Lọc danh sách người dùng
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchStatus =
        userStatusFilter === "all" || u.status === userStatusFilter;
      const matchRole =
        userRoleFilter === "all" ||
        u.roles.some((r) => r.roleCode === userRoleFilter);
      return matchSearch && matchStatus && matchRole;
    });
  }, [users, userSearch, userStatusFilter, userRoleFilter]);

  // Lọc ma trận quyền (Hỗ trợ tìm kiếm theo cả tiếng Anh, tiếng Việt, tài nguyên, hành động)
  const filteredGrants = React.useMemo(() => {
    const q = grantSearch.trim().toLowerCase();
    return roleGrants.filter((g) => {
      const resVn = (RESOURCE_VN[g.resource]?.label || "").toLowerCase();
      const actVn = (ACTION_VN[g.action]?.label || "").toLowerCase();
      const matchSearch =
        !q ||
        g.permissionKey.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.action.toLowerCase().includes(q) ||
        resVn.includes(q) ||
        actVn.includes(q);

      if (grantCategory === "all") return matchSearch;
      const catResources = RESOURCE_CATEGORIES[grantCategory]?.resources || [];
      return matchSearch && catResources.includes(g.resource);
    });
  }, [roleGrants, grantSearch, grantCategory]);

  // Nhóm quyền theo tài nguyên để hiển thị trực quan dạng lưới/khối
  const groupedGrantsByResource = React.useMemo(() => {
    const map = new Map<string, IamPermissionGrant[]>();
    for (const g of filteredGrants) {
      if (!map.has(g.resource)) map.set(g.resource, []);
      map.get(g.resource)!.push(g);
    }
    return Array.from(map.entries());
  }, [filteredGrants]);

  // Bộ lọc vai trò
  const filteredRoles = React.useMemo(() => {
    return roles.filter((r) => {
      if (roleFilter === "system" && !r.isSystem) return false;
      if (roleFilter === "custom" && r.isSystem) return false;
      if (roleSearch.trim()) {
        const q = roleSearch.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCode = r.code.toLowerCase().includes(q);
        const matchVn = (ROLE_VN[r.code] || "").toLowerCase().includes(q);
        return matchName || matchCode || matchVn;
      }
      return true;
    });
  }, [roles, roleFilter, roleSearch]);

  useSetPageHeader(
    {
      title: "Cài Đặt Hệ Thống",
      subtitle:
        activeTab === "users"
          ? "Tài khoản & Phân quyền người dùng"
          : activeTab === "roles"
          ? isMatrixDrawerOpen && selectedRole
            ? `Cấu hình quyền: ${selectedRole.name}`
            : "Danh sách vai trò & Nhóm quyền RBAC"
          : activeTab === "company"
          ? "Thông tin pháp nhân & Tham số xưởng"
          : "Cấu hình biểu mẫu báo cáo động",
      badge: "Quản Trị",
    },
    [activeTab, isMatrixDrawerOpen, selectedRole]
  );

  return (
    <div className="space-y-4">
      {/* 2. Hệ Thống Sub-Tabs M20 */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === "users"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Thành Viên & Tài Khoản ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === "roles"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Vai Trò & Ma Trận RBAC ({roles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === "reports"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Biểu Mẫu Báo Cáo Động</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("company")}
          className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === "company"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Tham Số Xưởng Doanh Nghiệp</span>
        </button>
      </div>

      {/* 3. NỘI DUNG TAB 1: DANH SÁCH NGƯỜI DÙNG & GÁN VAI TRÒ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Thanh tìm kiếm & Lọc */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Lọc trạng thái */}
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="suspended">Tạm khóa</option>
                <option value="revoked">Đã thu hồi</option>
              </select>

              {/* Lọc vai trò */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700"
              >
                <option value="all">Tất cả vai trò</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị <strong>{filteredUsers.length}</strong> / {users.length} tài khoản
              </span>
              <Button
                variant="primary"
                size="sm"
                className="text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm flex items-center gap-1.5"
                onClick={() => setIsAddUserModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Thành Viên</span>
              </Button>
            </div>
          </div>

          {/* Bảng Danh Sách Người Dùng */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            {isLoadingUsers ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Không tìm thấy tài khoản người dùng nào khớp với điều kiện lọc.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-3">Thành viên</th>
                      <th className="py-2.5 px-3">Vai trò phân công</th>
                      <th className="py-2.5 px-3">Thời hạn hiệu lực</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Ngày gia nhập</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.membershipId} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} size="sm" />
                            <div>
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length > 0 ? (
                              u.roles.map((r, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                  title={`Lý do: ${r.reason}`}
                                >
                                  <Shield className="w-2.5 h-2.5" />
                                  <span>{ROLE_VN[r.roleName] || ROLE_VN[r.roleCode] || r.roleName}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Chưa gán vai trò
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {u.roles.length > 0 && u.roles[0].validTo ? (
                            <span className="text-amber-700 font-medium">
                              Đến {new Date(u.roles[0].validTo).toLocaleDateString("vi-VN")}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Vô thời hạn</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          {u.status === "active" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Hoạt động</span>
                            </span>
                          )}
                          {u.status === "suspended" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Tạm khóa</span>
                            </span>
                          )}
                          {u.status === "revoked" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-2.5 h-2.5" />
                              <span>Đã thu hồi</span>
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-[11px] text-slate-400">
                          {new Date(u.joinedAt).toLocaleDateString("vi-VN")}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* Nút Xem quyền hiệu lực */}
                            <button
                              type="button"
                              onClick={() => handleViewEffectivePermissions(u)}
                              title="Tra cứu quyền hiệu lực thực tế"
                              className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Nút Gán vai trò */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setAssignRoleId(u.roles[0]?.roleId || "");
                                setAssignReason(`Phân công quyền hạn cho ${u.name}`);
                                setIsAssignRoleModalOpen(true);
                              }}
                              title="Gán hoặc cập nhật vai trò"
                              className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Nút Khóa / Mở khóa */}
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              title={u.status === "active" ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
                              className={`p-1 rounded-md transition ${
                                u.status === "active"
                                  ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {u.status === "active" ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. NỘI DUNG TAB 2: VAI TRÒ & MA TRẬN PHÂN QUYỀN RBAC */}
      {activeTab === "roles" && (
        <div>
          {/* Khi đang xem ma trận quyền → hiện full inline panel thay thế cards */}
          {isMatrixDrawerOpen && selectedRole ? (
            <div className="space-y-3">
              {/* Header breadcrumb */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsMatrixDrawerOpen(false)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  Danh sách vai trò
                </button>
                <span className="text-slate-300">/</span>
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {selectedRole.code}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{selectedRole.name}</span>
                  <span className="text-xs text-slate-400">
                    — {roleGrants.filter((g) => g.isEnabled).length}/{roleGrants.length} quyền
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setNewPermKey(`${selectedRole.code.toLowerCase()}.`);
                      setNewPermResource("item");
                      setNewPermAction("read");
                      setNewPermDesc("");
                      setIsAddPermissionModalOpen(true);
                    }}
                    className="font-bold flex items-center gap-1.5 px-3"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Quyền Mới</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSavingGrants}
                    onClick={handleSaveMatrix}
                    className="font-bold flex items-center gap-1.5 px-4"
                  >
                    {isSavingGrants ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang lưu...</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" />Lưu Ma Trận Quyền</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const ids = new Set(filteredGrants.map((g) => g.permissionId));
                        setRoleGrants((prev) =>
                          prev.map((g) => (ids.has(g.permissionId) ? { ...g, isEnabled: true } : g))
                        );
                        toast.success("Đã bật tất cả quyền đang lọc!");
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Chọn tất cả</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ids = new Set(filteredGrants.map((g) => g.permissionId));
                        setRoleGrants((prev) =>
                          prev.map((g) =>
                            ids.has(g.permissionId) ? { ...g, isEnabled: g.action === "read" } : g
                          )
                        );
                        toast.success("Đã bật các quyền chỉ xem!");
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chỉ quyền xem</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ids = new Set(filteredGrants.map((g) => g.permissionId));
                        setRoleGrants((prev) =>
                          prev.map((g) =>
                            ids.has(g.permissionId)
                              ? { ...g, isEnabled: ["read", "create", "update"].includes(g.action) }
                              : g
                          )
                        );
                        toast.success("Đã chọn các quyền tác nghiệp chuẩn!");
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Nghiệp vụ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ids = new Set(filteredGrants.map((g) => g.permissionId));
                        setRoleGrants((prev) =>
                          prev.map((g) => (ids.has(g.permissionId) ? { ...g, isEnabled: false } : g))
                        );
                        toast.success("Đã bỏ chọn tất cả quyền!");
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Bỏ chọn</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Chuyển chế độ xem: Ma trận 2D / Nhóm thẻ / Bảng phẳng */}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setMatrixViewMode("matrix")}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5",
                          matrixViewMode === "matrix"
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                        title="Ma trận phân quyền 2D ngang trực quan (Khuyên dùng)"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Ma trận 2D</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatrixViewMode("grouped")}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5",
                          matrixViewMode === "grouped"
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                        title="Xem theo từng phân hệ trực quan"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Nhóm thẻ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatrixViewMode("table")}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5",
                          matrixViewMode === "table"
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                        title="Xem dạng bảng dòng"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Bảng chi tiết</span>
                      </button>
                    </div>

                    <select
                      defaultValue=""
                      onChange={async (e) => {
                        const sid = e.target.value;
                        if (!sid) return;
                        try {
                          const res = await fetch(`/api/iam/roles/${sid}/grants`);
                          if (res.ok) {
                            const d = await res.json();
                            const src: IamPermissionGrant[] = d.grants || [];
                            const mp = new Map(src.map((g) => [g.permissionKey, g]));
                            setRoleGrants((prev) =>
                              prev.map((g) => {
                                const f = mp.get(g.permissionKey);
                                return f
                                  ? {
                                      ...g,
                                      isEnabled: f.isEnabled,
                                      scopeKind: f.scopeKind,
                                      amountLimit: f.amountLimit,
                                    }
                                  : g;
                              })
                            );
                            toast.success("Đã sao chép cấu hình quyền từ vai trò nguồn!");
                          }
                        } catch {
                          toast.error("Lỗi khi sao chép ma trận quyền!");
                        }
                        e.target.value = "";
                      }}
                      className="py-1 px-2.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 cursor-pointer hover:border-slate-400"
                    >
                      <option value="">Sao chép từ vai trò khác...</option>
                      {roles
                        .filter((r) => r.id !== selectedRole?.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm quyền theo tên tiếng Việt hoặc mã (ví dụ: khách hàng, vật tư, kho, báo giá, xem giá vốn)..."
                    value={grantSearch}
                    onChange={(e) => setGrantSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setGrantCategory("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition",
                      grantCategory === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    Tất cả ({roleGrants.length})
                  </button>
                  {Object.entries(RESOURCE_CATEGORIES).map(([key, cat]) => {
                    const count = roleGrants.filter((g) => cat.resources.includes(g.resource)).length;
                    const isSel = grantCategory === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setGrantCategory(key)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5",
                          isSel
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <span>{cat.label.replace(/^\d+\.\s*/, "")}</span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 rounded-full font-mono",
                            isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Danh sách phân quyền */}
              {isLoadingGrants ? (
                <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  <span>Đang nạp ma trận quyền của vai trò...</span>
                </div>
              ) : filteredGrants.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                  Không tìm thấy quyền nào phù hợp với bộ lọc.
                </div>
              ) : matrixViewMode === "matrix" ? (
                /* CHẾ ĐỘ 1: MA TRẬN PHÂN QUYỀN 2D NGANG (GỌN GÀNG, HÀNG NGANG, 100% TIẾNG VIỆT) */
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="py-3 px-4 min-w-[210px]">Phân Hệ Nghiệp Vụ</th>
                          <th className="py-3 px-2 text-center w-14" title="Xem danh sách & chi tiết">Xem</th>
                          <th className="py-3 px-2 text-center w-14" title="Tạo mới dữ liệu">Tạo</th>
                          <th className="py-3 px-2 text-center w-14" title="Chỉnh sửa dữ liệu">Sửa</th>
                          <th className="py-3 px-2 text-center w-14" title="Xóa bỏ dữ liệu">Xóa</th>
                          <th className="py-3 px-2 text-center w-16" title="Phê duyệt / Ký xác nhận">Duyệt</th>
                          <th className="py-3 px-3 min-w-[200px]">Quyền Đặc Thù & Tác Vụ</th>
                          <th className="py-3 px-3 min-w-[150px]">Phạm Vi Áp Dụng</th>
                          <th className="py-3 px-3 min-w-[140px]">Hạn Mức Duyệt (₫)</th>
                          <th className="py-3 px-3 text-right w-24">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupedGrantsByResource.map(([resource, grants]) => {
                          const resInfo = RESOURCE_VN[resource] || { label: resource, icon: "📁" };
                          const readG = grants.find((g) => g.action === "read");
                          const createG = grants.find((g) => g.action === "create");
                          const updateG = grants.find((g) => g.action === "update");
                          const deleteG = grants.find((g) => g.action === "delete");
                          const approveG = grants.find((g) =>
                            ["approve", "submit", "reject"].includes(g.action)
                          );
                          const specialGs = grants.filter(
                            (g) =>
                              ![
                                "read",
                                "create",
                                "update",
                                "delete",
                                "approve",
                                "submit",
                                "reject",
                              ].includes(g.action)
                          );
                          const activeCount = grants.filter((g) => g.isEnabled).length;
                          const primaryScope =
                            grants.find((g) => g.isEnabled)?.scopeKind ||
                            grants[0]?.scopeKind ||
                            "ORG";
                          const amountGrant = grants.find((g) => g.supportsAmountLimit);

                          return (
                            <tr
                              key={resource}
                              className={cn(
                                "hover:bg-slate-50/80 transition-colors",
                                activeCount > 0 ? "bg-white" : "bg-slate-50/30 opacity-70"
                              )}
                            >
                              {/* Cột 1: Tên Phân Hệ */}
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{resInfo.icon}</span>
                                  <div>
                                    <div className="font-bold text-slate-900">{resInfo.label}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {resource} · {activeCount}/{grants.length} quyền
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Cột 2: Xem */}
                              <td className="py-2.5 px-2 text-center">
                                {readG ? (
                                  <input
                                    type="checkbox"
                                    title={readG.description || `Xem ${resInfo.label}`}
                                    checked={readG.isEnabled}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setRoleGrants((prev) =>
                                        prev.map((g) =>
                                          g.permissionId === readG.permissionId
                                            ? { ...g, isEnabled: checked }
                                            : g
                                        )
                                      );
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* Cột 3: Tạo */}
                              <td className="py-2.5 px-2 text-center">
                                {createG ? (
                                  <input
                                    type="checkbox"
                                    title={createG.description || `Tạo ${resInfo.label}`}
                                    checked={createG.isEnabled}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setRoleGrants((prev) =>
                                        prev.map((g) =>
                                          g.permissionId === createG.permissionId
                                            ? { ...g, isEnabled: checked }
                                            : g
                                        )
                                      );
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* Cột 4: Sửa */}
                              <td className="py-2.5 px-2 text-center">
                                {updateG ? (
                                  <input
                                    type="checkbox"
                                    title={updateG.description || `Sửa ${resInfo.label}`}
                                    checked={updateG.isEnabled}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setRoleGrants((prev) =>
                                        prev.map((g) =>
                                          g.permissionId === updateG.permissionId
                                            ? { ...g, isEnabled: checked }
                                            : g
                                        )
                                      );
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* Cột 5: Xóa */}
                              <td className="py-2.5 px-2 text-center">
                                {deleteG ? (
                                  <input
                                    type="checkbox"
                                    title={deleteG.description || `Xóa ${resInfo.label}`}
                                    checked={deleteG.isEnabled}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setRoleGrants((prev) =>
                                        prev.map((g) =>
                                          g.permissionId === deleteG.permissionId
                                            ? { ...g, isEnabled: checked }
                                            : g
                                        )
                                      );
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* Cột 6: Duyệt */}
                              <td className="py-2.5 px-2 text-center">
                                {approveG ? (
                                  <input
                                    type="checkbox"
                                    title={approveG.description || `Duyệt/Ký ${resInfo.label}`}
                                    checked={approveG.isEnabled}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setRoleGrants((prev) =>
                                        prev.map((g) =>
                                          g.permissionId === approveG.permissionId
                                            ? { ...g, isEnabled: checked }
                                            : g
                                        )
                                      );
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>

                              {/* Cột 7: Quyền Đặc Thù & Tác Vụ */}
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {specialGs.length === 0 ? (
                                    <span className="text-slate-300 text-[10px]">—</span>
                                  ) : (
                                    specialGs.map((sg) => {
                                      const actInfo = ACTION_VN[sg.action] || {
                                        label: sg.action,
                                      };
                                      return (
                                        <button
                                          key={sg.permissionId}
                                          type="button"
                                          onClick={() => {
                                            setRoleGrants((prev) =>
                                              prev.map((g) =>
                                                g.permissionId === sg.permissionId
                                                  ? { ...g, isEnabled: !g.isEnabled }
                                                  : g
                                              )
                                            );
                                          }}
                                          title={sg.description || sg.permissionKey}
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer",
                                            sg.isEnabled
                                              ? "bg-blue-50 text-blue-700 border-blue-300 shadow-2xs font-bold"
                                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                          )}
                                        >
                                          {sg.isEnabled ? "✓ " : ""}
                                          {actInfo.label}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </td>

                              {/* Cột 8: Phạm Vi Áp Dụng */}
                              <td className="py-2.5 px-3">
                                <select
                                  value={primaryScope}
                                  onChange={(e) => {
                                    const newScope = e.target.value as ScopeKind;
                                    const resIds = new Set(grants.map((g) => g.permissionId));
                                    setRoleGrants((prev) =>
                                      prev.map((g) =>
                                        resIds.has(g.permissionId)
                                          ? { ...g, scopeKind: newScope }
                                          : g
                                      )
                                    );
                                  }}
                                  className="w-full text-xs py-1 px-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:ring-1 focus:ring-slate-400"
                                >
                                  <option value="ORG">Toàn công ty</option>
                                  <option value="DEPARTMENT">Theo phòng ban</option>
                                  <option value="ASSIGNED">Được phân công</option>
                                  <option value="OWN">Chỉ tạo bởi mình</option>
                                </select>
                              </td>

                              {/* Cột 9: Hạn Mức Duyệt */}
                              <td className="py-2.5 px-3">
                                {amountGrant ? (
                                  <input
                                    type="number"
                                    placeholder="Không giới hạn"
                                    disabled={!amountGrant.isEnabled}
                                    value={amountGrant.amountLimit ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value ? Number(e.target.value) : null;
                                      setRoleGrants((prev) =>
                                        prev.map((g) =>
                                          g.permissionId === amountGrant.permissionId
                                            ? { ...g, amountLimit: val, currency: "VND" }
                                            : g
                                        )
                                      );
                                    }}
                                    className="w-full text-xs font-mono font-bold text-slate-900 px-2 py-1 border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:opacity-40"
                                  />
                                ) : (
                                  <span className="text-slate-300 text-[10px]">—</span>
                                )}
                              </td>

                              {/* Cột 10: Thao Tác Nhanh */}
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const resIds = new Set(grants.map((g) => g.permissionId));
                                      setRoleGrants((prev) =>
                                        prev.map((g) =>
                                          resIds.has(g.permissionId)
                                            ? { ...g, isEnabled: true }
                                            : g
                                        )
                                      );
                                    }}
                                    className="text-[10px] font-bold text-blue-600 hover:underline px-1"
                                  >
                                    Bật
                                  </button>
                                  <span className="text-slate-300">|</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const resIds = new Set(grants.map((g) => g.permissionId));
                                      setRoleGrants((prev) =>
                                        prev.map((g) =>
                                          resIds.has(g.permissionId)
                                            ? { ...g, isEnabled: false }
                                            : g
                                        )
                                      );
                                    }}
                                    className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-1"
                                  >
                                    Tắt
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : matrixViewMode === "grouped" ? (
                /* CHẾ ĐỘ 2: NHÓM THEO THẺ TÀI NGUYÊN */
                <div className="space-y-4">
                  {groupedGrantsByResource.map(([resource, grants]) => {
                    const resInfo = RESOURCE_VN[resource] || { label: resource, icon: "📁" };
                    const enabledCount = grants.filter((g) => g.isEnabled).length;
                    return (
                      <div
                        key={resource}
                        className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                      >
                        {/* Header của từng tài nguyên */}
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{resInfo.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-900">{resInfo.label}</h4>
                                <span className="font-mono text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {resource}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Đã cấp <strong className="text-slate-900">{enabledCount}/{grants.length}</strong> quyền
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const resIds = new Set(grants.map((g) => g.permissionId));
                                setRoleGrants((prev) =>
                                  prev.map((g) =>
                                    resIds.has(g.permissionId) ? { ...g, isEnabled: true } : g
                                  )
                                );
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                            >
                              Bật tất cả ({grants.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const resIds = new Set(grants.map((g) => g.permissionId));
                                setRoleGrants((prev) =>
                                  prev.map((g) =>
                                    resIds.has(g.permissionId) ? { ...g, isEnabled: false } : g
                                  )
                                );
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                            >
                              Tắt tất cả
                            </button>
                          </div>
                        </div>

                        {/* Danh sách thẻ quyền dạng lưới 2 cột */}
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50/20">
                          {grants.map((grant) => {
                            const actInfo = ACTION_VN[grant.action] || {
                              label: grant.action,
                              badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                            };
                            return (
                              <div
                                key={grant.permissionId}
                                className={cn(
                                  "p-3 rounded-xl border transition bg-white flex flex-col justify-between gap-2.5",
                                  grant.isEnabled
                                    ? "border-slate-300 shadow-xs ring-1 ring-slate-900/5"
                                    : "border-slate-200/70 bg-slate-50/40 opacity-60"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                                    <input
                                      type="checkbox"
                                      id={`grant-${grant.permissionId}`}
                                      checked={grant.isEnabled}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setRoleGrants((prev) =>
                                          prev.map((g) =>
                                            g.permissionId === grant.permissionId
                                              ? { ...g, isEnabled: checked }
                                              : g
                                          )
                                        );
                                      }}
                                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                    />
                                    <div>
                                      <span className="font-bold text-xs text-slate-900 block leading-tight">
                                        {getPermissionVietnameseTitle(
                                          grant.permissionKey,
                                          grant.resource,
                                          grant.action,
                                          grant.description
                                        )}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400">
                                        {grant.permissionKey}
                                      </span>
                                    </div>
                                  </label>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span
                                      className={cn(
                                        "text-[10px] font-semibold px-2 py-0.5 rounded border",
                                        actInfo.badgeClass
                                      )}
                                    >
                                      {actInfo.label}
                                    </span>
                                    {grant.isSensitive && (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                        Nhạy cảm
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Điều khiển Phạm vi & Hạn mức */}
                                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                  <div className="flex-1 min-w-[140px]">
                                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                      Phạm vi áp dụng:
                                    </label>
                                    <select
                                      value={grant.scopeKind}
                                      disabled={!grant.isEnabled}
                                      onChange={(e) => {
                                        const newScope = e.target.value as ScopeKind;
                                        setRoleGrants((prev) =>
                                          prev.map((g) =>
                                            g.permissionId === grant.permissionId
                                              ? { ...g, scopeKind: newScope }
                                              : g
                                          )
                                        );
                                      }}
                                      className="w-full py-1 px-2 text-xs rounded border border-slate-200 bg-white font-medium text-slate-700 disabled:opacity-40 disabled:bg-slate-100"
                                    >
                                      {grant.supportedScopes.map((scope) => (
                                        <option key={scope} value={scope}>
                                          {SCOPE_VN[scope] || scope}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {grant.supportsAmountLimit && (
                                    <div className="flex-1 min-w-[130px]">
                                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                        Hạn mức tiền (VND):
                                      </label>
                                      <input
                                        type="number"
                                        placeholder="Không giới hạn"
                                        disabled={!grant.isEnabled}
                                        value={grant.amountLimit ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? Number(e.target.value) : null;
                                          setRoleGrants((prev) =>
                                            prev.map((g) =>
                                              g.permissionId === grant.permissionId
                                                ? { ...g, amountLimit: val, currency: "VND" }
                                                : g
                                            )
                                          );
                                        }}
                                        className="w-full text-xs font-mono font-bold text-slate-900 px-2 py-1 border border-slate-200 rounded disabled:bg-slate-100 disabled:opacity-40"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* CHẾ ĐỘ 2: BẢNG CHI TIẾT DẠNG DÒNG */
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-left">
                        <th className="py-2.5 px-4 w-10"></th>
                        <th className="py-2.5 px-4">Tên quyền</th>
                        <th className="py-2.5 px-4 w-44">Phân hệ</th>
                        <th className="py-2.5 px-4 w-36">Hành động</th>
                        <th className="py-2.5 px-4 w-52">Phạm vi</th>
                        <th className="py-2.5 px-4 w-40">Hạn mức (VND)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGrants.map((grant) => (
                        <tr
                          key={grant.permissionId}
                          className={cn(
                            "transition-colors hover:bg-slate-50/50",
                            !grant.isEnabled && "opacity-50"
                          )}
                        >
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              id={`grant-${grant.permissionId}`}
                              checked={grant.isEnabled}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setRoleGrants((prev) =>
                                  prev.map((g) =>
                                    g.permissionId === grant.permissionId
                                      ? { ...g, isEnabled: checked }
                                      : g
                                  )
                                );
                              }}
                              className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <label
                              htmlFor={`grant-${grant.permissionId}`}
                              className="font-semibold text-slate-900 cursor-pointer hover:text-slate-600 block"
                            >
                              {getPermissionVietnameseTitle(
                                grant.permissionKey,
                                grant.resource,
                                grant.action,
                                grant.description
                              )}
                            </label>
                            <span className="font-mono text-[10px] text-slate-400">
                              {grant.permissionKey}
                            </span>
                            {grant.isSensitive && (
                              <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Nhạy cảm
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-slate-700 font-medium">
                            {RESOURCE_VN[grant.resource]?.label || grant.resource}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {ACTION_VN[grant.action]?.label || grant.action}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={grant.scopeKind}
                              disabled={!grant.isEnabled}
                              onChange={(e) => {
                                const newScope = e.target.value as ScopeKind;
                                setRoleGrants((prev) =>
                                  prev.map((g) =>
                                    g.permissionId === grant.permissionId
                                      ? { ...g, scopeKind: newScope }
                                      : g
                                  )
                                );
                              }}
                              className="py-1 px-2 text-xs rounded border border-slate-300 bg-white font-medium text-slate-700 disabled:opacity-40 disabled:bg-slate-100 w-full"
                            >
                              {grant.supportedScopes.map((scope) => (
                                <option key={scope} value={scope}>
                                  {SCOPE_VN[scope] || scope}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            {grant.supportsAmountLimit ? (
                              <input
                                type="number"
                                placeholder="Không giới hạn"
                                disabled={!grant.isEnabled}
                                value={grant.amountLimit ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? Number(e.target.value) : null;
                                  setRoleGrants((prev) =>
                                    prev.map((g) =>
                                      g.permissionId === grant.permissionId
                                        ? { ...g, amountLimit: val, currency: "VND" }
                                        : g
                                    )
                                  );
                                }}
                                className="w-full text-xs font-mono font-bold text-slate-900 px-2 py-1 border border-slate-300 rounded disabled:bg-slate-100 disabled:opacity-40"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* DANH SÁCH CARDS VAI TRÒ (KÈM THANH CÔNG CỤ & NÚT TẠO VAI TRÒ MỚI) */
            <div className="space-y-4">
              {/* Toolbar danh sách vai trò */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm vai trò theo tên, mã (ví dụ: Kế toán, Thủ kho, SALES)..."
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setRoleFilter("all")}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition",
                        roleFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Tất cả ({roles.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter("system")}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition",
                        roleFilter === "system" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Hệ thống ({roles.filter((r) => r.isSystem).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter("custom")}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition",
                        roleFilter === "custom" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Tùy chỉnh ({roles.filter((r) => !r.isSystem).length})
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCloneFromRoleId("");
                      setNewRoleCode("");
                      setNewRoleName("");
                      setNewRoleDesc("");
                      setIsCreateRoleModalOpen(true);
                    }}
                    className="gap-1.5 h-8 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tạo vai trò mới
                  </Button>
                </div>
              </div>

              {/* Lưới thẻ vai trò */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {isLoadingRoles ? (
                  [1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                    >
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))
                ) : filteredRoles.length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
                    <p className="text-xs text-slate-500">
                      Không tìm thấy vai trò nào phù hợp với bộ lọc tìm kiếm.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setRoleSearch("");
                        setRoleFilter("all");
                      }}
                    >
                      Đặt lại bộ lọc
                    </Button>
                  </div>
                ) : (
                  filteredRoles.map((r) => (
                    <Card
                      key={r.id}
                      className="p-4 border border-slate-200 hover:border-slate-400 transition bg-white flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {r.code}
                            </span>
                            {r.isSystem && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Hệ thống
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            <Key className="w-2.5 h-2.5" />
                            <span>{r.grantCount} quyền</span>
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{r.name}</h3>
                          {ROLE_VN[r.code] && ROLE_VN[r.code] !== r.name && (
                            <p className="text-[11px] font-semibold text-blue-600">
                              {ROLE_VN[r.code]}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {r.description || "Không có mô tả."}
                          </p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                        <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            <strong>{r.memberCount}</strong> thành viên
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCloneFromRoleId(r.id);
                              setNewRoleCode(`${r.code}_COPY`);
                              setNewRoleName(`${r.name} (Bản sao)`);
                              setNewRoleDesc(`Nhân bản từ vai trò ${r.name}`);
                              setIsCreateRoleModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            title="Nhân bản vai trò này"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs font-bold"
                            onClick={() => handleOpenMatrixDrawer(r)}
                          >
                            <Sliders className="w-3 h-3 mr-1" />
                            Cấu hình quyền
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. NỘI DUNG TAB 3: CẤU HÌNH BIỂU MẪU BÁO CÁO ĐỘNG */}
      {activeTab === "reports" && (
        <Card className="p-6 bg-white border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
            <FileCode className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="font-bold text-sm text-slate-900">
              Cấu hình Biểu mẫu Báo cáo Công việc Hiện trường Động
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cho phép Ban Giám Đốc tự thêm, bớt hoặc điều chỉnh các trường nhập liệu báo cáo cho từng vai trò (Thợ thi công, Thợ xưởng, Lái xe) và từng loại việc chuyên môn (Khảo sát, Hàn khung, Đi LED, Ốp Alu).
            </p>
          </div>
          <div className="pt-2">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              Đang áp dụng mẫu biểu chuẩn doanh nghiệp theo Mục 7 MA_TRAN_PHAN_QUYEN_DONG.md
            </span>
          </div>
        </Card>
      )}

      {/* 6. NỘI DUNG TAB 4: THAM SỐ DOANH NGHIỆP */}
      {activeTab === "company" && (
        <Card className="p-6 bg-white border border-slate-200 space-y-5 max-w-2xl mx-auto shadow-xs">
          <div className="space-y-1 border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Thông tin Xưởng Doanh Nghiệp Biển Quảng Cáo
              </h3>
              <p className="text-xs text-slate-500">
                Thông tin nhận diện trên hợp đồng, báo giá dự toán và chân trang in ấn PDF.
              </p>
            </div>
            {isLoadingCompany && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang tải...
              </span>
            )}
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tên công ty / Doanh nghiệp <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={companySettings.companyName}
                onChange={(e) =>
                  setCompanySettings((prev) => ({ ...prev, companyName: e.target.value }))
                }
                placeholder="CÔNG TY TNHH..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mã doanh nghiệp</label>
                <input
                  type="text"
                  value={companySettings.companyCode}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mã số thuế</label>
                <input
                  type="text"
                  value={companySettings.taxCode}
                  onChange={(e) =>
                    setCompanySettings((prev) => ({ ...prev, taxCode: e.target.value }))
                  }
                  placeholder="VD: 0109887766..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hotline liên hệ</label>
                <input
                  type="text"
                  value={companySettings.hotline}
                  onChange={(e) =>
                    setCompanySettings((prev) => ({ ...prev, hotline: e.target.value }))
                  }
                  placeholder="0988.xxx.xxx"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email liên hệ</label>
                <input
                  type="email"
                  value={companySettings.email}
                  onChange={(e) =>
                    setCompanySettings((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="contact@xưởng.vn"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Địa chỉ xưởng sản xuất & văn phòng
              </label>
              <input
                type="text"
                value={companySettings.address}
                onChange={(e) =>
                  setCompanySettings((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Địa chỉ trụ sở / xưởng chính..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tài khoản ngân hàng</label>
                <input
                  type="text"
                  value={companySettings.bankAccount}
                  onChange={(e) =>
                    setCompanySettings((prev) => ({ ...prev, bankAccount: e.target.value }))
                  }
                  placeholder="Số tài khoản nhận thanh toán..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên ngân hàng & Chi nhánh</label>
                <input
                  type="text"
                  value={companySettings.bankName}
                  onChange={(e) =>
                    setCompanySettings((prev) => ({ ...prev, bankName: e.target.value }))
                  }
                  placeholder="VD: Techcombank - CN Hà Nội"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Người đại diện pháp luật</label>
                <input
                  type="text"
                  value={companySettings.representative}
                  onChange={(e) =>
                    setCompanySettings((prev) => ({ ...prev, representative: e.target.value }))
                  }
                  placeholder="Họ tên giám đốc / chủ xưởng..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Đơn vị tiền tệ mặc định</label>
                <input
                  type="text"
                  value={companySettings.currency}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              className="text-xs font-bold"
              disabled={isSavingCompany || isLoadingCompany}
              onClick={handleSaveCompanySettings}
            >
              {isSavingCompany ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Lưu Thiết Lập
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* MODAL: THÊM THÀNH VIÊN MỚI */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Thêm thành viên mới vào tổ chức"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email công việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              placeholder="ví dụ: nhanvien@signage-erp.vn"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Họ và tên thành viên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ví dụ: Nguyễn Văn A"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mật khẩu khởi tạo
            </label>
            <input
              type="text"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono bg-slate-50"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Người dùng có thể tự đổi mật khẩu sau lần đăng nhập đầu tiên.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Vai trò ban đầu
            </label>
            <select
              value={newUserRoleId}
              onChange={(e) => setNewUserRoleId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="">-- Chưa gán vai trò ngay --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do khởi tạo thành viên
            </label>
            <input
              type="text"
              value={newUserReason}
              onChange={(e) => setNewUserReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddUserModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingUser}
              className="font-bold"
            >
              {isSubmittingUser ? "Đang xử lý..." : "Tạo & Kích Hoạt Thành Viên"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: GÁN VAI TRÒ CHO NGƯỜI DÙNG */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAssignRoleModalOpen}
        onClose={() => setIsAssignRoleModalOpen(false)}
        title={`Gán vai trò cho: ${selectedUser?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleAssignRoleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn vai trò cần gán <span className="text-rose-500">*</span>
            </label>
            <select
              value={assignRoleId}
              required
              onChange={(e) => setAssignRoleId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
            >
              <option value="">-- Chọn một vai trò --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code}) - {r.grantCount} quyền
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hiệu lực từ ngày
              </label>
              <input
                type="date"
                value={assignValidFrom}
                onChange={(e) => setAssignValidFrom(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hết hạn vào ngày (tùy chọn)
              </label>
              <input
                type="date"
                value={assignValidTo}
                onChange={(e) => setAssignValidTo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do phân công <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              placeholder="ví dụ: Bổ nhiệm vị trí Kế toán dự án"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAssignRoleModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingAssign}
              className="font-bold"
            >
              {isSubmittingAssign ? "Đang lưu..." : "Xác Nhận Gán Vai Trò"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: TẠO HOẶC NHÂN BẢN VAI TRÒ */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
        title={cloneFromRoleId ? "Nhân bản vai trò mới" : "Tạo vai trò mới"}
        maxWidth="md"
      >
        <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã vai trò (Role Code) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ví dụ: SALES_REP, WORKSHOP_LEAD..."
              required
              value={newRoleCode}
              onChange={(e) => setNewRoleCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên hiển thị vai trò <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ví dụ: Nhân Viên Kinh Doanh, Tổ Trưởng Xưởng Hàn..."
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mô tả trách nhiệm & chức năng
            </label>
            <textarea
              rows={2}
              placeholder="Mô tả phạm vi quyền hạn của vai trò này..."
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Sao chép ma trận quyền từ vai trò có sẵn (Tùy chọn)
            </label>
            <select
              value={cloneFromRoleId}
              onChange={(e) => setCloneFromRoleId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="">-- Không sao chép (tạo vai trò rỗng) --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  Nhân bản từ: {r.name} ({r.grantCount} quyền)
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateRoleModalOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingRole}
              className="font-bold"
            >
              {isSubmittingRole ? "Đang tạo..." : "Xác Nhận Tạo Vai Trò"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: TRA CỨU QUYỀN HIỆU LỰC (EFFECTIVE CAPABILITIES) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEffectiveModalOpen}
        onClose={() => setIsEffectiveModalOpen(false)}
        title={`Tra cứu quyền hiệu lực: ${selectedUser?.name}`}
        maxWidth="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {isLoadingEffective ? (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Đang tính toán ma trận quyền hiệu lực từ database...</span>
            </div>
          ) : !effectiveCapabilities ? (
            <div className="text-xs text-slate-500 text-center py-4">
              Không có dữ liệu quyền.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Vai trò kích hoạt: </span>
                  <span className="font-bold text-slate-800">
                    {effectiveCapabilities.roles?.map((r: any) => r.name).join(", ") ||
                      "Chưa có"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Điểm vào mặc định: </span>
                  <span className="font-mono font-bold text-blue-700">
                    {effectiveCapabilities.defaultRoute}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-700">
                  Danh sách quyền hợp nhất ({Object.keys(effectiveCapabilities.capabilities || {}).length} quyền):
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  {Object.values(effectiveCapabilities.capabilities || {}).map(
                    (cap: any, idx) => {
                      const permKey = cap.permission || "";
                      const parts = permKey.split(".");
                      const res = parts[0] || "";
                      const act = parts[1] || "";
                      const resInfo = RESOURCE_VN[res];
                      const actInfo = ACTION_VN[act];
                      const titleVn = getPermissionVietnameseTitle(permKey, res, act, "");

                      return (
                        <div
                          key={idx}
                          className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-slate-800 block text-xs truncate">
                                {titleVn}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {permKey}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] shrink-0">
                            {actInfo && (
                              <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-bold border", actInfo.badgeClass)}>
                                {actInfo.label}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {SCOPE_VN[cap.scope] || cap.scope}
                            </span>
                            {cap.amountLimit && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[10px]">
                                {cap.amountLimit.toLocaleString("vi-VN")} {cap.currency || "VND"}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({cap.fromRole})
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: THÊM QUYỀN HẠN MỚI VÀO DANH MỤC */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddPermissionModalOpen}
        onClose={() => setIsAddPermissionModalOpen(false)}
        title="Thêm quyền hạn mới vào hệ thống"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePermissionSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã định danh quyền (Key) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: item.discount_read, report.export_custom..."
              value={newPermKey}
              onChange={(e) => setNewPermKey(e.target.value.toLowerCase())}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Quy ước: [tên_phân_hệ].[hành_động], ví dụ: item.read, payment.approve
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phân hệ nghiệp vụ <span className="text-rose-500">*</span>
              </label>
              <select
                value={newPermResource}
                onChange={(e) => setNewPermResource(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                {Object.entries(RESOURCE_VN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.icon} {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hành động (Action) <span className="text-rose-500">*</span>
              </label>
              <select
                value={newPermAction}
                onChange={(e) => setNewPermAction(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                {Object.entries(ACTION_VN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label} ({k})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mô tả chi tiết quyền hạn <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="VD: Cho phép nhân viên xem chiết khấu đặc biệt của nhà cung cấp..."
              value={newPermDesc}
              onChange={(e) => setNewPermDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newPermSensitive}
                onChange={(e) => setNewPermSensitive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Quyền nhạy cảm (Cần bảo vệ nghiêm ngặt khi cấp phát)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newPermSupportsAmount}
                onChange={(e) => setNewPermSupportsAmount(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Hỗ trợ thiết lập hạn mức tiền (VNĐ) khi phê duyệt</span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmittingPerm}
              onClick={() => setIsAddPermissionModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingPerm}>
              Thêm Quyền
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SettingsAndIamPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          Đang nạp phân hệ Quản trị hệ thống & RBAC...
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}
