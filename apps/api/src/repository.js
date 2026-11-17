import { randomUUID, createHash } from "node:crypto";
export class Repository {
  constructor(pool) {
    this.pool = pool;
  }
  async transaction(fn) {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      const result = await fn(c);
      await c.commit();
      return result;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
  async consumeNonce(nonce) {
    try {
      await this.pool.execute(
        "INSERT INTO auth_nonces (nonce_hash) VALUES (?)",
        [createHash("sha256").update(nonce).digest("hex")],
      );
      return true;
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") return false;
      throw e;
    }
  }
  async user(id) {
    const [r] = await this.pool.execute(
      "SELECT id, email, role, status, session_version FROM users WHERE id=?",
      [id],
    );
    return r[0];
  }
  async recordVerifiedRequest(identity) {
    // Called only after server-side Google signature and claims validation.
    // Existing suspended/revoked identities cannot re-enroll to regain access.
    await this.pool.execute(
      "INSERT INTO verified_access_requests (google_sub,verified_email) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM google_identities WHERE google_sub=?) ON DUPLICATE KEY UPDATE verified_email=VALUES(verified_email),verified_at=CURRENT_TIMESTAMP",
      [identity.sub, identity.email, identity.sub],
    );
  }
  async bootstrapVerifiedAdmin(email) {
    return this.transaction(async (c) => {
      const [admins] = await c.execute(
        "SELECT id FROM users WHERE role='system_admin' FOR UPDATE",
      );
      if (admins.length)
        throw new Error("Administrator already exists; use audited admin UI");
      const [requests] = await c.execute(
        "SELECT google_sub,verified_email FROM verified_access_requests WHERE verified_email=? AND verified_at>=DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 MINUTE) FOR UPDATE",
        [email],
      );
      if (requests.length !== 1)
        throw new Error(
          "Exactly one recent verified Google identity is required",
        );
      const request = requests[0],
        id = randomUUID();
      await c.execute(
        "INSERT INTO users (id,email,role,status) VALUES (?,?,?,?)",
        [id, request.verified_email, "system_admin", "active"],
      );
      await c.execute(
        "INSERT INTO google_identities (google_sub,user_id) VALUES (?,?)",
        [request.google_sub, id],
      );
      await this.audit(c, null, "user.bootstrap-approved-admin", id);
      return { id, email: request.verified_email };
    });
  }
  async login(identity) {
    return this.transaction(async (c) => {
      const [r] = await c.execute(
        "SELECT u.* FROM google_identities g JOIN users u ON u.id=g.user_id WHERE g.google_sub=? FOR UPDATE",
        [identity.sub],
      );
      let u = r[0];
      if (!u) return null;
      if (u.status !== "active") return null;
      await this.audit(c, u.id, "auth.login", u.id);
      return u;
    });
  }
  async audit(c, actor, action, target) {
    await c.execute(
      "INSERT INTO audit_events (id,actor_id,action,target_id) VALUES (?,?,?,?)",
      [randomUUID(), actor, action, target],
    );
  }
  async event(actor, action, target) {
    await this.audit(this.pool, actor, action, target);
  }
  async users() {
    const [r] = await this.pool.execute(
      "SELECT id,email,role,status,session_version FROM users ORDER BY email LIMIT 200",
    );
    return r;
  }
  async createUser(actor, data) {
    return this.transaction(async (c) => {
      const id = randomUUID();
      await c.execute(
        "INSERT INTO users (id,email,role,status) VALUES (?,?,?,?)",
        [id, data.email, data.role, "active"],
      );
      await c.execute(
        "INSERT INTO google_identities (google_sub,user_id) VALUES (?,?)",
        [data.googleSub, id],
      );
      await this.audit(c, actor, "user.allow", id);
      return { id, ...data, status: "active" };
    });
  }
  async updateUser(actor, id, data) {
    return this.transaction(async (c) => {
      const [r] = await c.execute(
        "UPDATE users SET role=?,status=?,session_version=session_version+1 WHERE id=?",
        [data.role, data.status, id],
      );
      if (!r.affectedRows) return false;
      await this.audit(c, actor, "user.update", id);
      return true;
    });
  }
  async revoke(actor, id) {
    return this.transaction(async (c) => {
      const [r] = await c.execute(
        "UPDATE users SET session_version=session_version+1 WHERE id=?",
        [id],
      );
      if (!r.affectedRows) return false;
      await this.audit(c, actor, "session.revoke", id);
      return true;
    });
  }
  async documents(user) {
    const [r] = await this.pool.execute(
      "SELECT id,title,category,owner_id,status,version,created_at FROM documents WHERE deleted_at IS NULL AND owner_id=? ORDER BY created_at DESC LIMIT 200",
      [user.id],
    );
    return r;
  }
  async createDocument(actor, data) {
    return this.transaction(async (c) => {
      const id = randomUUID();
      await c.execute(
        "INSERT INTO documents (id,title,category,owner_id) VALUES (?,?,?,?)",
        [id, data.title, data.category, actor],
      );
      await this.audit(c, actor, "document.create", id);
      return { id, ...data, owner_id: actor, status: "draft", version: 1 };
    });
  }
  async changeDocument(user, id, data, remove = false) {
    return this.transaction(async (c) => {
      const [r] = await c.execute(
        "SELECT * FROM documents WHERE id=? AND deleted_at IS NULL FOR UPDATE",
        [id],
      );
      const d = r[0];
      if (!d || d.owner_id !== user.id) return "missing";
      if (d.version !== data.version || d.status !== "draft") return "conflict";
      if (remove)
        await c.execute(
          "UPDATE documents SET deleted_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?",
          [id],
        );
      else
        await c.execute(
          "UPDATE documents SET title=?,category=?,version=version+1 WHERE id=?",
          [data.title, data.category, id],
        );
      await this.audit(
        c,
        user.id,
        remove ? "document.delete" : "document.update",
        id,
      );
      return "ok";
    });
  }
}
