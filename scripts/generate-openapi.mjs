import fs from "node:fs";
import { z } from "zod";
import {
  documentSchema,
  workflowSchema,
  meetingSchema,
  departmentSchema,
  grantSchema,
} from "../apps/api/src/modules/schemas.js";
const paths = {};
const source =
  fs.readFileSync("apps/api/src/app.js", "utf8") +
  "\n" +
  fs.readFileSync("apps/api/src/modules/routes.js", "utf8");
for (const match of source.matchAll(
  /(?:app|router)\.(get|post|patch|delete)\(\s*["']([^"']+)["']/g,
)) {
  const method = match[1];
  let route = match[2];
  if (route.startsWith("/api/v1")) route = route.slice(7);
  else if (match[0].startsWith("app.")) continue;
  if (!route || route.includes("/vendor")) continue;
  if (route === "/tasks/:id/") continue;
  const apiPath = route.replace(/:([A-Za-z]+)/g, "{$1}");
  const parameters = [...apiPath.matchAll(/\{([^}]+)\}/g)].map((m) => ({
    name: m[1],
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  }));
  if (method !== "get")
    parameters.push(
      {
        name: "X-CSRF-Token",
        in: "header",
        required: true,
        schema: { type: "string" },
      },
      {
        name: "Origin",
        in: "header",
        required: true,
        schema: { type: "string", format: "uri" },
      },
    );
  const publicRoute = [
    "/auth/google/start",
    "/auth/google/callback",
    "/auth/logout",
    "/health",
  ].includes(apiPath);
  (paths[apiPath] ??= {})[method] = {
    summary: method.toUpperCase() + " " + apiPath,
    operationId: method + apiPath.replace(/[^a-zA-Z]/g, ""),
    parameters,
    security: publicRoute ? [] : [{ sessionCookie: [] }],
    responses: Object.fromEntries(
      [200, 201, 400, 401, 403, 404, 409, 413, 429, 500, 503].map((status) => [
        String(status),
        {
          description:
            status < 300
              ? "Operation confirmed by backend"
              : status === 403
                ? "CSRF, scope, maker-checker, reauthentication or assurance denied"
                : status === 409
                  ? "Conflict, stale version, state, duplicate key or integrity mismatch"
                  : "Safe HTTP error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Envelope" },
            },
          },
        },
      ]),
    ),
  };
}
for (const action of ["approve", "reject", "return"])
  paths["/tasks/{id}/" + action] = {
    post: {
      ...paths["/documents/{id}/cancel"].post,
      summary:
        "Assigned checker " +
        action +
        "; immutable action, state/version and assurance checks",
      operationId: "task" + action,
      parameters: [
        ...paths["/documents/{id}/cancel"].post.parameters,
        {
          name: "Idempotency-Key",
          in: "header",
          required: true,
          schema: { type: "string", minLength: 16, maxLength: 100 },
        },
      ],
    },
  };
const schemas = {
  Envelope: {
    type: "object",
    required: ["success", "data", "meta", "error", "requestId"],
    properties: {
      success: { type: "boolean" },
      data: {},
      meta: {},
      error: {},
      requestId: { type: "string" },
    },
  },
  Document: z.toJSONSchema(documentSchema, { io: "input" }),
  DocumentUpdate: z.toJSONSchema(
    documentSchema.safeExtend({ version: z.number().int().positive() }),
  ),
  Workflow: z.toJSONSchema(workflowSchema, { io: "input" }),
  Meeting: z.toJSONSchema(meetingSchema, { io: "input" }),
  Department: z.toJSONSchema(departmentSchema, { io: "input" }),
  Grant: z.toJSONSchema(grantSchema, { io: "input" }),
};
for (const [path, method, schema] of [
  ["/documents", "post", "Document"],
  ["/documents/{id}", "patch", "DocumentUpdate"],
  ["/workflows/definitions", "post", "Workflow"],
  ["/meetings", "post", "Meeting"],
  ["/departments", "post", "Department"],
  ["/organization/grants", "post", "Grant"],
])
  if (paths[path]?.[method])
    paths[path][method].requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/" + schema },
        },
      },
    };
for (const path of ["/documents", "/repository/search"])
  paths[path].get.parameters.push(
    ...[
      { name: "q", schema: { type: "string", maxLength: 200 } },
      { name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
      {
        name: "pageSize",
        schema: { type: "integer", minimum: 1, maximum: 200, default: 25 },
      },
      { name: "folderId", schema: { type: "string", format: "uuid" } },
      { name: "category", schema: { type: "string" } },
      { name: "state", schema: { type: "string" } },
    ].map((p) => ({ ...p, in: "query" })),
  );
paths["/documents/{id}/files"].post.requestBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["file"],
        properties: {
          file: {
            type: "string",
            format: "binary",
            description:
              "PDF or UTF8 text, max10MiB; remains quarantined unless ClamAV confirms clean",
          },
        },
      },
    },
  },
};
paths["/documents/{id}/files"].post.parameters.push({
  name: "X-Document-Version",
  in: "header",
  required: true,
  schema: { type: "integer", minimum: 1 },
});
for (const path of [
  "/documents/{id}/submit",
  "/documents/{id}/register",
  "/documents/{id}/signing/confirm",
  "/documents/{id}/signing/request",
])
  paths[path].post.parameters.push({
    name: "Idempotency-Key",
    in: "header",
    required: true,
    schema: { type: "string", minLength: 16, maxLength: 100 },
  });
paths["/reports/export.csv"].get.responses["200"] = {
  description:
    "UTF8 CSV with BOM, permission-filtered, maximum200 rows; spreadsheet formula prefixes neutralized",
  content: { "text/csv": { schema: { type: "string" } } },
};
paths["/documents/{id}/files/{fileId}/download"].get.responses["200"] = {
  description:
    "Authorized clean file, attachment only, verified digest and encrypted-storage authentication",
  content: {
    "application/pdf": { schema: { type: "string", format: "binary" } },
    "text/plain": { schema: { type: "string" } },
  },
};
const spec = {
  openapi: "3.1.0",
  info: {
    title: "NonPaperCoop isolated TEST API",
    version: "0.2.0",
    description:
      "Google-only GIS/OIDC identity, local authorization. High-risk approval/signing/export fails closed without approved provider-attested assurance. Signing endpoints record electronic intent/digest evidence, not cryptographic PDF signatures or trusted timestamps. All CRUD requires backend authorization; unknown resources are denied. Business constraints enforced by Zod and services; operation-specific schemas remain authoritative in modules/routes.js.",
  },
  servers: [{ url: "/api/v1" }],
  paths,
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "__Host-npc.sid",
        description:
          "Opaque server session; loopback HTTP TEST uses npc.test.sid",
      },
    },
    schemas,
  },
};
fs.writeFileSync("docs/api/openapi.yaml", JSON.stringify(spec, null, 2) + "\n");
console.log("OpenAPI inventory generated:", Object.keys(paths).length, "paths");
