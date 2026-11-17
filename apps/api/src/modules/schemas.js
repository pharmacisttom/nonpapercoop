import { z } from "zod";
import { roleCodes } from "./policy.js";
export const uuid = z.uuid();
export const reason = z.string().trim().min(3).max(1000);
export const expectedVersion = z.number().int().positive();
export const departmentSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_-]{1,30}$/),
    name: z.string().trim().min(1).max(150),
  })
  .strict();
export const grantSchema = z
  .object({
    userId: uuid,
    role: z.enum(roleCodes),
    departmentId: uuid.nullable().default(null),
  })
  .strict();
export const documentSchema = z
  .object({
    title: z.string().trim().min(1).max(250),
    category: z.enum([
      "general",
      "saraban",
      "board",
      "finance",
      "procurement",
      "member",
    ]),
    departmentId: uuid.nullable().default(null),
    classification: z
      .enum(["internal", "restricted", "confidential"])
      .default("internal"),
    description: z.string().max(10000).default(""),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    domain: z
      .record(
        z.string(),
        z.union([
          z.string().max(1000),
          z.number().finite(),
          z.boolean(),
          z.null(),
        ]),
      )
      .default({}),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      ["finance", "procurement", "member", "board"].includes(v.category) &&
      v.classification === "internal"
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Sensitive domain requires restricted/confidential classification",
        path: ["classification"],
      });
    const allowed = {
      general: [],
      saraban: ["direction", "sender", "recipient"],
      finance: ["amount", "currency", "budgetReference", "purpose"],
      procurement: [
        "amount",
        "currency",
        "vendorReference",
        "method",
        "contractReference",
      ],
      member: ["testSubjectReference", "requestType", "purpose"],
      board: ["meetingReference", "purpose"],
    };
    for (const k of Object.keys(v.domain))
      if (!allowed[v.category].includes(k))
        ctx.addIssue({
          code: "custom",
          message: "Unknown domain field",
          path: ["domain", k],
        });
    if (
      ["finance", "procurement"].includes(v.category) &&
      v.domain.amount !== undefined &&
      (typeof v.domain.amount !== "number" || v.domain.amount < 0)
    )
      ctx.addIssue({
        code: "custom",
        message: "Invalid amount",
        path: ["domain", "amount"],
      });
  });
export const workflowSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_-]{1,40}$/),
    name: z.string().trim().min(1).max(150),
    version: expectedVersion,
    steps: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(100),
            mode: z.enum(["all", "any"]),
            assignees: z
              .array(uuid)
              .min(1)
              .max(20)
              .refine((a) => new Set(a).size === a.length),
            dueHours: z.number().int().min(1).max(8760),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
export const meetingSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    startsAt: z.iso.datetime({ offset: true }),
    location: z.string().max(200),
    quorum: z.number().int().min(1).max(500),
    votingRule: z.enum(["majority_of_eligible", "unanimous_eligible"]),
    attendees: z
      .array(uuid)
      .min(1)
      .max(500)
      .refine((a) => new Set(a).size === a.length),
  })
  .strict()
  .refine((v) => v.quorum <= v.attendees.length, {
    message: "Quorum exceeds invitees",
  });
