export const roleCodes = [
  "system_admin",
  "security_admin",
  "records_officer",
  "department_staff",
  "department_head",
  "manager",
  "chairperson",
  "board_member",
  "finance_officer",
  "procurement_officer",
  "auditor_readonly",
  "member_service_officer",
];
export const rolePermissions = {
  system_admin: [
    "users:manage",
    "org:manage",
    "workflow:manage",
    "template:manage",
    "document:create",
    "meeting:create",
    "audit:read",
  ],
  security_admin: ["org:manage", "audit:read"],
  records_officer: [
    "document:create",
    "registry:assign",
    "retention:manage",
    "template:manage",
  ],
  department_staff: ["document:create"],
  department_head: ["document:create", "workflow:manage"],
  manager: ["document:create", "workflow:manage"],
  chairperson: ["document:create", "meeting:create"],
  board_member: ["meeting:create"],
  finance_officer: ["document:create"],
  procurement_officer: ["document:create"],
  member_service_officer: ["document:create"],
  auditor_readonly: ["audit:read"],
};
export function hasPermission(principal, permission, departmentId = null) {
  return principal.grants.some(
    (g) =>
      (!g.department_id || g.department_id === departmentId) &&
      (rolePermissions[g.role_code] || []).includes(permission),
  );
}
export function canAccess(principal, record, permission = "read", acl = []) {
  if (
    permission !== "read" &&
    !principal.grants.some(
      (g) =>
        g.role_code !== "auditor_readonly" &&
        rolePermissions[g.role_code] &&
        (!g.department_id || g.department_id === record.department_id),
    )
  )
    return false;
  if (record.owner_id === principal.id) return true;
  if (
    acl.some(
      (a) =>
        a.user_id === principal.id &&
        (a.permission === permission ||
          (permission === "read" &&
            ["write", "manage", "approve"].includes(a.permission))),
    )
  )
    return true;
  return (
    permission === "read" &&
    record.classification === "internal" &&
    record.department_id &&
    principal.departments.includes(record.department_id)
  );
}
export function requireFresh(session, now = Date.now()) {
  if (!session.reauthAt || now - session.reauthAt > 300000)
    throw problem(403, "กรุณายืนยันตัวตนซ้ำด้วย Google ก่อนทำรายการ");
}
export function requireAssurance(record, session, now = Date.now()) {
  requireFresh(session, now);
  // No provider-attested MFA policy has been configured. Fail closed for high-risk records.
  if (
    record.classification === "confidential" ||
    ["finance", "procurement", "member", "board"].includes(record.category)
  )
    throw problem(
      403,
      "เอกสารสำคัญต้องใช้นโยบายยืนยันตัวตนระดับสูงที่ได้รับอนุมัติ ยังไม่เปิดใช้ใน TEST นี้",
    );
}
export function problem(status, message) {
  return Object.assign(new Error(message), { status });
}
export const editableStates = new Set(["draft", "returned"]);
