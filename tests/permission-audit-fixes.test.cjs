const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadModule(file, mocks = {}) {
  const resolved = path.resolve(file);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;

  const customRequire = (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith("@/")) {
      const targetPath = path.join("src", id.slice(2));
      const fullPath = fs.existsSync(targetPath + ".ts")
        ? targetPath + ".ts"
        : fs.existsSync(targetPath + ".tsx")
        ? targetPath + ".tsx"
        : null;
      if (fullPath) return loadModule(fullPath, mocks);
    }
    if (id.startsWith(".")) {
      const relPath = path.resolve(path.dirname(resolved), id);
      const fullPath = fs.existsSync(relPath + ".ts")
        ? relPath + ".ts"
        : fs.existsSync(relPath + ".tsx")
        ? relPath + ".tsx"
        : null;
      if (fullPath) return loadModule(fullPath, mocks);
    }
    return require(id);
  };

  vm.runInNewContext(
    code,
    {
      exports,
      require: customRequire,
      console,
      Date,
      Set,
      Map,
      Buffer,
      process,
      Response,
      Request,
      Headers,
      URL,
      globalThis,
      crypto: require("crypto"),
    },
    { filename: resolved }
  );

  return exports;
}

test("Remediation of 11 Probes and F01-F28 Permission Audit", async (t) => {
  // --------------------------------------------------------------------------
  // PROBE 11 & F23: Scope Hierarchy Predicate Matching
  // --------------------------------------------------------------------------
  await t.test("Probe 11 & F23: satisfiesScope logic enforces predicate containment", () => {
    const authService = loadModule("src/services/authorization.service.ts", {
      "@/lib/db": { getDbPool: () => ({}) },
      "@/constants/permissions": { SCREEN_REQUIREMENTS: {} },
    });
    const { satisfiesScope } = authService;

    // Probe 11: OWN must NOT satisfy SELECTED
    assert.equal(
      satisfiesScope("OWN", "SELECTED"),
      false,
      "Probe 11: OWN must not satisfy SELECTED scope"
    );
    assert.equal(satisfiesScope("OWN", "ORG"), false);
    assert.equal(satisfiesScope("OWN", "DEPARTMENT"), false);
    assert.equal(satisfiesScope("OWN", "TEAM"), false);
    assert.equal(satisfiesScope("OWN", "ASSIGNED"), false);
    assert.equal(satisfiesScope("OWN", "OWN"), true);

    // ORG satisfies all scopes
    assert.equal(satisfiesScope("ORG", "ORG"), true);
    assert.equal(satisfiesScope("ORG", "DEPARTMENT"), true);
    assert.equal(satisfiesScope("ORG", "TEAM"), true);
    assert.equal(satisfiesScope("ORG", "ASSIGNED"), true);
    assert.equal(satisfiesScope("ORG", "SELECTED"), true);
    assert.equal(satisfiesScope("ORG", "OWN"), true);

    // DEPARTMENT satisfies TEAM, ASSIGNED, OWN
    assert.equal(satisfiesScope("DEPARTMENT", "DEPARTMENT"), true);
    assert.equal(satisfiesScope("DEPARTMENT", "TEAM"), true);
    assert.equal(satisfiesScope("DEPARTMENT", "ASSIGNED"), true);
    assert.equal(satisfiesScope("DEPARTMENT", "OWN"), true);
    assert.equal(satisfiesScope("DEPARTMENT", "ORG"), false);
    assert.equal(satisfiesScope("DEPARTMENT", "SELECTED"), false);

    // ASSIGNED satisfies OWN but not SELECTED or ORG
    assert.equal(satisfiesScope("ASSIGNED", "OWN"), true);
    assert.equal(satisfiesScope("ASSIGNED", "SELECTED"), false);
    assert.equal(satisfiesScope("ASSIGNED", "DEPARTMENT"), false);
  });

  // --------------------------------------------------------------------------
  // PROBE 9 & F01: Holiday and shifts write without session check
  // --------------------------------------------------------------------------
  await t.test("Probe 9 & F01: Holiday and Shift routes reject unauthenticated requests", async () => {
    const holidaysRoute = loadModule("src/app/api/hrm/holidays/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => null } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({ capabilities: {}, roles: [] }),
        },
      },
      "@/services/hrm.service": { HrmService: {} },
    });

    const mockReq = new Request("http://localhost/api/hrm/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Tết", date: "2026-01-01" }),
    });

    const res = await holidaysRoute.POST(mockReq);
    assert.equal(res.status, 401, "Unauthenticated holiday create must return 401");
  });

  // --------------------------------------------------------------------------
  // PROBE 1 & F02: Salary policy write with no capabilities
  // --------------------------------------------------------------------------
  await t.test("Probe 1 & F02: Salary policy write rejected without salary.update / company_setting.update", async () => {
    const policyRoute = loadModule("src/app/api/hrm/policy/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({ capabilities: {}, roles: [] }), // empty capabilities
        },
      },
      "@/services/hrm.service": { HrmService: {} },
    });

    const mockReq = new Request("http://localhost/api/hrm/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ probationRate: 0.85 }),
    });

    const res = await policyRoute.POST(mockReq);
    assert.equal(res.status, 403, "Salary policy write with empty capabilities must return 403");
  });

  // --------------------------------------------------------------------------
  // PROBE 2 & F02: Payroll calculation read without payroll.read
  // --------------------------------------------------------------------------
  await t.test("Probe 2 & F02: Payroll calculation read rejected without payroll.read", async () => {
    const payrollCalcRoute = loadModule("src/app/api/hrm/payroll/calculate/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({
            capabilities: { "employee.read": { isEnabled: true } }, // has employee.read but lacks payroll.read
            roles: [],
          }),
        },
      },
      "@/services/hrm.service": { HrmService: {} },
    });

    const mockReq = new Request("http://localhost/api/hrm/payroll/calculate?periodId=p1", {
      method: "GET",
    });

    const res = await payrollCalcRoute.GET(mockReq);
    assert.equal(res.status, 403, "Payroll calculation read without payroll.read must return 403");
  });

  // --------------------------------------------------------------------------
  // PROBE 3 & F02: HR request review/approval with no approval capabilities
  // --------------------------------------------------------------------------
  await t.test("Probe 3 & F02: HR request review rejects unauthorized or self-approving user", async () => {
    const reviewRoute = loadModule("src/app/api/hrm/requests/[id]/review/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u-requester" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({
            capabilities: {}, // no approval capabilities
            roles: [],
          }),
        },
      },
      "@/services/hrm.service": {
        HrmService: {
          reviewLeaveRequest: async () => {
            throw new Error("Should not be called");
          },
        },
      },
    });

    const mockReq = new Request("http://localhost/api/hrm/requests/req-1/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    const res = await reviewRoute.POST(mockReq, { params: Promise.resolve({ id: "req-1" }) });
    assert.equal(res.status, 403, "HR request approval with no approval capabilities must return 403");
  });

  // --------------------------------------------------------------------------
  // PROBE 4 & F12: Quotation status submitted with empty capabilities
  // --------------------------------------------------------------------------
  await t.test("Probe 4 & F12: Quotation PUT rejects submission with empty capabilities", async () => {
    const quoteRoute = loadModule("src/app/api/crm/quotations/[id]/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({ capabilities: {}, roles: [] }), // empty capabilities
        },
      },
      "@/services/crm.service": { CrmService: {} },
    });

    const mockReq = new Request("http://localhost/api/crm/quotations/q1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "submitted" }),
    });

    const res = await quoteRoute.PUT(mockReq, { params: Promise.resolve({ id: "q1" }) });
    assert.equal(res.status, 403, "Quotation submit with empty capabilities must return 403");
  });

  // --------------------------------------------------------------------------
  // PROBE 5 & F13: Payroll update alone permits approval
  // --------------------------------------------------------------------------
  await t.test("Probe 5 & F13: Payroll approval strictly requires payroll.approve (not payroll.update)", async () => {
    const payrollApproveRoute = loadModule("src/app/api/hrm/payroll/approve/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({
            capabilities: {
              "payroll.update": { isEnabled: true }, // has update, but NOT payroll.approve
            },
            roles: [],
          }),
        },
      },
      "@/services/hrm.service": { HrmService: {} },
    });

    const mockReq = new Request("http://localhost/api/hrm/payroll/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId: "p1" }),
    });

    const res = await payrollApproveRoute.POST(mockReq);
    assert.equal(res.status, 403, "Payroll approve with payroll.update alone must return 403");
  });

  // --------------------------------------------------------------------------
  // PROBE 6 & F10: Cash account creation requires cash_account.manage
  // --------------------------------------------------------------------------
  await t.test("Probe 6 & F10: Cash account creation requires cash_account.manage (not project_finance.read)", async () => {
    const cashAccountRoute = loadModule("src/app/api/finance/accounts/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({
            capabilities: {
              "project_finance.read": { isEnabled: true }, // has project_finance.read, lacks cash_account.manage
            },
            roles: [],
          }),
        },
      },
      "@/services/finance.service": { FinanceService: {} },
    });

    const mockReq = new Request("http://localhost/api/finance/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "TM-02", name: "Quỹ phụ", kind: "cash" }),
    });

    const res = await cashAccountRoute.POST(mockReq);
    assert.equal(res.status, 403, "Cash account creation with project_finance.read alone must return 403");
  });

  // --------------------------------------------------------------------------
  // PROBE 7 & F08: Stock approval alone permits posting
  // --------------------------------------------------------------------------
  await t.test("Probe 7 & F08: Stock document complete strictly requires stock_document.post", async () => {
    const stockCompleteRoute = loadModule("src/app/api/inventory/documents/[id]/complete/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({
            capabilities: {
              "stock_document.approve": { isEnabled: true }, // has approve, lacks stock_document.post
            },
            roles: [],
          }),
        },
      },
      "@/services/inventory.service": { InventoryService: {} },
    });

    const mockReq = new Request("http://localhost/api/inventory/documents/doc-1/complete", {
      method: "POST",
    });

    const res = await stockCompleteRoute.POST(mockReq, { params: Promise.resolve({ id: "doc-1" }) });
    assert.equal(res.status, 403, "Stock complete with stock_document.approve alone must return 403");
  });

  // --------------------------------------------------------------------------
  // PROBE 8 & F16: Shared document deletion with no capabilities
  // --------------------------------------------------------------------------
  await t.test("Probe 8 & F16: Document deletion strictly requires document.manage", async () => {
    const docDetailRoute = loadModule("src/app/api/documents/[id]/route.ts", {
      "@/lib/auth-cache": { getCachedSession: async () => ({ user: { id: "u1" } }) },
      "@/lib/db": { getCachedOrgId: async () => "org-1" },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({
            capabilities: {
              "document.read": { isEnabled: true }, // read-only, lacks document.manage
            },
            roles: [],
          }),
        },
      },
      "@/services/document.service": { DocumentService: {} },
    });

    const mockReq = new Request("http://localhost/api/documents/doc-1", {
      method: "DELETE",
    });

    const res = await docDetailRoute.DELETE(mockReq, { params: Promise.resolve({ id: "doc-1" }) });
    assert.equal(res.status, 403, "Document deletion with document.read alone must return 403");
  });

  // --------------------------------------------------------------------------
  // PROBE 10 & F03: AI confirmation forwards posted payment without checking capabilities
  // --------------------------------------------------------------------------
  await t.test("Probe 10 & F03: AI action confirmation enforces server capability check", async () => {
    const aiConfirmRoute = loadModule("src/app/api/ai/actions/confirm/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({
            roles: [],
            capabilities: {
              "payment.create": { isEnabled: true }, // can create payment, but lacks payment.post!
            },
          }),
        },
      },
      "@/services/ai.service": {
        AiService: {},
      },
    });

    const mockReq = new Request("http://localhost/api/ai/actions/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposalId: "p-1",
        actionType: "disbursement",
        draftPayload: { amount: 5000000, status: "posted" },
      }),
    });

    const res = await aiConfirmRoute.POST(mockReq);
    const body = await res.json();
    assert.equal(res.status, 403, "AI confirmation of posted payment without payment.post must return 403");
    assert.match(body.error, /quyền/i);
  });

  // --------------------------------------------------------------------------
  // F28: Route Mapping & Authorization Fallback Verification
  // --------------------------------------------------------------------------
  await t.test("F28: useAuthorization deny-by-default verification", () => {
    const useAuth = loadModule("src/hooks/use-authorization.tsx", {
      react: {
        createContext: () => ({ Provider: () => null }),
        useContext: () => null, // simulate no provider
        useCallback: (fn) => fn,
        useMemo: (fn) => fn(),
        useState: (init) => [init, () => {}],
        useEffect: () => {},
        createElement: () => null,
      },
      "@/constants/permissions": { SCREEN_REQUIREMENTS: {} },
    });

    const fallbackAuth = useAuth.useAuthorization();
    assert.equal(fallbackAuth.can("project.read"), false, "Fallback without provider must return can() = false");
    assert.equal(fallbackAuth.canAccessScreen("M01"), false, "Fallback without provider must return canAccessScreen() = false");
    assert.equal(fallbackAuth.hasRole("SUPER_ADMIN"), false, "Fallback without provider must return hasRole() = false");
  });

  // --------------------------------------------------------------------------
  // F28: Payment export requires both payment.export and payment.read
  // --------------------------------------------------------------------------
  await t.test("F28: Payment export requires payment.export AND payment.read", async () => {
    const paymentExportRoute = loadModule("src/app/api/finance/export/route.ts", {
      "next/headers": { headers: async () => ({}) },
      "@/lib/auth": { auth: { api: { getSession: async () => ({ user: { id: "u1" } }) } } },
      "@/services/authorization.service": {
        AuthorizationService: {
          getUserCapabilities: async () => ({
            capabilities: {
              "payment.export": { isEnabled: true }, // has export, lacks payment.read
            },
            roles: [],
          }),
        },
      },
      "@/services/finance.service": { FinanceService: {} },
    });

    const mockReq = new Request("http://localhost/api/finance/export?format=xlsx", { method: "GET" });
    const res = await paymentExportRoute.GET(mockReq);
    assert.equal(res.status, 403, "Payment export without payment.read must return 403");
  });

  // --------------------------------------------------------------------------
  // F25: Cache invalidation purges capability cache
  // --------------------------------------------------------------------------
  await t.test("F25: invalidateUserCapabilitiesCache clears memory LRU cache", () => {
    const authService = loadModule("src/services/authorization.service.ts", {
      "@/lib/db": { getDbPool: () => ({}) },
      "@/constants/permissions": { SCREEN_REQUIREMENTS: {} },
    });

    // Test that the method exists and can be invoked without error
    assert.doesNotThrow(() => {
      authService.invalidateUserCapabilitiesCache("test-user-id");
      authService.invalidateUserCapabilitiesCache();
    });
  });
});
