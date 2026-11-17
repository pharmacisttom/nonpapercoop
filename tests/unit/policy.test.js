import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canAccess,
  hasPermission,
  requireAssurance,
} from "../../apps/api/src/modules/policy.js";
const doc = {
  owner_id: "maker",
  department_id: "B",
  classification: "confidential",
  category: "general",
};
test("admin is not an implicit confidential reader", () =>
  assert.equal(
    canAccess(
      { id: "admin", grants: [{ role_code: "system_admin" }], departments: [] },
      doc,
    ),
    false,
  ));
test("auditor cannot write owned documents, scoped role cannot write in another department", () => {
  const p = {
    id: "maker",
    grants: [
      { role_code: "auditor_readonly" },
      { role_code: "department_staff", department_id: "A" },
    ],
    departments: ["A"],
  };
  assert.equal(canAccess(p, doc, "write"), false);
  assert.equal(canAccess(p, { ...doc, department_id: "A" }, "write"), true);
});
test("scoped organizational role does not grant global administration", () =>
  assert.equal(
    hasPermission(
      { grants: [{ role_code: "system_admin", department_id: "A" }] },
      "org:manage",
    ),
    false,
  ));
test("fresh Google reauthentication never silently satisfies high-risk assurance", () =>
  assert.throws(
    () => requireAssurance(doc, { reauthAt: Date.now() }),
    (e) => e.status === 403,
  ));
