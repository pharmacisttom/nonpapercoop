// In-memory test double only. Never imported by the runtime server.
import { randomUUID } from "node:crypto";
export class TestRepository {
  usersData = new Map();
  docs = new Map();
  events = [];
  nonces = new Set();
  verifiedRequests = new Map();
  constructor() {
    for (const [sub, role] of [
      ["1001", "system_admin"],
      ["1002", "department_staff"],
      ["1003", "department_staff"],
      ["1004", "auditor_readonly"],
    ]) {
      const id = randomUUID();
      this.usersData.set(id, {
        id,
        sub,
        role,
        email: sub + "@example.invalid",
        status: "active",
        session_version: 1,
      });
    }
  }
  async consumeNonce(n) {
    if (this.nonces.has(n)) return false;
    this.nonces.add(n);
    return true;
  }
  async user(id) {
    return this.usersData.get(id);
  }
  async recordVerifiedRequest(identity) {
    if (![...this.usersData.values()].some((u) => u.sub === identity.sub))
      this.verifiedRequests.set(identity.sub, { ...identity });
  }
  async login(identity) {
    return [...this.usersData.values()].find(
      (u) => u.sub === identity.sub && u.status === "active",
    );
  }
  async event(actor, action, target) {
    this.events.push({ actor, action, target });
  }
  async users() {
    return [...this.usersData.values()];
  }
  async createUser(actor, d) {
    if (
      [...this.usersData.values()].some(
        (u) => u.email === d.email || u.sub === d.googleSub,
      )
    )
      throw Object.assign(new Error("Duplicate"), { code: "ER_DUP_ENTRY" });
    const u = {
      id: randomUUID(),
      ...d,
      sub: d.googleSub,
      status: "active",
      session_version: 1,
    };
    this.usersData.set(u.id, u);
    await this.event(actor, "user.allow", u.id);
    return u;
  }
  async updateUser(actor, id, d) {
    const u = await this.user(id);
    if (!u) return false;
    Object.assign(u, d, { session_version: u.session_version + 1 });
    await this.event(actor, "user.update", id);
    return true;
  }
  async revoke(actor, id) {
    const u = await this.user(id);
    if (!u) return false;
    u.session_version++;
    await this.event(actor, "session.revoke", id);
    return true;
  }
  async documents(u) {
    return [...this.docs.values()].filter(
      (d) => d.owner_id === u.id && !d.deleted,
    );
  }
  async createDocument(actor, d) {
    const doc = {
      id: randomUUID(),
      ...d,
      owner_id: actor,
      status: "draft",
      version: 1,
    };
    this.docs.set(doc.id, doc);
    await this.event(actor, "document.create", doc.id);
    return doc;
  }
  async changeDocument(u, id, d, remove) {
    const doc = this.docs.get(id);
    if (!doc || doc.deleted || doc.owner_id !== u.id) return "missing";
    if (doc.version !== d.version) return "conflict";
    if (remove) doc.deleted = true;
    else Object.assign(doc, { title: d.title, category: d.category });
    doc.version++;
    await this.event(u.id, remove ? "document.delete" : "document.update", id);
    return "ok";
  }
}
