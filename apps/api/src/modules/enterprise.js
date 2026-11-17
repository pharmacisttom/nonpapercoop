import { randomUUID } from "node:crypto";
import {
  hasPermission,
  canAccess,
  problem,
  editableStates,
  requireAssurance,
  requireFresh,
} from "./policy.js";
import { sha256, inspectUpload, normalizeFilename } from "./storage.js";
const json = (v) => (typeof v === "string" ? JSON.parse(v) : v);
export const canonical = (value) =>
  JSON.stringify(
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, JSON.parse(canonical(value[k]))]),
        )
      : Array.isArray(value)
        ? value.map((v) => JSON.parse(canonical(v)))
        : value,
  );
const selectRecord = `SELECT d.*,COALESCE(c.classification,'internal') AS classification,c.department_id,COALESCE(c.state,d.status) AS state,COALESCE(c.description,'') AS description,c.tags_json,c.domain_json,COALESCE(c.current_revision,1) AS current_revision,c.retention_until FROM documents d LEFT JOIN document_controls c ON c.document_id=d.id`;
const visible = `(d.owner_id=? OR EXISTS(SELECT 1 FROM document_acl a WHERE a.document_id=d.id AND a.user_id=?) OR (c.classification='internal' AND EXISTS(SELECT 1 FROM department_memberships m JOIN departments dep ON dep.id=m.department_id AND dep.active=TRUE WHERE m.user_id=? AND m.department_id=c.department_id)) OR EXISTS(SELECT 1 FROM document_group_acl ga JOIN group_memberships gm ON gm.group_id=ga.group_id JOIN organization_groups og ON og.id=gm.group_id AND og.active=TRUE WHERE ga.document_id=d.id AND gm.user_id=?))`;
export class Enterprise {
  constructor(repo, { storage = null, clock = Date.now } = {}) {
    this.repo = repo;
    this.pool = repo.pool;
    this.storage = storage;
    this.clock = clock;
  }
  async tx(fn) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.repo.transaction(fn);
      } catch (e) {
        if (
          !["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(e.code) ||
          attempt >= 2
        )
          throw e;
      }
    }
  }
  async principal(c, user, lock = false) {
    const [r] = await c.execute(
      "SELECT id,email,role,status,session_version FROM users WHERE id=?" +
        (lock ? " FOR UPDATE" : ""),
      [user.id],
    );
    const u = r[0];
    if (
      !u ||
      u.status !== "active" ||
      (user.session_version !== undefined &&
        user.session_version !== u.session_version)
    )
      throw problem(401, "Session ถูกเพิกถอน");
    const [grants] = await c.execute(
      "SELECT role_code,department_id FROM user_grants WHERE user_id=? AND active=TRUE",
      [u.id],
    );
    const [members] = await c.execute(
      "SELECT m.department_id FROM department_memberships m JOIN departments d ON d.id=m.department_id AND d.active=TRUE WHERE m.user_id=?",
      [u.id],
    );
    return {
      ...u,
      grants: [{ role_code: u.role, department_id: null }, ...grants],
      departments: members.map((m) => m.department_id),
    };
  }
  async mutation(user, fn) {
    return this.tx(async (c) => {
      const p = await this.principal(c, user, true);
      if (p.grants.every((g) => g.role_code === "auditor_readonly"))
        throw problem(403, "ผู้ตรวจสอบมีสิทธิ์อ่านเท่านั้น");
      return fn(c, p);
    });
  }
  require(p, permission, department = null) {
    if (!hasPermission(p, permission, department))
      throw problem(403, "ไม่มีสิทธิ์ทำรายการนี้");
  }
  async event(c, actor, action, documentId = null, payload = {}) {
    const [rows] = await c.query(
      "SELECT sequence_no,chain_hash FROM domain_audit_head WHERE id=1 FOR UPDATE",
    );
    const head = rows[0],
      sequence = Number(head.sequence_no) + 1,
      id = randomUUID();
    const body = { sequence, eventId: id, actor, documentId, action, payload };
    const digest = sha256(head.chain_hash + canonical(body));
    await c.execute(
      "INSERT INTO domain_events(sequence_no,event_id,actor_id,document_id,action,payload_json,previous_hash,chain_hash) VALUES (?,?,?,?,?,?,?,?)",
      [
        sequence,
        id,
        actor,
        documentId,
        action,
        canonical(payload),
        head.chain_hash,
        digest,
      ],
    );
    await c.execute(
      "UPDATE domain_audit_head SET sequence_no=?,chain_hash=? WHERE id=1",
      [sequence, digest],
    );
    await this.repo.audit(c, actor, action, documentId);
  }
  async read(c, p, id, permission = "read", lock = false) {
    const [rows] = await c.execute(
      selectRecord +
        " WHERE d.id=? AND d.deleted_at IS NULL" +
        (lock ? " FOR UPDATE" : ""),
      [id],
    );
    const r = rows[0];
    if (!r) throw problem(404, "ไม่พบเอกสาร");
    const [acl] = await c.execute(
      "SELECT user_id,permission FROM document_acl WHERE document_id=? UNION ALL SELECT gm.user_id,ga.permission FROM document_group_acl ga JOIN group_memberships gm ON gm.group_id=ga.group_id JOIN organization_groups g ON g.id=gm.group_id AND g.active=TRUE WHERE ga.document_id=?",
      [id, id],
    );
    if (!canAccess(p, r, permission, acl)) throw problem(404, "ไม่พบเอกสาร");
    return {
      ...r,
      version: Number(r.version),
      current_revision: Number(r.current_revision),
      tags: json(r.tags_json) || [],
      domain: json(r.domain_json) || {},
    };
  }
  version(r, v) {
    if (r.version !== v) throw problem(409, "เอกสารถูกเปลี่ยนแปลง กรุณาโหลดใหม่");
  }
  async activeUsers(c, ids) {
    if (!ids.length) return;
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await c.execute(
      `SELECT id FROM users WHERE id IN (${placeholders}) AND status='active'`,
      ids,
    );
    if (rows.length !== new Set(ids).size)
      throw problem(400, "มีผู้ใช้ที่ไม่พร้อมใช้งาน");
  }
  async ensureControls(c, r) {
    await c.execute(
      "INSERT IGNORE INTO document_controls(document_id,description,tags_json,domain_json) VALUES (?,'','[]','{}')",
      [r.id],
    );
  }
  metadata(r) {
    return {
      title: r.title,
      category: r.category,
      departmentId: r.department_id || null,
      classification: r.classification,
      description: r.description || "",
      tags: r.tags || [],
      domain: r.domain || {},
    };
  }
  async snapshot(c, r, actor) {
    const meta = canonical(this.metadata(r));
    await c.execute(
      "INSERT INTO document_revisions(id,document_id,revision_no,metadata_json,sha256,created_by) VALUES (?,?,?,?,?,?)",
      [randomUUID(), r.id, r.current_revision, meta, sha256(meta), actor],
    );
  }
  async setState(c, r, state) {
    const transitions = {
      draft: ["submitted", "cancelled"],
      submitted: ["in_review", "cancelled"],
      in_review: ["approved", "returned", "rejected", "cancelled"],
      returned: ["draft", "cancelled"],
      approved: ["signing_pending"],
      signing_pending: ["signed"],
      signed: ["registered"],
      registered: ["distributed", "archived"],
      distributed: ["distributed", "archived"],
    };
    if (!(transitions[r.state] || []).includes(state))
      throw problem(409, "ไม่อนุญาตให้เปลี่ยนสถานะเอกสารตามขั้นตอนนี้");
    const legacy =
      {
        draft: "draft",
        returned: "returned",
        in_review: "submitted",
        rejected: "rejected",
      }[state] || "approved";
    await c.execute(
      "UPDATE document_controls SET state=?,updated_at=CURRENT_TIMESTAMP(6) WHERE document_id=?",
      [state, r.id],
    );
    await c.execute(
      "UPDATE documents SET status=?,version=version+1 WHERE id=?",
      [legacy, r.id],
    );
    r.state = state;
    r.version++;
  }
  async idem(c, actor, scope, key, body, fn) {
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(key || ""))
      throw problem(400, "ต้องมี Idempotency-Key ยาว 16–100 ตัวอักษร");
    const hash = sha256(canonical(body));
    const [r] = await c.execute(
      "SELECT request_hash,response_json FROM idempotency_keys WHERE actor_id=? AND scope=? AND idem_key=?",
      [actor, scope, key],
    );
    if (r.length) {
      if (r[0].request_hash !== hash)
        throw problem(409, "Idempotency-Key ถูกใช้กับข้อมูลอื่นแล้ว");
      return json(r[0].response_json);
    }
    const result = await fn();
    await c.execute(
      "INSERT INTO idempotency_keys(actor_id,scope,idem_key,request_hash,response_json) VALUES (?,?,?,?,?)",
      [actor, scope, key, hash, canonical(result)],
    );
    return result;
  }
  async list(
    user,
    {
      q = "",
      category = "",
      state = "",
      folderId = "",
      page = 1,
      pageSize = 25,
    } = {},
  ) {
    const p = await this.principal(this.pool, user);
    const conditions = ["d.deleted_at IS NULL", visible],
      args = [p.id, p.id, p.id, p.id];
    if (q) {
      conditions.push("(d.title LIKE ? OR c.description LIKE ?)");
      const pattern = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
      args.push(pattern, pattern);
    }
    if (category) {
      conditions.push("d.category=?");
      args.push(category);
    }
    if (state) {
      conditions.push("COALESCE(c.state,d.status)=?");
      args.push(state);
    }
    if (folderId) {
      conditions.push(
        "EXISTS(SELECT 1 FROM document_folders df JOIN repository_folders rf ON rf.id=df.folder_id AND rf.active=TRUE WHERE df.document_id=d.id AND rf.owner_id=? AND rf.id=?)",
      );
      args.push(p.id, folderId);
    }
    const where = conditions.join(" AND ");
    const [count] = await this.pool.execute(
      "SELECT COUNT(*) AS total FROM documents d LEFT JOIN document_controls c ON c.document_id=d.id WHERE " +
        where,
      args,
    );
    const [rows] = await this.pool.query(
      selectRecord +
        " WHERE " +
        where +
        " ORDER BY d.created_at DESC,d.id LIMIT ? OFFSET ?",
      [...args, pageSize, (page - 1) * pageSize],
    );
    await this.repo.event(p.id, "document.search", null);
    return {
      items: rows.map((r) => ({
        ...r,
        tags: json(r.tags_json) || [],
        domain: json(r.domain_json) || {},
      })),
      total: Number(count[0].total),
      page,
      pageSize,
    };
  }
  async get(user, id) {
    const p = await this.principal(this.pool, user),
      r = await this.read(this.pool, p, id);
    const [files] = await this.pool.execute(
      "SELECT id,original_name,media_type,byte_size,sha256,scan_status,revision_no FROM document_files WHERE document_id=? ORDER BY created_at",
      [id],
    );
    const [versions] = await this.pool.execute(
      "SELECT revision_no,sha256,created_at,created_by FROM document_revisions WHERE document_id=? ORDER BY revision_no DESC",
      [id],
    );
    const [acl] = await this.pool.execute(
      "SELECT a.user_id,u.email,a.permission FROM document_acl a JOIN users u ON u.id=a.user_id WHERE document_id=?",
      [id],
    );
    await this.repo.event(user.id, "document.view", id);
    const [groupAcl] = await this.pool.execute(
      "SELECT a.group_id,g.name,a.permission FROM document_group_acl a JOIN organization_groups g ON g.id=a.group_id WHERE a.document_id=?",
      [id],
    );
    const [legalHolds] = await this.pool.execute(
      "SELECT id,reason,active,created_at FROM legal_holds WHERE document_id=? ORDER BY created_at",
      [id],
    );
    const [disposals] = await this.pool.execute(
      "SELECT id,reason,state,requested_by FROM disposal_requests WHERE document_id=? ORDER BY created_at",
      [id],
    );
    const [groupWrite] = await this.pool.execute(
      "SELECT 1 FROM document_group_acl a JOIN organization_groups g ON g.id=a.group_id AND g.active=TRUE JOIN group_memberships m ON m.group_id=g.id WHERE a.document_id=? AND m.user_id=? AND a.permission='write' LIMIT 1",
      [id, p.id],
    );
    const canWrite = canAccess(p, r, "write", [
      ...acl,
      ...(groupWrite.length ? [{ user_id: p.id, permission: "write" }] : []),
    ]);
    return {
      ...r,
      files,
      versions,
      acl,
      groupAcl,
      legalHolds,
      disposals,
      canWrite,
    };
  }
  async create(user, data) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "document:create", data.departmentId);
      if (data.departmentId && !p.departments.includes(data.departmentId))
        throw problem(403, "ต้องเป็นสมาชิกฝ่ายที่สร้างเอกสาร");
      const id = randomUUID();
      await c.execute(
        "INSERT INTO documents(id,title,category,owner_id) VALUES (?,?,?,?)",
        [id, data.title, data.category, p.id],
      );
      await c.execute(
        "INSERT INTO document_controls(document_id,department_id,classification,description,tags_json,domain_json) VALUES (?,?,?,?,?,?)",
        [
          id,
          data.departmentId,
          data.classification,
          data.description,
          canonical(data.tags),
          canonical(data.domain),
        ],
      );
      const r = await this.read(c, p, id);
      await this.snapshot(c, r, p.id);
      await this.event(c, p.id, "document.create", id, { version: 1 });
      return r;
    });
  }
  async update(user, id, data, version, remove = false) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "write", true);
      this.version(r, version);
      if (!editableStates.has(r.state))
        throw problem(409, "แก้ไขได้เฉพาะร่างหรือเอกสารส่งกลับ");
      await this.ensureControls(c, r);
      if (remove) {
        const [holds] = await c.execute(
          "SELECT id FROM legal_holds WHERE document_id=? AND active=TRUE",
          [id],
        );
        if (holds.length) throw problem(409, "เอกสารถูกระงับการทำลาย");
        await c.execute(
          "UPDATE documents SET deleted_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?",
          [id],
        );
        await this.event(c, p.id, "document.delete", id);
        return { ok: true };
      }
      if (data.departmentId && !p.departments.includes(data.departmentId))
        throw problem(403, "ไม่มีสิทธิ์ย้ายเอกสารเข้าฝ่ายนี้");
      await c.execute(
        "UPDATE documents SET title=?,category=?,status=?,version=version+1 WHERE id=?",
        [data.title, data.category, "draft", id],
      );
      await c.execute(
        "UPDATE document_controls SET department_id=?,classification=?,description=?,tags_json=?,domain_json=?,state='draft',current_revision=current_revision+1,updated_at=CURRENT_TIMESTAMP(6) WHERE document_id=?",
        [
          data.departmentId,
          data.classification,
          data.description,
          canonical(data.tags),
          canonical(data.domain),
          id,
        ],
      );
      const updated = await this.read(c, p, id);
      await this.snapshot(c, updated, p.id);
      await this.event(c, p.id, "document.revise", id, {
        version: updated.version,
        revision: updated.current_revision,
      });
      return updated;
    });
  }
  async share(user, id, { userId, permission }, session) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "manage", true);
      if (r.owner_id !== p.id) throw problem(403, "เฉพาะเจ้าของเอกสารจัดการสิทธิ์");
      requireFresh(session, this.clock());
      await this.activeUsers(c, [userId]);
      await c.execute(
        "INSERT IGNORE INTO document_acl(document_id,user_id,permission,granted_by) VALUES (?,?,?,?)",
        [id, userId, permission, p.id],
      );
      await this.event(c, p.id, "document.share", id, {
        grantee: userId,
        permission,
      });
      return { ok: true };
    });
  }
  async upload(user, id, file, version) {
    file.originalname = normalizeFilename(file.originalname);
    if (!this.storage) throw problem(503, "ยังไม่ได้ตั้งค่าที่เก็บไฟล์เข้ารหัส");
    const media = inspectUpload(file.buffer, file.originalname, file.mimetype);
    // Authorize before writing bytes; recheck under lock below.
    const p = await this.principal(this.pool, user),
      r = await this.read(this.pool, p, id, "write");
    this.version(r, version);
    if (!editableStates.has(r.state)) throw problem(409, "เอกสารนี้ไม่รับไฟล์เพิ่ม");
    const object = await this.storage.put(file.buffer);
    const scan = await this.storage.scan(file.buffer);
    const scanStatus =
      scan === "clean"
        ? "clean"
        : scan === "infected"
          ? "infected"
          : "quarantined";
    return this.mutation(user, async (c, principal) => {
      const locked = await this.read(c, principal, id, "write", true);
      this.version(locked, version);
      if (!editableStates.has(locked.state)) throw problem(409, "เอกสารถูกล็อก");
      await this.ensureControls(c, locked);
      await c.execute(
        "UPDATE document_controls SET current_revision=current_revision+1 WHERE document_id=?",
        [id],
      );
      await c.execute("UPDATE documents SET version=version+1 WHERE id=?", [
        id,
      ]);
      const updated = await this.read(c, principal, id);
      const fileId = randomUUID();
      await c.execute(
        "INSERT INTO document_files(id,document_id,revision_no,original_name,media_type,byte_size,sha256,object_key,scan_status,uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [
          fileId,
          id,
          updated.current_revision,
          file.originalname,
          media,
          object.size,
          object.sha256,
          object.objectKey,
          scanStatus,
          principal.id,
        ],
      );
      await this.snapshot(c, updated, principal.id);
      await this.event(c, principal.id, "file.upload", id, {
        fileId,
        sha256: object.sha256,
        scanStatus,
      });
      return { id: fileId, scanStatus, version: updated.version };
    });
  }
  async download(user, id, fileId) {
    if (!this.storage) throw problem(503, "Storage unavailable");
    const p = await this.principal(this.pool, user);
    await this.read(this.pool, p, id);
    const [rows] = await this.pool.execute(
      "SELECT * FROM document_files WHERE id=? AND document_id=?",
      [fileId, id],
    );
    const f = rows[0];
    if (!f) throw problem(404, "ไม่พบไฟล์");
    if (f.scan_status !== "clean") throw problem(409, "ไฟล์ยังไม่ผ่านการตรวจมัลแวร์");
    const bytes = await this.storage.read(f.object_key, f.sha256);
    await this.repo.event(p.id, "file.download", id);
    return { bytes, name: f.original_name, type: f.media_type };
  }
  async rescan(user, id, fileId) {
    if (!this.storage) throw problem(503, "Storage unavailable");
    const p = await this.principal(this.pool, user);
    const r = await this.read(this.pool, p, id, "write");
    if (!editableStates.has(r.state)) throw problem(409, "เอกสารถูกล็อก");
    const [rows] = await this.pool.execute(
      "SELECT * FROM document_files WHERE id=? AND document_id=?",
      [fileId, id],
    );
    if (!rows.length) throw problem(404, "ไม่พบไฟล์");
    const f = rows[0],
      bytes = await this.storage.read(f.object_key, f.sha256),
      status = await this.storage.scan(bytes);
    if (status === "unavailable")
      throw problem(503, "บริการตรวจมัลแวร์ยังไม่พร้อม ไฟล์ยังคงถูกกักกัน");
    return this.mutation(user, async (c, a) => {
      const locked = await this.read(c, a, id, "write", true);
      if (!editableStates.has(locked.state)) throw problem(409, "เอกสารถูกล็อก");
      await c.execute("UPDATE document_files SET scan_status=? WHERE id=?", [
        status,
        fileId,
      ]);
      await this.event(c, a.id, "file.scan", id, { fileId, result: status });
      return { scanStatus: status };
    });
  }
  async digest(c, r) {
    const [versions] = await c.execute(
      "SELECT metadata_json,sha256 FROM document_revisions WHERE document_id=? AND revision_no=?",
      [r.id, r.current_revision],
    );
    if (versions.length !== 1) throw problem(409, "ไม่พบหลักฐานรุ่นเอกสาร");
    const meta = canonical(json(versions[0].metadata_json));
    if (
      sha256(meta) !== versions[0].sha256 ||
      canonical(this.metadata(r)) !== meta
    )
      throw problem(409, "Metadata ไม่ผ่านการตรวจความสมบูรณ์");
    const [files] = await c.execute(
      "SELECT id,sha256,scan_status,object_key FROM document_files WHERE document_id=? AND revision_no<=? ORDER BY id",
      [r.id, r.current_revision],
    );
    if (files.some((f) => f.scan_status !== "clean"))
      throw problem(409, "ไฟล์แนบต้องผ่านการตรวจมัลแวร์ทุกไฟล์");
    if (files.length && !this.storage)
      throw problem(503, "ต้องตั้งค่า Storage เพื่อตรวจ Hash ของไฟล์");
    for (const file of files)
      await this.storage.read(file.object_key, file.sha256);
    return sha256(
      canonical({
        metadata: json(meta),
        files: files.map((f) => ({ id: f.id, sha256: f.sha256 })),
      }),
    );
  }
  async timeline(user, id) {
    const p = await this.principal(this.pool, user);
    await this.read(this.pool, p, id);
    const [events] = await this.pool.execute(
      "SELECT sequence_no,action,payload_json,created_at FROM domain_events WHERE document_id=? ORDER BY sequence_no",
      [id],
    );
    return events.map((e) => ({ ...e, payload: json(e.payload_json) }));
  }
  async notify(c, userId, eventType, id) {
    await c.execute(
      "INSERT INTO notifications(id,user_id,event_type,document_id) VALUES (?,?,?,?)",
      [randomUUID(), userId, eventType, id],
    );
  }
  async organization(user) {
    const p = await this.principal(this.pool, user);
    this.require(p, "org:manage");
    const [departments] = await this.pool.query(
      "SELECT * FROM departments ORDER BY code",
    );
    const [memberships] = await this.pool.query(
      "SELECT m.*,u.email FROM department_memberships m JOIN users u ON u.id=m.user_id",
    );
    const [grants] = await this.pool.query(
      "SELECT g.*,u.email FROM user_grants g JOIN users u ON u.id=g.user_id WHERE g.active=TRUE",
    );
    return { departments, memberships, grants };
  }
  async department(
    user,
    data,
    session,
    id = null,
    version = null,
    active = true,
  ) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "org:manage");
      requireFresh(session, this.clock());
      const key = id || randomUUID();
      if (id) {
        const [r] = await c.execute(
          "UPDATE departments SET code=?,name=?,active=?,version=version+1 WHERE id=? AND version=?",
          [data.code, data.name, active, key, version],
        );
        if (!r.affectedRows) throw problem(409, "ข้อมูลฝ่ายเปลี่ยนแปลงแล้ว");
      } else
        await c.execute(
          "INSERT INTO departments(id,code,name) VALUES (?,?,?)",
          [key, data.code, data.name],
        );
      await this.event(c, p.id, "department.save", null, { departmentId: key });
      return { id: key };
    });
  }
  async membership(user, { userId, departmentId, enabled }, session) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "org:manage");
      requireFresh(session, this.clock());
      await this.activeUsers(c, [userId]);
      const [d] = await c.execute(
        "SELECT id FROM departments WHERE id=? AND active=TRUE",
        [departmentId],
      );
      if (!d.length) throw problem(400, "ฝ่ายไม่พร้อมใช้งาน");
      if (enabled)
        await c.execute(
          "INSERT IGNORE INTO department_memberships(user_id,department_id) VALUES (?,?)",
          [userId, departmentId],
        );
      else
        await c.execute(
          "DELETE FROM department_memberships WHERE user_id=? AND department_id=?",
          [userId, departmentId],
        );
      await c.execute(
        "UPDATE users SET session_version=session_version+1 WHERE id=?",
        [userId],
      );
      await this.event(c, p.id, "organization.membership", null, {
        userId,
        departmentId,
        enabled,
      });
      return { ok: true };
    });
  }
  async grant(user, data, session) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "org:manage");
      requireFresh(session, this.clock());
      if (data.userId === p.id) throw problem(403, "ห้ามเพิ่มสิทธิ์ตนเอง");
      if (
        !p.grants.some(
          (g) => g.role_code === "system_admin" && !g.department_id,
        )
      )
        throw problem(403, "เฉพาะผู้ดูแลระบบจัดการบทบาท");
      await this.activeUsers(c, [data.userId]);
      if (data.departmentId) {
        const [d] = await c.execute(
          "SELECT id FROM departments WHERE id=? AND active=TRUE",
          [data.departmentId],
        );
        if (!d.length) throw problem(400, "ฝ่ายไม่พร้อมใช้งาน");
      }
      const id = randomUUID();
      await c.execute(
        "INSERT INTO user_grants(id,user_id,role_code,department_id,granted_by) VALUES (?,?,?,?,?)",
        [id, data.userId, data.role, data.departmentId, p.id],
      );
      await c.execute(
        "UPDATE users SET session_version=session_version+1 WHERE id=?",
        [data.userId],
      );
      await this.event(c, p.id, "organization.grant", null, {
        grantId: id,
        userId: data.userId,
        role: data.role,
      });
      return { id };
    });
  }
  async revokeGrant(user, id, session) {
    return this.mutation(user, async (c, p) => {
      if (
        !p.grants.some(
          (g) => g.role_code === "system_admin" && !g.department_id,
        )
      )
        throw problem(403, "ไม่มีสิทธิ์");
      requireFresh(session, this.clock());
      const [g] = await c.execute(
        "SELECT * FROM user_grants WHERE id=? AND active=TRUE FOR UPDATE",
        [id],
      );
      if (!g.length) throw problem(404, "ไม่พบสิทธิ์");
      if (g[0].user_id === p.id) throw problem(403, "ห้ามแก้สิทธิ์ตนเอง");
      await c.execute("UPDATE user_grants SET active=FALSE WHERE id=?", [id]);
      await c.execute(
        "UPDATE users SET session_version=session_version+1 WHERE id=?",
        [g[0].user_id],
      );
      await this.event(c, p.id, "organization.revoke-grant", null, {
        grantId: id,
      });
      return { ok: true };
    });
  }
  async definitions(user) {
    const p = await this.principal(this.pool, user);
    const [r] = await this.pool.query(
      "SELECT id,code,version,name,definition_json,status FROM workflow_definitions WHERE status='published' OR created_by=? ORDER BY code,version DESC",
      [p.id],
    );
    return r.map((d) => ({ ...d, definition: json(d.definition_json) }));
  }
  async definition(user, data, session, publishId = null) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "workflow:manage");
      requireFresh(session, this.clock());
      if (publishId) {
        const [r] = await c.execute(
          "UPDATE workflow_definitions SET status='published' WHERE id=? AND status='draft'",
          [publishId],
        );
        if (!r.affectedRows) throw problem(409, "Workflow ไม่อยู่ในสถานะร่าง");
        await this.event(c, p.id, "workflow.publish", null, {
          definitionId: publishId,
        });
        return { ok: true };
      }
      await this.activeUsers(c, [
        ...new Set(data.steps.flatMap((s) => s.assignees)),
      ]);
      const id = randomUUID();
      await c.execute(
        "INSERT INTO workflow_definitions(id,code,version,name,definition_json,created_by) VALUES (?,?,?,?,?,?)",
        [
          id,
          data.code,
          data.version,
          data.name,
          canonical({ steps: data.steps }),
          p.id,
        ],
      );
      await this.event(c, p.id, "workflow.create", null, { definitionId: id });
      return { id };
    });
  }
  async startStep(c, instance, definition, step, actor, documentId) {
    const policy = definition.steps[step];
    for (const assignee of policy.assignees) {
      if (assignee === actor)
        throw problem(409, "ผู้สร้างไม่สามารถเป็นผู้อนุมัติเอกสารตนเอง");
      await this.activeUsers(c, [assignee]);
      await c.execute(
        "INSERT INTO workflow_tasks(id,instance_id,step_no,assignee_id,due_at) VALUES (?,?,?,?,?)",
        [
          randomUUID(),
          instance,
          step,
          assignee,
          new Date(this.clock() + policy.dueHours * 3600000),
        ],
      );
      await c.execute(
        "INSERT IGNORE INTO document_acl(document_id,user_id,permission,granted_by) VALUES (?,?,'read',?)",
        [documentId, assignee, actor],
      );
      await this.notify(c, assignee, "workflow.assigned", documentId);
    }
  }
  async submit(user, id, { version, definitionId }, key) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "write", true);
      return this.idem(
        c,
        p.id,
        "submit:" + id,
        key,
        { version, definitionId },
        async () => {
          this.version(r, version);
          if (r.owner_id !== p.id || r.state !== "draft")
            throw problem(409, "เฉพาะเจ้าของส่งเอกสารร่าง");
          await this.ensureControls(c, r);
          const [versions] = await c.execute(
            "SELECT id FROM document_revisions WHERE document_id=? AND revision_no=?",
            [id, r.current_revision],
          );
          if (!versions.length) await this.snapshot(c, r, p.id);
          const digest = await this.digest(c, r);
          const [defs] = await c.execute(
            "SELECT * FROM workflow_definitions WHERE id=? AND status='published'",
            [definitionId],
          );
          if (!defs.length) throw problem(400, "ต้องเลือก Workflow ที่เผยแพร่แล้ว");
          const def = json(defs[0].definition_json);
          if (def.steps.some((s) => s.assignees.includes(p.id)))
            throw problem(409, "Maker ไม่สามารถอนุมัติเอกสารตนเอง");
          const instance = randomUUID();
          await c.execute(
            "INSERT INTO workflow_instances(id,document_id,definition_id,definition_json,started_by) VALUES (?,?,?,?,?)",
            [instance, id, definitionId, canonical(def), p.id],
          );
          await this.setState(c, r, "submitted");
          await this.event(c, p.id, "workflow.submitted", id, {
            instanceId: instance,
          });
          await this.startStep(c, instance, def, 0, p.id, id);
          await this.setState(c, r, "in_review");
          await this.event(c, p.id, "workflow.submit", id, {
            instanceId: instance,
            digest,
          });
          return {
            instanceId: instance,
            state: "in_review",
            version: r.version,
          };
        },
      );
    });
  }
  async tasks(user) {
    const p = await this.principal(this.pool, user);
    const [r] = await this.pool.execute(
      "SELECT t.*,i.document_id,d.title FROM workflow_tasks t JOIN workflow_instances i ON i.id=t.instance_id JOIN documents d ON d.id=i.document_id WHERE t.assignee_id=? AND t.state='pending' AND i.state='in_review' ORDER BY t.due_at",
      [p.id],
    );
    const visible = [];
    for (const t of r) {
      try {
        await this.read(this.pool, p, t.document_id);
        visible.push({
          ...t,
          overdue: new Date(t.due_at).getTime() < this.clock(),
        });
      } catch (e) {
        if (e.status !== 404) throw e;
      }
    }
    return visible;
  }
  async decide(user, taskId, { version, action, reason }, session, key) {
    return this.mutation(user, async (c, p) => {
      const [lookup] = await c.execute(
        "SELECT i.document_id FROM workflow_tasks t JOIN workflow_instances i ON i.id=t.instance_id WHERE t.id=?",
        [taskId],
      );
      if (!lookup.length) throw problem(404, "ไม่พบงาน");
      const r = await this.read(c, p, lookup[0].document_id, "read", true);
      return this.idem(
        c,
        p.id,
        "task:" + taskId,
        key,
        { version, action, reason },
        async () => {
          requireAssurance(r, session, this.clock());
          if (
            !p.grants.some(
              (g) =>
                g.role_code !== "auditor_readonly" &&
                (!g.department_id || g.department_id === r.department_id),
            )
          )
            throw problem(403, "ผู้ตรวจสอบมีสิทธิ์อ่านเท่านั้น");
          const [tasks] = await c.execute(
            "SELECT t.*,i.state AS instance_state,i.current_step,i.definition_json FROM workflow_tasks t JOIN workflow_instances i ON i.id=t.instance_id WHERE t.id=? FOR UPDATE",
            [taskId],
          );
          const t = tasks[0];
          if (
            t.assignee_id !== p.id ||
            r.owner_id === p.id ||
            t.delegated_by === r.owner_id
          )
            throw problem(403, "ไม่มีสิทธิ์หรือขัดกับ Maker–Checker");
          if (
            t.state !== "pending" ||
            t.version !== version ||
            t.instance_state !== "in_review" ||
            r.state !== "in_review" ||
            t.step_no !== t.current_step
          )
            throw problem(409, "งานถูกดำเนินการแล้ว");
          await c.execute(
            "UPDATE workflow_tasks SET state=?,version=version+1,acted_at=CURRENT_TIMESTAMP(6) WHERE id=?",
            [action, taskId],
          );
          await c.execute(
            "INSERT INTO workflow_actions(id,task_id,actor_id,action,reason) VALUES (?,?,?,?,?)",
            [randomUUID(), taskId, p.id, action, reason],
          );
          const definition = json(t.definition_json),
            policy = definition.steps[t.step_no];
          let state = "in_review";
          if (action === "reject" || action === "return") {
            state = action === "reject" ? "rejected" : "returned";
            await c.execute(
              "UPDATE workflow_tasks SET state='cancelled',version=version+1 WHERE instance_id=? AND state='pending'",
              [t.instance_id],
            );
            await c.execute(
              "UPDATE workflow_instances SET state=? WHERE id=?",
              [state, t.instance_id],
            );
            await this.setState(c, r, state);
          } else {
            const [pending] = await c.execute(
              "SELECT id FROM workflow_tasks WHERE instance_id=? AND step_no=? AND state='pending'",
              [t.instance_id, t.step_no],
            );
            if (policy.mode === "any" || !pending.length) {
              await c.execute(
                "UPDATE workflow_tasks SET state='cancelled',version=version+1 WHERE instance_id=? AND step_no=? AND state='pending'",
                [t.instance_id, t.step_no],
              );
              const next = t.step_no + 1;
              if (next < definition.steps.length) {
                await c.execute(
                  "UPDATE workflow_instances SET current_step=? WHERE id=?",
                  [next, t.instance_id],
                );
                await this.startStep(
                  c,
                  t.instance_id,
                  definition,
                  next,
                  r.owner_id,
                  r.id,
                );
              } else {
                state = "approved";
                await c.execute(
                  "UPDATE workflow_instances SET state='approved' WHERE id=?",
                  [t.instance_id],
                );
                await this.setState(c, r, "approved");
              }
            }
          }
          await this.event(c, p.id, "workflow." + action, r.id, {
            taskId,
            state,
          });
          await this.notify(c, r.owner_id, "workflow." + state, r.id);
          return { ok: true, state };
        },
      );
    });
  }
  async delegate(user, taskId, { assigneeId, version, reason }, session) {
    return this.mutation(user, async (c, p) => {
      const [rows] = await c.execute(
        "SELECT t.*,i.document_id FROM workflow_tasks t JOIN workflow_instances i ON i.id=t.instance_id WHERE t.id=?",
        [taskId],
      );
      if (!rows.length) throw problem(404, "ไม่พบงาน");
      const t = rows[0],
        r = await this.read(c, p, t.document_id, "read", true);
      requireAssurance(r, session, this.clock());
      if (
        t.assignee_id !== p.id ||
        t.state !== "pending" ||
        t.version !== version ||
        assigneeId === r.owner_id ||
        assigneeId === p.id
      )
        throw problem(409, "มอบหมายไม่ได้");
      await this.activeUsers(c, [assigneeId]);
      await c.execute(
        "UPDATE workflow_tasks SET assignee_id=?,delegated_by=?,version=version+1 WHERE id=?",
        [assigneeId, p.id, taskId],
      );
      await c.execute(
        "INSERT IGNORE INTO document_acl(document_id,user_id,permission,granted_by) VALUES (?,?,'read',?)",
        [r.id, assigneeId, p.id],
      );
      await c.execute(
        "INSERT INTO workflow_actions(id,task_id,actor_id,action,reason) VALUES (?,?,?,?,?)",
        [randomUUID(), taskId, p.id, "delegate", reason],
      );
      await this.notify(c, assigneeId, "workflow.delegated", r.id);
      await this.event(c, p.id, "workflow.delegate", r.id, {
        taskId,
        assigneeId,
      });
      return { ok: true };
    });
  }
  async cancel(user, id, version, reason) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "write", true);
      this.version(r, version);
      if (
        r.owner_id !== p.id ||
        !["draft", "in_review", "returned"].includes(r.state)
      )
        throw problem(409, "ยกเลิกเอกสารไม่ได้");
      await this.ensureControls(c, r);
      const [instances] = await c.execute(
        "SELECT id FROM workflow_instances WHERE document_id=? AND state='in_review'",
        [id],
      );
      for (const i of instances) {
        await c.execute(
          "UPDATE workflow_instances SET state='cancelled' WHERE id=?",
          [i.id],
        );
        await c.execute(
          "UPDATE workflow_tasks SET state='cancelled',version=version+1 WHERE instance_id=? AND state='pending'",
          [i.id],
        );
      }
      await this.setState(c, r, "cancelled");
      await this.event(c, p.id, "document.cancel", id, { reason });
      return { ok: true };
    });
  }
  async signingDigest(user, id) {
    const p = await this.principal(this.pool, user),
      r = await this.read(this.pool, p, id);
    return {
      sha256: await this.digest(this.pool, r),
      revision: r.current_revision,
      version: r.version,
      state: r.state,
    };
  }
  async requestSignature(user, id, { version }, session, key) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "write", true);
      return this.idem(
        c,
        p.id,
        "sign-request:" + id,
        key,
        { version },
        async () => {
          requireAssurance(r, session, this.clock());
          this.version(r, version);
          if (r.state !== "approved")
            throw problem(409, "ต้องอนุมัติเอกสารก่อนเริ่มลงนาม");
          const digest = await this.digest(c, r);
          await this.setState(c, r, "signing_pending");
          await this.event(c, p.id, "signature.request", id, {
            digest,
            revision: r.current_revision,
          });
          return {
            state: "signing_pending",
            sha256: digest,
            version: r.version,
            revision: r.current_revision,
          };
        },
      );
    });
  }
  async sign(user, id, { version, digest, intent }, session, key) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "write", true);
      return this.idem(
        c,
        p.id,
        "sign:" + id,
        key,
        { version, digest, intent },
        async () => {
          requireAssurance(r, session, this.clock());
          this.version(r, version);
          if (r.state !== "signing_pending")
            throw problem(409, "ต้องเริ่มขั้นตอนลงนามของเอกสารที่อนุมัติแล้วก่อน");
          const current = await this.digest(c, r);
          if (current !== digest) throw problem(409, "Hash ไม่ตรงกับเอกสารที่ยืนยัน");
          const evidence = {
            method: "Google-reauthenticated electronic intent evidence",
            assurance: "fresh Google ID token, not provider-attested MFA",
            digestAlgorithm: "SHA-256",
            revision: r.current_revision,
            documentDigest: current,
            intent,
            signer: p.id,
            reauthenticatedAt: new Date(session.reauthAt).toISOString(),
            recordedAt: new Date(this.clock()).toISOString(),
            timeSource: "TEST server clock; not a trusted timestamp authority",
            cryptographicPdfSignature: false,
          };
          const eventId = randomUUID();
          await c.execute(
            "INSERT INTO signature_events(id,document_id,revision_no,signer_id,document_sha256,intent,evidence_json) VALUES (?,?,?,?,?,?,?)",
            [
              eventId,
              id,
              r.current_revision,
              p.id,
              current,
              intent,
              canonical(evidence),
            ],
          );
          await this.setState(c, r, "signed");
          await this.event(c, p.id, "signature.confirm", id, {
            eventId,
            digest: current,
          });
          return { id: eventId, digest: current, state: "signed" };
        },
      );
    });
  }
  async verify(user, id) {
    const p = await this.principal(this.pool, user),
      r = await this.read(this.pool, p, id);
    const [events] = await this.pool.execute(
      "SELECT * FROM signature_events WHERE document_id=? ORDER BY signed_at",
      [id],
    );
    let digest,
      valid = true;
    try {
      digest = await this.digest(this.pool, r);
      if (this.storage) {
        const [files] = await this.pool.execute(
          "SELECT object_key,sha256 FROM document_files WHERE document_id=?",
          [id],
        );
        for (const f of files) await this.storage.read(f.object_key, f.sha256);
      }
    } catch (e) {
      if (e.status === 409) valid = false;
      else throw e;
    }
    return {
      integrityValid:
        valid &&
        events.every(
          (e) =>
            e.document_sha256 === digest &&
            e.revision_no === r.current_revision,
        ),
      signed: events.length > 0,
      digest: valid ? digest : null,
      signatures: events.map((e) => ({
        ...e,
        evidence: json(e.evidence_json),
      })),
      cryptographicPdfSignature: false,
    };
  }
  async register(user, id, { version, type }, session, key) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "read", true);
      this.require(p, "registry:assign", r.department_id);
      return this.idem(
        c,
        p.id,
        "register:" + id,
        key,
        { version, type },
        async () => {
          requireAssurance(r, session, this.clock());
          this.version(r, version);
          if (r.state !== "signed")
            throw problem(409, "ต้องลงนามก่อนออกเลขทะเบียน");
          const digest = await this.digest(c, r);
          const [signed] = await c.execute(
            "SELECT id FROM signature_events WHERE document_id=? AND document_sha256=?",
            [id, digest],
          );
          if (!signed.length) throw problem(409, "ไม่มีหลักฐานลงนามตรงกับ Hash");
          const year = Number(
            new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              timeZone: "Asia/Bangkok",
            }).format(new Date(this.clock())),
          );
          await c.execute(
            "INSERT IGNORE INTO sequence_counters(registry_type,register_year) VALUES (?,?)",
            [type, year],
          );
          const [counter] = await c.execute(
            "SELECT last_value FROM sequence_counters WHERE registry_type=? AND register_year=? FOR UPDATE",
            [type, year],
          );
          const sequence = counter[0].last_value + 1;
          await c.execute(
            "UPDATE sequence_counters SET last_value=? WHERE registry_type=? AND register_year=?",
            [sequence, type, year],
          );
          const display =
              type.toUpperCase() +
              "/" +
              (year + 543) +
              "/" +
              String(sequence).padStart(6, "0"),
            registryId = randomUUID();
          await c.execute(
            "INSERT INTO document_registers(id,document_id,registry_type,register_year,sequence_no,display_number,assigned_by) VALUES (?,?,?,?,?,?,?)",
            [registryId, id, type, year, sequence, display, p.id],
          );
          await this.setState(c, r, "registered");
          await this.event(c, p.id, "registry.assign", id, {
            registryId,
            number: display,
          });
          return { id: registryId, number: display, state: "registered" };
        },
      );
    });
  }
  async registries(user) {
    const p = await this.principal(this.pool, user);
    const [rows] = await this.pool.execute(
      "SELECT reg.*,d.title FROM document_registers reg JOIN documents d ON d.id=reg.document_id LEFT JOIN document_controls c ON c.document_id=d.id WHERE d.deleted_at IS NULL AND " +
        visible +
        " ORDER BY reg.assigned_at DESC LIMIT 200",
      [p.id, p.id, p.id, p.id],
    );
    return rows;
  }
  async distribute(user, id, { version, recipients }, session) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "write", true);
      this.version(r, version);
      requireAssurance(r, session, this.clock());
      if (!["registered", "distributed"].includes(r.state))
        throw problem(409, "ต้องออกเลขทะเบียนก่อนเผยแพร่");
      await this.activeUsers(c, recipients);
      for (const recipient of recipients) {
        await c.execute(
          "INSERT IGNORE INTO document_distributions(id,document_id,recipient_id,sent_by) VALUES (?,?,?,?)",
          [randomUUID(), id, recipient, p.id],
        );
        await c.execute(
          "INSERT IGNORE INTO document_acl(document_id,user_id,permission,granted_by) VALUES (?,?,'read',?)",
          [id, recipient, p.id],
        );
        await this.notify(c, recipient, "document.distributed", id);
      }
      await this.setState(c, r, "distributed");
      await this.event(c, p.id, "document.distribute", id, { recipients });
      return { ok: true };
    });
  }
  async acknowledge(user, id) {
    return this.mutation(user, async (c, p) => {
      await this.read(c, p, id);
      const [r] = await c.execute(
        "UPDATE document_distributions SET acknowledged_at=COALESCE(acknowledged_at,CURRENT_TIMESTAMP(6)) WHERE document_id=? AND recipient_id=?",
        [id, p.id],
      );
      if (!r.affectedRows) throw problem(404, "ไม่พบรายการรับเอกสาร");
      await this.event(c, p.id, "document.acknowledge", id);
      return { ok: true };
    });
  }
  async retentionPolicies(user) {
    await this.principal(this.pool, user);
    const [r] = await this.pool.query(
      "SELECT id,code,title,years,legal_basis FROM retention_policies ORDER BY code",
    );
    return r;
  }
  async addRetention(user, data, session) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "retention:manage");
      requireFresh(session, this.clock());
      const id = randomUUID();
      await c.execute(
        "INSERT INTO retention_policies(id,code,title,years,legal_basis,created_by) VALUES (?,?,?,?,?,?)",
        [id, data.code, data.title, data.years, data.legalBasis, p.id],
      );
      await this.event(c, p.id, "retention.policy", null, { policyId: id });
      return { id };
    });
  }
  async archive(user, id, { version, policyId }, session) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "read", true);
      this.require(p, "retention:manage", r.department_id);
      requireFresh(session, this.clock());
      this.version(r, version);
      if (!["registered", "distributed"].includes(r.state))
        throw problem(409, "เก็บถาวรได้หลังลงทะเบียน");
      const [policies] = await c.execute(
        "SELECT * FROM retention_policies WHERE id=?",
        [policyId],
      );
      if (!policies.length) throw problem(400, "ไม่พบนโยบาย");
      const until = new Date(this.clock());
      until.setUTCFullYear(until.getUTCFullYear() + policies[0].years);
      await c.execute(
        "UPDATE document_controls SET retention_until=? WHERE document_id=?",
        [until, id],
      );
      await this.setState(c, r, "archived");
      await this.event(c, p.id, "retention.archive", id, {
        policyId,
        retentionUntil: until.toISOString(),
      });
      return { state: "archived", retentionUntil: until.toISOString() };
    });
  }
  async hold(user, id, { reason, holdId = null }, session) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "read", true);
      this.require(p, "retention:manage", r.department_id);
      requireFresh(session, this.clock());
      const key = holdId || randomUUID();
      if (holdId) {
        const [h] = await c.execute(
          "UPDATE legal_holds SET active=FALSE WHERE id=? AND document_id=? AND active=TRUE",
          [holdId, id],
        );
        if (!h.affectedRows) throw problem(404, "ไม่พบ Legal Hold");
      } else
        await c.execute(
          "INSERT INTO legal_holds(id,document_id,reason,created_by) VALUES (?,?,?,?)",
          [key, id, reason, p.id],
        );
      await this.event(
        c,
        p.id,
        holdId ? "retention.release-hold" : "retention.hold",
        id,
        { holdId: key, reason },
      );
      return { id: key, active: !holdId };
    });
  }
  async disposal(user, id, { reason, requestId = null }, session) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "read", true);
      this.require(p, "retention:manage", r.department_id);
      requireFresh(session, this.clock());
      const [holds] = await c.execute(
        "SELECT id FROM legal_holds WHERE document_id=? AND active=TRUE",
        [id],
      );
      if (
        holds.length ||
        r.state !== "archived" ||
        !r.retention_until ||
        new Date(r.retention_until).getTime() > this.clock()
      )
        throw problem(409, "ยังไม่ครบกำหนดเก็บหรือมี Legal Hold");
      if (requestId) {
        const [requests] = await c.execute(
          "SELECT * FROM disposal_requests WHERE id=? AND document_id=? AND state='pending' FOR UPDATE",
          [requestId, id],
        );
        if (!requests.length || requests[0].requested_by === p.id)
          throw problem(403, "ต้องมีผู้ตรวจสอบอีกคน");
        await c.execute(
          "UPDATE disposal_requests SET state='approved',reviewed_by=? WHERE id=?",
          [p.id, requestId],
        );
        await this.event(c, p.id, "retention.disposal-approved", id, {
          requestId,
          reason,
        });
        return {
          id: requestId,
          state: "approved",
          executed: false,
          message: "การทำลายจริงต้องได้รับอนุมัติการปฏิบัติงานแยกต่างหาก",
        };
      }
      const key = randomUUID();
      await c.execute(
        "INSERT INTO disposal_requests(id,document_id,requested_by,reason) VALUES (?,?,?,?)",
        [key, id, p.id, reason],
      );
      await this.event(c, p.id, "retention.disposal-request", id, {
        requestId: key,
      });
      return { id: key, state: "pending" };
    });
  }
  async templates(user) {
    const p = await this.principal(this.pool, user);
    const [r] = await this.pool.execute(
      "SELECT * FROM document_templates WHERE status='published' OR created_by=? ORDER BY code,version DESC",
      [p.id],
    );
    return r;
  }
  async template(user, data, session, publishId = null) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "template:manage");
      requireFresh(session, this.clock());
      if (publishId) {
        const [r] = await c.execute(
          "UPDATE document_templates SET status='published' WHERE id=? AND status='draft'",
          [publishId],
        );
        if (!r.affectedRows) throw problem(409, "Template ถูกเผยแพร่แล้ว");
        await this.event(c, p.id, "template.publish", null, {
          templateId: publishId,
        });
        return { ok: true };
      }
      const id = randomUUID();
      await c.execute(
        "INSERT INTO document_templates(id,code,version,title,body_text,category,created_by) VALUES (?,?,?,?,?,?,?)",
        [
          id,
          data.code,
          data.version,
          data.title,
          data.body,
          data.category,
          p.id,
        ],
      );
      await this.event(c, p.id, "template.create", null, { templateId: id });
      return { id };
    });
  }
  async fromTemplate(user, templateId, data) {
    const p = await this.principal(this.pool, user);
    const [r] = await this.pool.execute(
      "SELECT * FROM document_templates WHERE id=? AND status='published'",
      [templateId],
    );
    if (!r.length) throw problem(404, "ไม่พบ Template ที่เผยแพร่");
    return this.create(p, {
      ...data,
      description: r[0].body_text.replaceAll("{{title}}", data.title),
    });
  }
  async meetings(user) {
    const p = await this.principal(this.pool, user);
    const [r] = await this.pool.execute(
      "SELECT m.* FROM meetings m WHERE m.owner_id=? OR EXISTS(SELECT 1 FROM meeting_attendees a WHERE a.meeting_id=m.id AND a.user_id=?) ORDER BY starts_at DESC",
      [p.id, p.id],
    );
    return r;
  }
  async meetingRead(c, p, id, lock = false) {
    const [r] = await c.execute(
      "SELECT * FROM meetings WHERE id=?" + (lock ? " FOR UPDATE" : ""),
      [id],
    );
    if (!r.length) throw problem(404, "ไม่พบการประชุม");
    const [a] = await c.execute(
      "SELECT a.*,u.email FROM meeting_attendees a JOIN users u ON u.id=a.user_id WHERE meeting_id=?",
      [id],
    );
    if (r[0].owner_id !== p.id && !a.some((x) => x.user_id === p.id))
      throw problem(404, "ไม่พบการประชุม");
    return { ...r[0], attendees: a };
  }
  async meetingDetail(user, id) {
    const p = await this.principal(this.pool, user),
      m = await this.meetingRead(this.pool, p, id);
    const [a] = await this.pool.execute(
      "SELECT * FROM meeting_agendas WHERE meeting_id=? ORDER BY ordinal",
      [id],
    );
    const agendas = [];
    for (const agenda of a) {
      let visible = agenda.document_id === null;
      if (agenda.document_id) {
        try {
          await this.read(this.pool, p, agenda.document_id);
          visible = true;
        } catch (e) {
          if (e.status !== 404) throw e;
        }
      }
      agendas.push({
        ...agenda,
        document_id: visible ? agenda.document_id : null,
        attachmentRestricted: !visible,
      });
    }
    await this.repo.event(p.id, "meeting.view", id);
    return { ...m, agendas };
  }
  async meetingCreate(user, data) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "meeting:create");
      await this.activeUsers(c, data.attendees);
      const id = randomUUID();
      await c.execute(
        "INSERT INTO meetings(id,title,starts_at,location,owner_id,quorum_count,voting_rule) VALUES (?,?,?,?,?,?,?)",
        [
          id,
          data.title,
          new Date(data.startsAt),
          data.location,
          p.id,
          data.quorum,
          data.votingRule,
        ],
      );
      for (const attendee of data.attendees)
        await c.execute(
          "INSERT INTO meeting_attendees(meeting_id,user_id) VALUES (?,?)",
          [id, attendee],
        );
      await this.event(c, p.id, "meeting.create", null, { meetingId: id });
      return { id };
    });
  }
  async meetingUpdate(user, id, data, version) {
    return this.mutation(user, async (c, p) => {
      const m = await this.meetingRead(c, p, id, true);
      if (m.owner_id !== p.id || m.state !== "draft" || m.version !== version)
        throw problem(409, "แก้ไขได้เฉพาะการประชุมร่างของตนเอง");
      await this.activeUsers(c, data.attendees);
      await c.execute(
        "UPDATE meetings SET title=?,starts_at=?,location=?,quorum_count=?,voting_rule=?,version=version+1 WHERE id=?",
        [
          data.title,
          new Date(data.startsAt),
          data.location,
          data.quorum,
          data.votingRule,
          id,
        ],
      );
      await c.execute("DELETE FROM meeting_attendees WHERE meeting_id=?", [id]);
      for (const attendee of data.attendees)
        await c.execute(
          "INSERT INTO meeting_attendees(meeting_id,user_id) VALUES (?,?)",
          [id, attendee],
        );
      await this.event(c, p.id, "meeting.update", null, { meetingId: id });
      return { ok: true };
    });
  }
  async meetingState(user, id, { version, state, minutes }, session) {
    return this.mutation(user, async (c, p) => {
      const m = await this.meetingRead(c, p, id, true);
      requireFresh(session, this.clock());
      if (
        m.owner_id !== p.id ||
        m.version !== version ||
        m.state === "published" ||
        m.state === "cancelled"
      )
        throw problem(409, "ไม่สามารถเปลี่ยนสถานะการประชุม");
      if (state === "open" && m.state !== "draft")
        throw problem(409, "การประชุมเปิดแล้ว");
      if (state === "published") {
        const eligible = m.attendees.filter(
          (a) => a.attended && !a.conflict_declared,
        ).length;
        if (m.state !== "open" || eligible < m.quorum_count)
          throw problem(409, "ไม่ครบองค์ประชุม");
        const [a] = await c.execute(
          "SELECT id FROM meeting_agendas WHERE meeting_id=? AND state='draft'",
          [id],
        );
        if (a.length) throw problem(409, "ยังมีวาระที่ไม่สรุปมติ");
      }
      await c.execute(
        "UPDATE meetings SET state=?,minutes_text=?,version=version+1 WHERE id=?",
        [state, minutes || null, id],
      );
      await this.event(c, p.id, "meeting." + state, null, { meetingId: id });
      return { ok: true, state };
    });
  }
  async agenda(user, id, data) {
    return this.mutation(user, async (c, p) => {
      const m = await this.meetingRead(c, p, id, true);
      if (m.owner_id !== p.id || m.state !== "draft")
        throw problem(403, "เพิ่มวาระได้เฉพาะเจ้าของการประชุมร่าง");
      if (data.documentId) await this.read(c, p, data.documentId);
      const key = randomUUID();
      await c.execute(
        "INSERT INTO meeting_agendas(id,meeting_id,ordinal,title,document_id) VALUES (?,?,?,?,?)",
        [key, id, data.ordinal, data.title, data.documentId],
      );
      await c.execute("UPDATE meetings SET version=version+1 WHERE id=?", [id]);
      await this.event(c, p.id, "meeting.agenda", null, {
        meetingId: id,
        agendaId: key,
      });
      return { id: key };
    });
  }
  async attendance(user, id, data) {
    return this.mutation(user, async (c, p) => {
      const m = await this.meetingRead(c, p, id, true);
      if (m.state !== "open") throw problem(409, "การประชุมยังไม่เปิดหรือเผยแพร่แล้ว");
      const [r] = await c.execute(
        "UPDATE meeting_attendees SET attended=?,conflict_declared=? WHERE meeting_id=? AND user_id=?",
        [data.attended, data.conflict, id, p.id],
      );
      if (!r.affectedRows) throw problem(403, "ต้องเป็นผู้ได้รับเชิญ");
      await this.event(c, p.id, "meeting.attendance", null, {
        meetingId: id,
        ...data,
      });
      return { ok: true };
    });
  }
  async vote(user, id, agendaId, vote, session) {
    return this.mutation(user, async (c, p) => {
      const m = await this.meetingRead(c, p, id, true);
      requireFresh(session, this.clock());
      const a = m.attendees.find((a) => a.user_id === p.id);
      if (m.state !== "open" || !a?.attended || a.conflict_declared)
        throw problem(403, "ไม่มีสิทธิ์ลงคะแนนหรือมีส่วนได้เสีย");
      const [agenda] = await c.execute(
        "SELECT id FROM meeting_agendas WHERE id=? AND meeting_id=? AND state='draft'",
        [agendaId, id],
      );
      if (!agenda.length) throw problem(409, "วาระปิดแล้ว");
      await c.execute(
        "INSERT INTO meeting_votes(agenda_id,user_id,vote) VALUES (?,?,?)",
        [agendaId, p.id, vote],
      );
      await this.event(c, p.id, "meeting.vote", null, {
        meetingId: id,
        agendaId,
      });
      return { ok: true };
    });
  }
  async resolve(user, id, agendaId, text, session) {
    return this.mutation(user, async (c, p) => {
      const m = await this.meetingRead(c, p, id, true);
      requireFresh(session, this.clock());
      if (m.owner_id !== p.id || m.state !== "open")
        throw problem(403, "เฉพาะประธานการประชุม");
      const eligible = m.attendees.filter(
        (a) => a.attended && !a.conflict_declared,
      );
      if (eligible.length < m.quorum_count) throw problem(409, "ไม่ครบองค์ประชุม");
      const [votes] = await c.execute(
        "SELECT v.vote FROM meeting_votes v JOIN meeting_attendees a ON a.meeting_id=? AND a.user_id=v.user_id WHERE v.agenda_id=? AND a.attended=TRUE AND a.conflict_declared=FALSE",
        [id, agendaId],
      );
      const approvals = votes.filter((v) => v.vote === "approve").length;
      const passed =
        m.voting_rule === "unanimous_eligible"
          ? approvals === eligible.length
          : approvals > eligible.length / 2;
      const [r] = await c.execute(
        "UPDATE meeting_agendas SET resolution_text=?,state=? WHERE id=? AND meeting_id=? AND state='draft'",
        [text, passed ? "approved" : "rejected", agendaId, id],
      );
      if (!r.affectedRows) throw problem(409, "วาระปิดแล้ว");
      await this.event(c, p.id, "meeting.resolution", null, {
        meetingId: id,
        agendaId,
        eligible: eligible.length,
        approvals,
        passed,
        rule: m.voting_rule,
      });
      return { passed, eligible: eligible.length, approvals };
    });
  }
  async notifications(user, readId = null) {
    const p = await this.principal(this.pool, user);
    if (readId) {
      await this.pool.execute(
        "UPDATE notifications SET read_at=CURRENT_TIMESTAMP(6) WHERE id=? AND user_id=?",
        [readId, p.id],
      );
      return { ok: true };
    }
    const [rows] = await this.pool.execute(
      "SELECT id,event_type,document_id,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      [p.id],
    );
    const result = [];
    for (const n of rows) {
      try {
        if (n.document_id) await this.read(this.pool, p, n.document_id);
        result.push(n);
      } catch (e) {
        if (e.status !== 404) throw e;
      }
    }
    return result;
  }
  async overview(user) {
    const records = await this.list(user, { pageSize: 200, page: 1 }),
      tasks = await this.tasks(user);
    const states = {};
    for (const r of records.items) states[r.state] = (states[r.state] || 0) + 1;
    return {
      visibleTotal: records.total,
      states,
      sampled: records.total > 200,
      pendingTasks: tasks.length,
      overdueTasks: tasks.filter((t) => t.overdue).length,
    };
  }
  async audit(user) {
    const p = await this.principal(this.pool, user);
    this.require(p, "audit:read");
    const all = ["system_admin", "security_admin"].includes(p.role);
    const [rows] = await this.pool.query(
      "SELECT * FROM domain_events ORDER BY sequence_no LIMIT 10000",
    );
    let previous = "0".repeat(64),
      sequence = 0,
      valid = true;
    for (const e of rows) {
      const payload = json(e.payload_json),
        body = {
          sequence: Number(e.sequence_no),
          eventId: e.event_id,
          actor: e.actor_id,
          documentId: e.document_id,
          action: e.action,
          payload,
        };
      if (
        Number(e.sequence_no) !== sequence + 1 ||
        e.previous_hash !== previous ||
        sha256(previous + canonical(body)) !== e.chain_hash
      )
        valid = false;
      previous = e.chain_hash;
      sequence = Number(e.sequence_no);
    }
    const [heads] = await this.pool.query(
      "SELECT * FROM domain_audit_head WHERE id=1",
    );
    if (
      Number(heads[0].sequence_no) !== sequence ||
      heads[0].chain_hash !== previous
    )
      valid = false;
    const scoped = [];
    for (const e of rows.slice(-200).reverse()) {
      if (all) scoped.push(e);
      else if (e.document_id) {
        try {
          await this.read(this.pool, p, e.document_id);
          scoped.push(e);
        } catch (error) {
          if (error.status !== 404) throw error;
        }
      }
    }
    return { chainValid: valid, externallyAnchored: false, events: scoped };
  }
  async groups(user) {
    const p = await this.principal(this.pool, user);
    const [groups] = await this.pool.query(
      "SELECT * FROM organization_groups ORDER BY code",
    );
    const [members] = hasPermission(p, "org:manage")
      ? await this.pool.query(
          "SELECT gm.*,u.email FROM group_memberships gm JOIN users u ON u.id=gm.user_id",
        )
      : [[]];
    return {
      groups: hasPermission(p, "org:manage")
        ? groups
        : groups.filter((g) => g.active),
      members,
    };
  }
  async group(user, data, session, id = null, version = null) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "org:manage");
      requireFresh(session, this.clock());
      const key = id || randomUUID();
      if (id) {
        const [r] = await c.execute(
          "UPDATE organization_groups SET code=?,name=?,active=?,version=version+1 WHERE id=? AND version=?",
          [data.code, data.name, data.active, id, version],
        );
        if (!r.affectedRows) throw problem(409, "กลุ่มถูกแก้ไขแล้ว");
      } else
        await c.execute(
          "INSERT INTO organization_groups(id,code,name) VALUES (?,?,?)",
          [key, data.code, data.name],
        );
      await this.event(c, p.id, "group.save", null, { groupId: key });
      return { id: key };
    });
  }
  async groupMember(user, data, session) {
    return this.mutation(user, async (c, p) => {
      this.require(p, "org:manage");
      requireFresh(session, this.clock());
      await this.activeUsers(c, [data.userId]);
      const [g] = await c.execute(
        "SELECT id FROM organization_groups WHERE id=? AND active=TRUE",
        [data.groupId],
      );
      if (!g.length) throw problem(400, "กลุ่มไม่พร้อมใช้งาน");
      if (data.enabled)
        await c.execute(
          "INSERT IGNORE INTO group_memberships(group_id,user_id) VALUES (?,?)",
          [data.groupId, data.userId],
        );
      else
        await c.execute(
          "DELETE FROM group_memberships WHERE group_id=? AND user_id=?",
          [data.groupId, data.userId],
        );
      await this.event(c, p.id, "group.membership", null, data);
      return { ok: true };
    });
  }
  async groupShare(user, id, data, session) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "read", true);
      if (r.owner_id !== p.id) throw problem(403, "เฉพาะเจ้าของเอกสาร");
      requireFresh(session, this.clock());
      const [g] = await c.execute(
        "SELECT id FROM organization_groups WHERE id=? AND active=TRUE",
        [data.groupId],
      );
      if (!g.length) throw problem(400, "กลุ่มไม่พร้อมใช้งาน");
      await c.execute(
        "INSERT IGNORE INTO document_group_acl(document_id,group_id,permission,granted_by) VALUES (?,?,?,?)",
        [id, data.groupId, data.permission, p.id],
      );
      await this.event(c, p.id, "document.group-share", id, {
        groupId: data.groupId,
        permission: data.permission,
      });
      return { ok: true };
    });
  }
  async unshare(user, id, data, session) {
    return this.mutation(user, async (c, p) => {
      const r = await this.read(c, p, id, "read", true);
      if (r.owner_id !== p.id) throw problem(403, "เฉพาะเจ้าของเอกสาร");
      requireFresh(session, this.clock());
      if (data.userId)
        await c.execute(
          "DELETE FROM document_acl WHERE document_id=? AND user_id=? AND permission=?",
          [id, data.userId, data.permission],
        );
      else
        await c.execute(
          "DELETE FROM document_group_acl WHERE document_id=? AND group_id=? AND permission=?",
          [id, data.groupId, data.permission],
        );
      await this.event(c, p.id, "document.revoke-access", id, data);
      return { ok: true };
    });
  }
  async folders(user) {
    const p = await this.principal(this.pool, user);
    const [rows] = await this.pool.execute(
      "SELECT * FROM repository_folders WHERE owner_id=? AND active=TRUE ORDER BY name",
      [p.id],
    );
    return rows;
  }
  async folder(user, data, id = null, version = null) {
    return this.mutation(user, async (c, p) => {
      const key = id || randomUUID();
      if (data.parentId) {
        let parent = data.parentId;
        const seen = new Set([key]);
        while (parent) {
          if (seen.has(parent) || seen.size > 100)
            throw problem(400, "โครงสร้างโฟลเดอร์วนซ้ำ");
          seen.add(parent);
          const [r] = await c.execute(
            "SELECT parent_id FROM repository_folders WHERE id=? AND owner_id=? AND active=TRUE",
            [parent, p.id],
          );
          if (!r.length) throw problem(404, "ไม่พบโฟลเดอร์หลัก");
          parent = r[0].parent_id;
        }
      }
      if (id) {
        if (!data.active) {
          const [children] = await c.execute(
            "SELECT id FROM repository_folders WHERE parent_id=? AND active=TRUE",
            [id],
          );
          if (children.length) throw problem(409, "ต้องย้ายโฟลเดอร์ย่อยก่อน");
        }
        const [r] = await c.execute(
          "UPDATE repository_folders SET name=?,parent_id=?,active=?,version=version+1 WHERE id=? AND owner_id=? AND version=?",
          [data.name, data.parentId, data.active, id, p.id, version],
        );
        if (!r.affectedRows) throw problem(409, "ไม่พบโฟลเดอร์หรือข้อมูลเปลี่ยนแปลง");
      } else
        await c.execute(
          "INSERT INTO repository_folders(id,parent_id,owner_id,name) VALUES (?,?,?,?)",
          [key, data.parentId, p.id, data.name],
        );
      await this.event(c, p.id, "folder.save", null, { folderId: key });
      return { id: key };
    });
  }
  async fileInFolder(user, id, data) {
    return this.mutation(user, async (c, p) => {
      await this.read(c, p, id);
      const [f] = await c.execute(
        "SELECT id FROM repository_folders WHERE id=? AND owner_id=? AND active=TRUE",
        [data.folderId, p.id],
      );
      if (!f.length) throw problem(404, "ไม่พบโฟลเดอร์");
      if (data.enabled)
        await c.execute(
          "INSERT IGNORE INTO document_folders(folder_id,document_id) VALUES (?,?)",
          [data.folderId, id],
        );
      else
        await c.execute(
          "DELETE FROM document_folders WHERE folder_id=? AND document_id=?",
          [data.folderId, id],
        );
      await this.event(c, p.id, "folder.document", id, {
        folderId: data.folderId,
        enabled: data.enabled,
      });
      return { ok: true };
    });
  }
}
