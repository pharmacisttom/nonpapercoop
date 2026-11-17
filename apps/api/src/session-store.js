import session from "express-session";
import { createHash } from "node:crypto";
const hash = (s) => createHash("sha256").update(s).digest("hex");
export class MySQLSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
  }
  get(sid, cb) {
    this.pool
      .execute("SELECT data FROM sessions WHERE session_id=? AND expires>?", [
        hash(sid),
        Math.floor(Date.now() / 1000),
      ])
      .then(([r]) => cb(null, r[0] ? JSON.parse(r[0].data) : null))
      .catch(cb);
  }
  set(sid, value, cb = () => {}) {
    const expires = Math.floor(new Date(value.cookie.expires).getTime() / 1000);
    this.pool
      .execute(
        "INSERT INTO sessions (session_id,expires,data) VALUES (?,?,?) ON DUPLICATE KEY UPDATE expires=VALUES(expires),data=VALUES(data)",
        [hash(sid), expires, JSON.stringify(value)],
      )
      .then(() => cb())
      .catch(cb);
  }
  destroy(sid, cb = () => {}) {
    this.pool
      .execute("DELETE FROM sessions WHERE session_id=?", [hash(sid)])
      .then(() => cb())
      .catch(cb);
  }
  touch(sid, value, cb = () => {}) {
    this.pool
      .execute("UPDATE sessions SET expires=? WHERE session_id=?", [
        Math.floor(new Date(value.cookie.expires).getTime() / 1000),
        hash(sid),
      ])
      .then(() => cb())
      .catch(cb);
  }
}
