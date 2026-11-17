/* global $, CoopAlerts */
window.EnterpriseUI = (() => {
  const categories = {
    general: "เอกสารทั่วไป",
    saraban: "สารบรรณ",
    board: "คณะกรรมการ",
    finance: "เอกสารการเงิน",
    procurement: "จัดซื้อจัดจ้าง",
    member: "บริการสมาชิก",
  };
  const states = {
    draft: "ร่าง",
    in_review: "รอพิจารณา",
    submitted: "รอพิจารณา",
    approved: "อนุมัติแล้ว",
    returned: "ส่งกลับแก้ไข",
    rejected: "ไม่อนุมัติ",
    signed: "ลงนามแล้ว",
    signing_pending: "รอลงนาม",
    registered: "ลงทะเบียนแล้ว",
    distributed: "เผยแพร่แล้ว",
    archived: "เก็บถาวร",
    cancelled: "ยกเลิก",
    published: "เผยแพร่แล้ว",
    open: "เปิดประชุม",
    clean: "ผ่านการตรวจ",
    quarantined: "รอตรวจมัลแวร์",
    infected: "ตรวจพบความเสี่ยง",
  };
  const classifications = {
    internal: "ภายในฝ่าย",
    restricted: "จำกัดผู้เข้าถึง",
    confidential: "ลับ",
  };
  const roles = {
    system_admin: "ผู้ดูแลระบบ",
    security_admin: "ผู้ดูแลความปลอดภัย",
    records_officer: "เจ้าหน้าที่สารบรรณ",
    department_staff: "เจ้าหน้าที่",
    department_head: "หัวหน้าฝ่าย",
    manager: "ผู้จัดการ",
    chairperson: "ประธาน",
    board_member: "กรรมการ",
    finance_officer: "เจ้าหน้าที่การเงิน",
    procurement_officer: "เจ้าหน้าที่จัดซื้อ",
    auditor_readonly: "ผู้ตรวจสอบ",
    member_service_officer: "เจ้าหน้าที่บริการสมาชิก",
  };
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
    check:
      "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    book: "M4 3h14a2 2 0 0 1 2 2v16H5a2 2 0 0 1 0-4h15 M4 3v16 M9 7h7 M9 11h5",
    calendar:
      "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
    search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    users:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    shield: "M12 22s9-4 9-11V5l-9-3-9 3v6c0 7 9 11 9 11 M8 12l3 3 5-6",
    chart: "M3 3v18h18 M7 16v-5 M12 16V7 M17 16v-8",
    archive: "M3 3h18v4H3z M5 7v14h14V7 M9 11h6",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    plus: "M12 5v14 M5 12h14",
    clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    folder:
      "M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7",
    money:
      "M3 5h18v14H3z M7 9h.01 M17 15h.01 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    building:
      "M4 22V4l8-2 8 2v18 M8 7h1 M15 7h1 M8 11h1 M15 11h1 M8 15h1 M15 15h1 M10 22v-3h4v3",
    info: "M12 16v-4 M12 8h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  };
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(svg.namespaceURI, "path");
    p.setAttribute("d", paths[name] || paths.file);
    svg.append(p);
    return svg;
  }
  const el = (tag, cls, text) =>
    $("<" + tag + ">")
      .addClass(cls || "")
      .text(text || "");
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat("th-TH", {
          dateStyle: "medium",
          timeZone: "Asia/Bangkok",
        }).format(new Date(value))
      : "—";
  const stamp = (value) =>
    value
      ? new Intl.DateTimeFormat("th-TH", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "Asia/Bangkok",
        }).format(new Date(value))
      : "—";
  const chip = (state) =>
    el("span", "status-chip " + state, states[state] || state);
  let ctx,
    caps,
    departments = [],
    directory = [],
    shell,
    panel,
    headerActions,
    current = "dashboard",
    busy = false,
    page = 1,
    query = "",
    filter = "",
    activeCategory = "",
    folderFilter = "",
    navigationSequence = 0;
  const allowed = (p) => caps.permissions.includes(p),
    userOptions = () =>
      Object.fromEntries(directory.map((u) => [u.id, u.email]));
  function button(text, fn, cls = "secondary", glyph) {
    const b = el("button", cls, text).attr("type", "button");
    if (glyph) b.prepend(icon(glyph));
    b.on("click", async function () {
      try {
        await fn(this);
      } catch (e) {
        await CoopAlerts.notifyError(e.message);
      }
    });
    return b;
  }
  function empty(title, description, action) {
    const n = el("div", "empty-state").append(
      el("div", "empty-icon").append(icon("folder")),
      el("h3", "", title),
      el("p", "", description),
    );
    if (action) n.append(action);
    return n;
  }
  function table(headers, rows, { enhance = true } = {}) {
    const t = el("table").append(
        el("thead").append(
          el("tr").append(
            headers.map((h) => el("th", "", h).attr("scope", "col")),
          ),
        ),
      ),
      body = el("tbody");
    for (const cells of rows) {
      const row = el("tr");
      for (const cell of cells)
        row.append(
          el("td").append(
            cell instanceof $ || cell instanceof Node
              ? cell
              : document.createTextNode(String(cell ?? "—")),
          ),
        );
      body.append(row);
    }
    t.append(body);
    const wrap = el("div", "table-wrap").append(t);
    if (enhance && rows.length && $.fn.DataTable)
      setTimeout(() => {
        if (t[0].isConnected && !$.fn.DataTable.isDataTable(t[0]))
          t.DataTable({
            paging: false,
            searching: false,
            info: false,
            order: [],
            columnDefs: [{ targets: -1, orderable: false }],
            language: { emptyTable: "ยังไม่มีรายการ", zeroRecords: "ไม่พบรายการ" },
          });
      }, 0);
    return wrap;
  }
  function card(title, content, action) {
    const h = el("div", "card-header").append(el("h2", "", title));
    if (action) h.append(action);
    return el("section", "card").append(h, content);
  }
  function banner(text) {
    return el("div", "helper-banner").append(
      icon("info"),
      el("span", "", text),
    );
  }
  async function run(b, job, message = "บันทึกเรียบร้อยแล้ว") {
    if (busy) return;
    busy = true;
    $(b).prop("disabled", true);
    CoopAlerts.showLoading();
    try {
      const result = await job();
      CoopAlerts.closeLoading();
      if (result?.scanStatus === "quarantined")
        await CoopAlerts.warning(
          "รับไฟล์เข้าพื้นที่กักกันแล้ว ยังดาวน์โหลดหรือส่งอนุมัติไม่ได้จนกว่าจะผ่านการตรวจมัลแวร์",
        );
      else if (result?.scanStatus === "infected")
        await CoopAlerts.warning(
          "ไฟล์ถูกกักกันเนื่องจากพบความเสี่ยง ไม่สามารถเปิดหรือส่งอนุมัติได้",
        );
      else await CoopAlerts.notifySuccess(message);
      await navigate(current);
    } catch (e) {
      CoopAlerts.closeLoading();
      await CoopAlerts.notifyError(e.message);
    } finally {
      busy = false;
      $(b).prop("disabled", false);
    }
  }
  const post = (path, data = {}, critical = false) =>
    ctx.api(
      path,
      "POST",
      data,
      critical ? { idempotencyKey: crypto.randomUUID() } : {},
    );
  const ask = async (title, fields) => {
    const r = await CoopAlerts.form(title, fields);
    return r.isConfirmed ? r.value : null;
  };
  function brand() {
    return el("a", "brand")
      .attr("href", "#dashboard")
      .append(
        el("span", "brand-symbol", "n").append(el("span", "", "p")),
        el("span", "brand-copy", "NonPaperCoop").append(
          el("small", "", "COOPERATIVE WORKSPACE"),
        ),
      );
  }
  function buildShell() {
    $("#workspace").children().addClass("legacy-content");
    $("body").addClass("app-mode");
    shell = el("div", "app-shell");
    const sidebar = el("aside", "sidebar")
      .attr({ "aria-label": "แถบนำทางหลัก", id: "workspace-sidebar" })
      .append(brand());
    const nav = el("nav").attr("aria-label", "เมนูหลัก");
    sidebar.append(nav);
    const items = [
      ["dashboard", "ภาพรวม", "grid"],
      ["documents", "เอกสารทั้งหมด", "file"],
      ["tasks", "งานรอพิจารณา", "check"],
      ["registries", "ทะเบียนสารบรรณ", "book"],
      ["meetings", "การประชุม", "calendar"],
      ["search", "ค้นหาเอกสาร", "search"],
      ["finance", "เอกสารการเงิน", "money"],
      ["procurement", "จัดซื้อจัดจ้าง", "folder"],
      ["member", "บริการสมาชิก", "users"],
      ["templates", "แม่แบบเอกสาร", "file"],
      ["retention", "จัดเก็บและ Legal Hold", "archive"],
      ["organization", "โครงสร้างองค์กร", "building", "org:manage"],
      ["users", "จัดการผู้ใช้", "users", "users:manage"],
      ["audit", "บันทึกตรวจสอบ", "shield", "audit:read"],
      ["reports", "รายงาน", "chart"],
    ];
    nav.append(el("div", "sidebar-section-label", "WORKSPACE"));
    for (const [key, label, glyph, permission] of items) {
      if (permission && !allowed(permission)) continue;
      if (key === "templates")
        nav.append(el("div", "sidebar-section-label", "MANAGEMENT"));
      nav.append(
        button(label, () => navigate(key), "nav-item", glyph).attr({
          "data-page": key,
        }),
      );
    }
    sidebar.append(
      el("div", "sidebar-bottom").append(
        el("div", "environment-label").append(
          el("span", "status-dot"),
          document.createTextNode("TEST WORKSPACE"),
        ),
        el("small", "", "ใช้ข้อมูลสมมติ · แยกจากระบบเดิม"),
      ),
    );
    const main = el("div", "shell-body"),
      top = el("div", "app-topbar");
    const menu = button(
      "",
      () => toggleMenu(),
      "ghost menu-button",
      "menu",
    ).attr({
      "aria-label": "เปิดเมนู",
      "aria-controls": "workspace-sidebar",
      "aria-expanded": "false",
    });
    top.append(
      menu,
      el("div", "breadcrumb").append(
        el("span", "", "พื้นที่ทำงาน"),
        el("span", "", "/"),
        el("strong").attr("id", "breadcrumb-current"),
      ),
    );
    const actions = el("div", "topbar-actions").append(
      el("span", "topbar-date", date(new Date())),
      button("", () => showNotifications(), "ghost", "bell").attr(
        "aria-label",
        "การแจ้งเตือน",
      ),
      el("div", "avatar", ctx.user.email[0].toUpperCase()),
      el("div", "user-caption", ctx.user.email).append(
        el("small", "", roles[ctx.user.role] || ctx.user.role),
      ),
      button("", () => ctx.reauth(), "ghost", "shield").attr({
        "aria-label": "ยืนยันตัวตนซ้ำด้วย Google",
        title: "ยืนยันตัวตนซ้ำด้วย Google",
      }),
      button("", () => ctx.logout(), "ghost", "logout").attr({
        "aria-label": "ออกจากระบบ",
        title: "ออกจากระบบ",
      }),
    );
    top.append(actions);
    const content = el("div", "page-content");
    const heading = el("div", "page-header").append(
      el("div").append(
        el("h1").attr({ id: "page-title", tabindex: "-1" }),
        el("p").attr("id", "page-description"),
      ),
    );
    headerActions = el("div", "page-actions");
    heading.append(headerActions);
    panel = el("div", "module-view").attr({
      id: "module-panel",
      "aria-live": "polite",
    });
    content.append(
      heading,
      panel,
      el("footer", "app-footer").append(
        el("span", "", "NonPaperCoop · Cooperative workspace"),
        el("span", "", "TEST · ใช้ข้อมูลสมมติเท่านั้น"),
      ),
    );
    main.append(top, content);
    shell.append(
      sidebar,
      el("div", "nav-overlay")
        .attr("aria-hidden", "true")
        .on("click", () => toggleMenu(false)),
      main,
    );
    $("#workspace").append(shell);
    $(document).on("keydown.enterprise", (e) => {
      if (e.key === "Escape") toggleMenu(false);
    });
  }
  function toggleMenu(open) {
    const next = open === undefined ? !$("body").hasClass("menu-open") : open;
    $("body").toggleClass("menu-open", next);
    $(".shell-body").prop("inert", next);
    $(".menu-button").attr("aria-expanded", String(next));
    if (next) $(".sidebar .nav-item.active").trigger("focus");
    else if (open === false) $(".menu-button:visible").trigger("focus");
  }
  function documentTitle(d) {
    return el("div", "document-title").append(
      el("span", "file-tile").append(icon("file")),
      el("div", "truncate").append(
        el("strong", "", d.title),
        el(
          "small",
          "",
          (categories[d.category] || d.category) + " · v" + d.version,
        ),
      ),
    );
  }
  async function dashboard() {
    const [overview, list, notices] = await Promise.all([
      ctx.api("/reports/overview"),
      ctx.api("/documents?pageSize=5"),
      ctx.api("/notifications"),
    ]);
    const welcome = el("section", "welcome-card").append(
      el("div").append(
        el("span", "welcome-eyebrow", "YOUR WORKSPACE, CONNECTED."),
        el("h2", "", "ยินดีต้อนรับสู่วันทำงานที่คล่องตัว"),
        el(
          "p",
          "",
          "เอกสาร งานรอพิจารณา และเรื่องสำคัญของคุณ รวมไว้ในพื้นที่เดียว เริ่มงานถัดไปได้จากตรงนี้",
        ),
      ),
    );
    if (allowed("document:create"))
      welcome.append(button("สร้างเอกสารร่าง", () => editDocument(), "", "plus"));
    const metrics = el("div", "metrics-grid");
    for (const [label, value, glyph, theme, foot] of [
      ["เอกสารที่เข้าถึงได้", overview.visibleTotal, "file", "", "ตามสิทธิ์ของคุณ"],
      [
        "งานรอพิจารณา",
        overview.pendingTasks,
        "clock",
        "amber",
        "งานที่ได้รับมอบหมาย",
      ],
      [
        "อนุมัติแล้ว",
        overview.states.approved || 0,
        "check",
        "blue",
        overview.sampled ? "จาก 200 รายการล่าสุด" : "พร้อมดำเนินการต่อ",
      ],
      [
        "เกินกำหนด",
        overview.overdueTasks,
        "calendar",
        "rose",
        "ติดตามเพื่อให้งานเดินหน้า",
      ],
    ])
      metrics.append(
        el("article", "metric-card " + theme).append(
          el("div", "metric-label").append(
            document.createTextNode(label),
            el("span", "metric-icon").append(icon(glyph)),
          ),
          el("div", "metric-value", String(value)),
          el("div", "metric-foot", foot),
        ),
      );
    const rows = list.items.map((d) => [
      documentTitle(d),
      chip(d.state),
      button("เปิด", () => viewDocument(d.id), "quiet-link"),
    ]);
    const recent = el("section", "card flush").append(
      el("div", "card-header").append(
        el("h2", "", "เอกสารล่าสุด"),
        button("ดูทั้งหมด", () => navigate("documents"), "quiet-link"),
      ),
      rows.length
        ? table(["เอกสาร", "สถานะ", ""], rows, { enhance: false })
        : empty(
            "พื้นที่สำหรับงานชิ้นถัดไป",
            "เมื่อสร้างหรือได้รับสิทธิ์เอกสาร รายการล่าสุดจะปรากฏที่นี่",
            allowed("document:create")
              ? button(
                  "สร้างเอกสารแรก",
                  () => editDocument(),
                  "secondary",
                  "plus",
                )
              : null,
          ),
    );
    const quick = el("div");
    for (const [title, desc, glyph, route] of [
      ["งานรอพิจารณา", "ติดตามและดำเนินงานที่ได้รับมอบหมาย", "check", "tasks"],
      ["ทะเบียนสารบรรณ", "ค้นหาเลขทะเบียนและรายการส่งต่อ", "book", "registries"],
      ["ประชุมร่วมกัน", "วาระ องค์ประชุม และมติที่ตรวจสอบได้", "calendar", "meetings"],
    ])
      quick.append(
        el("div", "quick-action").append(
          el("span", "icon-container").append(icon(glyph)),
          el("div").append(el("strong", "", title), el("small", "", desc)),
          button("", () => navigate(route), "ghost", "arrow").attr(
            "aria-label",
            title,
          ),
        ),
      );
    const notifications = el("div");
    for (const n of notices.slice(0, 4))
      notifications.append(
        el("div", "activity-item").append(
          el("span", "activity-dot"),
          el("div").append(
            el("strong", "", noticeLabel(n.event_type)),
            el("small", "", stamp(n.created_at)),
          ),
        ),
      );
    if (!notices.length)
      notifications.append(el("p", "muted", "ยังไม่มีการแจ้งเตือนใหม่"));
    panel.append(
      welcome,
      metrics,
      el("div", "dashboard-grid").append(
        recent,
        el("div").append(
          card("ทางลัดการทำงาน", quick),
          card("ความเคลื่อนไหวของคุณ", notifications),
        ),
      ),
    );
  }
  function noticeLabel(type) {
    if (type.startsWith("workflow.overdue.")) return "มีงานพิจารณาเกินกำหนด";
    return (
      {
        "workflow.assigned": "มีงานพิจารณาใหม่",
        "workflow.delegated": "ได้รับมอบหมายงานต่อ",
        "workflow.approved": "เอกสารได้รับอนุมัติ",
        "workflow.returned": "มีเอกสารส่งกลับแก้ไข",
        "workflow.rejected": "เอกสารไม่ได้รับอนุมัติ",
        "document.distributed": "มีเอกสารส่งถึงคุณ",
      }[type] || "มีความเคลื่อนไหวในงานเอกสาร"
    );
  }
  async function showNotifications() {
    const notices = await ctx.api("/notifications"),
      n = el("div");
    for (const item of notices) {
      n.append(
        el("div", "file-row").append(
          el("div").append(
            el("strong", "", noticeLabel(item.event_type)),
            el("small", "", stamp(item.created_at)),
          ),
          button(
            "เปิด",
            async () => {
              await post("/notifications/" + item.id + "/read");
              if (item.document_id) await viewDocument(item.document_id);
            },
            "secondary",
          ),
        ),
      );
    }
    await CoopAlerts.show(
      "การแจ้งเตือน",
      notices.length
        ? n
        : empty("ทุกอย่างเป็นปัจจุบัน", "เมื่อมีงานหรือเอกสารใหม่ เราจะแจ้งให้ทราบที่นี่"),
    );
  }
  async function documents() {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      q: query,
      category: activeCategory,
      state: filter,
      folderId: current === "search" ? folderFilter : "",
    });
    const data = await ctx.api("/documents?" + params);
    const search = el("label", "search-box").append(
      icon("search"),
      el("input")
        .attr({
          placeholder: "ค้นหาชื่อหรือเนื้อหาเอกสาร",
          "aria-label": "ค้นหาเอกสาร",
          type: "search",
        })
        .val(query),
    );
    const select = el("select")
      .attr("aria-label", "กรองสถานะ")
      .append(el("option", "", "ทุกสถานะ").val(""));
    for (const [k, label] of Object.entries(states))
      if (
        [
          "draft",
          "in_review",
          "returned",
          "approved",
          "signed",
          "registered",
          "distributed",
          "archived",
          "rejected",
        ].includes(k)
      )
        select.append(el("option", "", label).val(k));
    select.val(filter);
    const filters = el("div", "filter-bar").append(
      search,
      select,
      button(
        "ค้นหา",
        () => {
          query = search.find("input").val();
          filter = select.val();
          page = 1;
          return navigate(current);
        },
        "secondary",
        "search",
      ),
    );
    search.find("input").on("keydown", (e) => {
      if (e.key === "Enter") {
        query = e.target.value;
        page = 1;
        navigate(current);
      }
    });
    select.on("change", () => {
      filter = select.val();
      page = 1;
      navigate(current);
    });
    if (current === "search") {
      const folders = await ctx.api("/repository/folders");
      const folderSelect = el("select")
        .attr("aria-label", "โฟลเดอร์")
        .append(el("option", "", "ทุกโฟลเดอร์").val(""));
      for (const f of folders)
        folderSelect.append(
          el("option", "", (f.parent_id ? "↳ " : "") + f.name).val(f.id),
        );
      folderSelect.val(folderFilter).on("change", () => {
        folderFilter = folderSelect.val();
        page = 1;
        navigate(current);
      });
      filters.append(
        folderSelect,
        button("สร้างโฟลเดอร์", () => newFolder(folders)),
      );
    }
    const rows = data.items.map((d) => [
      documentTitle(d),
      el("span", "data-meta", classifications[d.classification]),
      chip(d.state),
      el("span", "data-meta", date(d.created_at)),
      button("รายละเอียด", () => viewDocument(d.id), "secondary"),
    ]);
    const pagination = el("div", "table-pagination").append(
      el(
        "span",
        "",
        data.total
          ? "แสดง " +
              ((page - 1) * 25 + 1) +
              "–" +
              Math.min(page * 25, data.total) +
              " จาก " +
              data.total +
              " เอกสาร"
          : "ยังไม่มีรายการ",
      ),
      el("div").append(
        button("ก่อนหน้า", () => {
          page--;
          return navigate(current);
        }).prop("disabled", page <= 1),
        button("ถัดไป", () => {
          page++;
          return navigate(current);
        }).prop("disabled", page * 25 >= data.total),
      ),
    );
    panel.append(
      el("section", "card flush").append(
        filters,
        rows.length
          ? table(["เอกสาร", "การเข้าถึง", "สถานะ", "สร้างเมื่อ", ""], rows)
          : empty(
              query ? "ไม่พบเอกสารที่ค้นหา" : "เริ่มจัดเอกสารให้เป็นระบบ",
              query
                ? "ลองใช้คำค้นที่สั้นลง หรือเปลี่ยนตัวกรอง"
                : "สร้างเอกสารร่างหรือรอรับสิทธิ์จากเจ้าของเอกสาร รายการจะแสดงตามสิทธิ์ของคุณ",
              allowed("document:create")
                ? button(
                    "สร้างเอกสารร่าง",
                    () => editDocument(),
                    "secondary",
                    "plus",
                  )
                : null,
            ),
        pagination,
      ),
    );
  }
  async function editDocument(record) {
    const mine = Object.fromEntries([
      ["", "เอกสารส่วนตัว"],
      ...departments
        .filter((d) => caps.departments.includes(d.id))
        .map((d) => [d.id, d.code + " · " + d.name]),
    ]);
    const cat = record?.category || activeCategory || "general";
    const fields = [
      {
        name: "title",
        label: "ชื่อเอกสาร",
        required: true,
        maxLength: 250,
        value: record?.title || "",
      },
      {
        name: "category",
        label: "ประเภทเอกสาร",
        type: "select",
        options: categories,
        value: cat,
      },
      {
        name: "classification",
        label: "การเข้าถึงเอกสาร",
        type: "select",
        options: classifications,
        value:
          record?.classification ||
          (["finance", "procurement", "member", "board"].includes(cat)
            ? "restricted"
            : "internal"),
      },
      {
        name: "departmentId",
        label: "ฝ่ายเจ้าของเอกสาร",
        type: "select",
        options: mine,
        value: record?.department_id || "",
      },
      {
        name: "description",
        label: "เนื้อหา / รายละเอียด",
        type: "textarea",
        maxLength: 10000,
        value: record?.description || "",
      },
      {
        name: "tags",
        label: "คำค้นเพิ่มเติม",
        value: (record?.tags || []).join(", "),
        help: "คั่นแต่ละคำด้วยเครื่องหมาย , เช่น ประชุม, ภายใน",
      },
    ];
    const data = await ask(record ? "แก้ไขเอกสารร่าง" : "สร้างเอกสารร่าง", fields);
    if (!data) return;
    const previous =
      record?.category === data.category ? record.domain || {} : {};
    const domainFields = {
      general: [],
      saraban: [
        ["direction", "ประเภทสารบรรณ"],
        ["sender", "ผู้ส่ง"],
        ["recipient", "ผู้รับ"],
      ],
      finance: [
        ["amount", "วงเงิน"],
        ["currency", "สกุลเงิน"],
        ["budgetReference", "อ้างอิงงบประมาณ"],
        ["purpose", "วัตถุประสงค์"],
      ],
      procurement: [
        ["amount", "วงเงิน"],
        ["currency", "สกุลเงิน"],
        ["vendorReference", "อ้างอิงผู้เสนอราคา"],
        ["method", "วิธีการจัดซื้อ"],
        ["contractReference", "อ้างอิงสัญญา"],
      ],
      member: [
        ["testSubjectReference", "รหัสผู้ยื่นคำขอสมมติ"],
        ["requestType", "ประเภทคำขอ"],
        ["purpose", "วัตถุประสงค์"],
      ],
      board: [
        ["meetingReference", "อ้างอิงการประชุม"],
        ["purpose", "วัตถุประสงค์"],
      ],
    }[data.category];
    const extras = domainFields.map(([name, label]) => ({
      name,
      label,
      type: name === "amount" ? "number" : "text",
      min: name === "amount" ? 0 : undefined,
      step: name === "amount" ? "0.01" : undefined,
      maxLength: 1000,
      value:
        previous[name] ??
        (name === "currency" ? "THB" : name === "amount" ? 0 : ""),
      help:
        name === "testSubjectReference"
          ? "ใช้ข้อมูลสมมติเท่านั้น ไม่ใช้ข้อมูลสมาชิกจริง"
          : undefined,
    }));
    const sensitive = ["finance", "procurement", "member", "board"].includes(
      data.category,
    );
    if (sensitive && data.classification === "internal")
      extras.unshift({
        name: "classification",
        label: "การเข้าถึงเอกสารสำคัญ",
        type: "select",
        options: { restricted: "จำกัดผู้เข้าถึง", confidential: "ลับ" },
        required: true,
      });
    data.domain = {};
    if (extras.length) {
      const values = await ask(
        "รายละเอียด · " + categories[data.category],
        extras,
      );
      if (!values) return;
      if (values.classification) {
        data.classification = values.classification;
        delete values.classification;
      }
      data.domain = values;
    }
    data.departmentId = data.departmentId || null;
    data.tags = data.tags
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (record) data.version = record.version;
    await run(null, () =>
      ctx.api(
        record ? "/documents/" + record.id : "/documents",
        record ? "PATCH" : "POST",
        data,
      ),
    );
  }
  async function viewDocument(id) {
    const r = await ctx.api("/documents/" + id),
      n = el("div");
    const grid = el("div", "detail-grid");
    for (const [label, value] of [
      ["ประเภท", categories[r.category]],
      ["สถานะ", states[r.state]],
      ["การเข้าถึง", classifications[r.classification]],
      ["ฉบับที่", String(r.current_revision)],
    ])
      grid.append(
        el("div").append(el("label", "", label), el("strong", "", value)),
      );
    n.append(
      grid,
      el("div", "document-body", r.description || "ยังไม่มีรายละเอียด"),
      el("p", "data-meta", (r.tags || []).map((t) => "#" + t).join(" ")),
    );
    if (Object.keys(r.domain || {}).length) {
      const labels = {
        amount: "วงเงิน",
        currency: "สกุลเงิน",
        budgetReference: "อ้างอิงงบประมาณ",
        purpose: "วัตถุประสงค์",
        vendorReference: "อ้างอิงผู้เสนอราคา",
        method: "วิธีการจัดซื้อ",
        contractReference: "อ้างอิงสัญญา",
        testSubjectReference: "รหัสผู้ยื่นคำขอสมมติ",
        requestType: "ประเภทคำขอ",
        meetingReference: "อ้างอิงการประชุม",
        direction: "ประเภทสารบรรณ",
        sender: "ผู้ส่ง",
        recipient: "ผู้รับ",
      };
      const fields = el("div", "detail-grid");
      for (const [key, value] of Object.entries(r.domain))
        fields.append(
          el("div").append(
            el("label", "", labels[key] || key),
            el("strong", "", String(value ?? "—")),
          ),
        );
      n.append(fields);
    }
    n.append(el("h3", "", "ไฟล์แนบ"));
    if (!r.files.length) n.append(el("p", "muted", "ยังไม่มีไฟล์แนบ"));
    for (const f of r.files)
      n.append(
        el("div", "file-row").append(
          el("span", "file-tile").append(icon("file")),
          el("div").append(
            el("strong", "", f.original_name),
            el(
              "small",
              "",
              Math.ceil(f.byte_size / 1024) +
                " KB · " +
                f.sha256.slice(0, 12) +
                "…",
            ),
          ),
          chip(f.scan_status),
          f.scan_status === "clean"
            ? button("ดาวน์โหลด", () => download(r.id, f), "secondary")
            : button(
                "ตรวจอีกครั้ง",
                (b) =>
                  run(b, () =>
                    post("/documents/" + r.id + "/files/" + f.id + "/scan"),
                  ),
                "secondary",
              ),
        ),
      );
    if (
      r.owner_id === ctx.user.id &&
      (r.acl.length || (r.groupAcl || []).length)
    ) {
      n.append(el("h3", "", "สิทธิ์การเข้าถึง"));
      for (const a of r.acl)
        n.append(
          el("div", "file-row").append(
            el("div").append(
              el("strong", "", a.email),
              el(
                "small",
                "",
                a.permission === "write" ? "อ่านและแก้ไขร่าง" : "อ่าน",
              ),
            ),
            button(
              "เพิกถอน",
              async (b) => {
                if (
                  (await CoopAlerts.confirmDanger("เพิกถอนสิทธิ์ " + a.email))
                    .isConfirmed
                )
                  await run(b, () =>
                    post("/documents/" + r.id + "/revoke-access", {
                      userId: a.user_id,
                      permission: a.permission,
                    }),
                  );
              },
              "danger",
            ),
          ),
        );
      for (const a of r.groupAcl || [])
        n.append(
          el("div", "file-row").append(
            el("div").append(
              el("strong", "", "กลุ่ม: " + a.name),
              el(
                "small",
                "",
                a.permission === "write" ? "อ่านและแก้ไขร่าง" : "อ่าน",
              ),
            ),
            button(
              "เพิกถอน",
              async (b) => {
                if (
                  (await CoopAlerts.confirmDanger("เพิกถอนสิทธิ์กลุ่ม " + a.name))
                    .isConfirmed
                )
                  await run(b, () =>
                    post("/documents/" + r.id + "/revoke-access", {
                      groupId: a.group_id,
                      permission: a.permission,
                    }),
                  );
              },
              "danger",
            ),
          ),
        );
    }
    const actions = el("div", "detail-actions");
    const write = r.canWrite;
    if (write && ["draft", "returned"].includes(r.state)) {
      actions.append(
        button("แก้ไขร่าง", () => editDocument(r)),
        button("แนบไฟล์", () => upload(r)),
        button("ส่งพิจารณา", () => submit(r)),
        button(
          "ลบ",
          async (b) => {
            if ((await CoopAlerts.confirmDanger(r.title)).isConfirmed)
              await run(b, () =>
                ctx.api("/documents/" + r.id, "DELETE", { version: r.version }),
              );
          },
          "danger",
        ),
      );
    }
    if (r.owner_id === ctx.user.id)
      actions.append(
        button("จัดการผู้เข้าถึง", () => share(r)),
        button("ให้สิทธิ์กลุ่ม", () => shareGroup(r)),
      );
    actions.append(button("จัดเข้าโฟลเดอร์", () => putInFolder(r)));
    if (write && ["approved", "signing_pending"].includes(r.state))
      actions.append(button("ลงนาม", () => sign(r)));
    if (allowed("registry:assign") && r.state === "signed")
      actions.append(button("ออกเลขทะเบียน", () => register(r)));
    if (write && ["registered", "distributed"].includes(r.state))
      actions.append(button("ส่งต่อเอกสาร", () => distribute(r)));
    if (["registered", "distributed", "archived"].includes(r.state))
      actions.append(
        button("ยืนยันรับทราบ", (b) =>
          run(b, () => post("/documents/" + r.id + "/acknowledge")),
        ),
      );
    if (allowed("retention:manage")) {
      if (["registered", "distributed"].includes(r.state))
        actions.append(button("เก็บถาวร", () => archive(r)));
      actions.append(
        button("Legal Hold", () => hold(r)),
        button("ขอทำลาย / ตรวจสอบ", () => disposal(r)),
      );
    }
    if (write && ["draft", "in_review", "returned"].includes(r.state))
      actions.append(
        button(
          "ยกเลิกเอกสาร",
          async (b) => {
            const reason = await CoopAlerts.promptReason("เหตุผลที่ยกเลิก");
            if (reason.isConfirmed)
              await run(b, () =>
                post("/documents/" + r.id + "/cancel", {
                  version: r.version,
                  reason: reason.value,
                }),
              );
          },
          "danger",
        ),
      );
    actions.append(
      button("ประวัติ", () => timeline(r.id)),
      button("ตรวจความสมบูรณ์", () => verify(r.id)),
      button("พิมพ์ / PDF", () => printDocument(r)),
    );
    n.append(actions);
    await CoopAlerts.show(r.title, n, { width: 880 });
  }
  async function upload(r) {
    const f = await ask("แนบไฟล์เอกสาร", [
      {
        name: "file",
        label: "PDF หรือข้อความ UTF-8 (ไม่เกิน 10 MB)",
        type: "file",
        required: true,
        accept: ".pdf,.txt",
        help: "ไฟล์จะดาวน์โหลดหรือส่งพิจารณาได้เมื่อผ่านการตรวจมัลแวร์เท่านั้น",
      },
    ]);
    if (!f) return;
    await run(null, async () => {
      const data = new FormData();
      data.append("file", f.file);
      const response = await fetch("/api/v1/documents/" + r.id + "/files", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRF-Token": ctx.csrf(),
          "X-Document-Version": String(r.version),
        },
        body: data,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || "แนบไฟล์ไม่สำเร็จ");
      return result.data;
    });
  }
  async function download(id, file) {
    const response = await fetch(
      "/api/v1/documents/" + id + "/files/" + file.id + "/download",
      { credentials: "same-origin" },
    );
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.error?.message || "ดาวน์โหลดไม่สำเร็จ");
    }
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = file.original_name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function share(r) {
    const d = await ask("ให้สิทธิ์เข้าถึงเอกสาร", [
      {
        name: "userId",
        label: "ผู้ใช้งาน",
        type: "select",
        options: userOptions(),
        required: true,
      },
      {
        name: "permission",
        label: "สิทธิ์",
        type: "select",
        options: { read: "อ่าน", write: "อ่านและแก้ไขร่าง" },
      },
    ]);
    if (d) await run(null, () => post("/documents/" + r.id + "/acl", d));
  }
  async function shareGroup(r) {
    const groups = await ctx.api("/organization/groups");
    const d = await ask("ให้สิทธิ์กลุ่ม", [
      {
        name: "groupId",
        label: "กลุ่ม",
        type: "select",
        options: Object.fromEntries(
          groups.groups.filter((g) => g.active).map((g) => [g.id, g.name]),
        ),
        required: true,
      },
      {
        name: "permission",
        label: "สิทธิ์",
        type: "select",
        options: { read: "อ่าน", write: "อ่านและแก้ไขร่าง" },
      },
    ]);
    if (d) await run(null, () => post("/documents/" + r.id + "/group-acl", d));
  }
  async function newFolder(folders) {
    const d = await ask("สร้างโฟลเดอร์ส่วนตัว", [
      { name: "name", label: "ชื่อโฟลเดอร์", required: true, maxLength: 150 },
      {
        name: "parentId",
        label: "โฟลเดอร์หลัก",
        type: "select",
        options: Object.fromEntries([
          ["", "ระดับบนสุด"],
          ...folders.map((f) => [f.id, f.name]),
        ]),
      },
    ]);
    if (d)
      await run(null, () =>
        post("/repository/folders", {
          name: d.name,
          parentId: d.parentId || null,
        }),
      );
  }
  async function putInFolder(r) {
    const folders = await ctx.api("/repository/folders");
    if (!folders.length) {
      await newFolder([]);
      return;
    }
    const d = await ask("จัดเอกสารเข้าโฟลเดอร์", [
      {
        name: "folderId",
        label: "โฟลเดอร์ส่วนตัว",
        type: "select",
        options: Object.fromEntries(folders.map((f) => [f.id, f.name])),
        required: true,
      },
      {
        name: "enabled",
        label: "เพิ่มในโฟลเดอร์ (เอาเครื่องหมายออกเพื่อนำออก)",
        type: "checkbox",
        value: true,
      },
    ]);
    if (d) await run(null, () => post("/documents/" + r.id + "/folder", d));
  }

  async function submit(r) {
    const defs = (await ctx.api("/workflows/definitions")).filter(
      (d) => d.status === "published",
    );
    if (!defs.length) {
      await CoopAlerts.warning(
        "ยังไม่มี Workflow ที่เผยแพร่ ผู้ดูแลต้องสร้างและเผยแพร่ก่อน",
      );
      return;
    }
    const d = await ask("ส่งเอกสารพิจารณา", [
      {
        name: "definitionId",
        label: "ขั้นตอนการพิจารณา",
        type: "select",
        options: Object.fromEntries(
          defs.map((x) => [x.id, x.name + " · v" + x.version]),
        ),
        required: true,
      },
    ]);
    if (d && (await CoopAlerts.confirmSubmit(r.title)).isConfirmed)
      await run(null, () =>
        post(
          "/documents/" + r.id + "/submit",
          { version: r.version, ...d },
          true,
        ),
      );
  }
  async function timeline(id) {
    const rows = await ctx.api("/documents/" + id + "/timeline"),
      n = el("div");
    for (const row of rows)
      n.append(
        el("div", "timeline-row").append(
          el("strong", "", row.action),
          el("small", "", stamp(row.created_at)),
        ),
      );
    await CoopAlerts.show(
      "ประวัติการดำเนินการ",
      rows.length ? n : empty("ยังไม่มีเหตุการณ์", "การดำเนินการจะปรากฏตามลำดับเวลา"),
    );
  }
  async function verify(id) {
    const r = await ctx.api("/documents/" + id + "/verify"),
      n = el("div").append(
        banner(
          r.integrityValid
            ? "ตรวจสอบ Metadata และ Hash ของหลักฐานที่จัดเก็บตรงกัน"
            : "ตรวจพบความไม่ตรงกัน ห้ามใช้เอกสารนี้อ้างอิง",
        ),
      );
    n.append(
      el("div", "hash-value", r.digest || "ไม่สามารถคำนวณ Hash ที่ถูกต้อง"),
      el(
        "p",
        "muted",
        r.signed
          ? "มีหลักฐานแสดงเจตนาลงนาม " + r.signatures.length + " รายการ"
          : "ยังไม่มีหลักฐานลงนาม",
      ),
      el(
        "p",
        "data-meta",
        "หลักฐานนี้ไม่ใช่ Cryptographic PDF Signature หรือ Trusted Timestamp",
      ),
    );
    await CoopAlerts.show("ตรวจสอบความสมบูรณ์", n);
  }
  async function sign(r) {
    const hash = await ctx.api("/documents/" + r.id + "/signing/digest");
    const n = el("div").append(
      el("p", "", "ตรวจสอบเนื้อหาและ Hash ก่อนยืนยันเจตนาลงนาม"),
      el("div", "hash-value", hash.sha256),
      el(
        "p",
        "data-meta",
        "หลักฐานแสดงเจตนาแบบอิเล็กทรอนิกส์ ไม่ใช่ลายเซ็น PDF ด้วยใบรับรองดิจิทัล",
      ),
    );
    const confirm = await CoopAlerts.show("ยืนยันเจตนาลงนาม", n, {
      showCancelButton: true,
      focusCancel: true,
      allowOutsideClick: false,
    });
    if (!confirm.isConfirmed) return;
    const d = await ask("ระบุเจตนาลงนาม", [
      {
        name: "intent",
        label: "ข้อความแสดงเจตนา",
        required: true,
        maxLength: 500,
        value: "ข้าพเจ้าได้ตรวจสอบและยืนยันลงนามเอกสารฉบับนี้",
      },
    ]);
    if (d)
      await run(null, async () => {
        const pending =
          r.state === "approved"
            ? await post(
                "/documents/" + r.id + "/signing/request",
                { version: hash.version },
                true,
              )
            : { version: hash.version };
        return post(
          "/documents/" + r.id + "/signing/confirm",
          { version: pending.version, digest: hash.sha256, intent: d.intent },
          true,
        );
      });
  }
  async function register(r) {
    const d = await ask("ออกเลขทะเบียน", [
      {
        name: "type",
        label: "ประเภททะเบียน",
        type: "select",
        options: { inbound: "รับเข้า", outbound: "ส่งออก", internal: "ภายใน" },
      },
    ]);
    if (
      d &&
      (await CoopAlerts.confirmSubmit("ออกเลขทะเบียนให้ " + r.title)).isConfirmed
    )
      await run(null, () =>
        post(
          "/documents/" + r.id + "/register",
          { version: r.version, ...d },
          true,
        ),
      );
  }
  async function distribute(r) {
    const d = await ask("ส่งต่อเอกสาร", [
      {
        name: "recipients",
        label: "ผู้รับเอกสาร",
        type: "multiple",
        options: userOptions(),
        required: true,
        help: "กด Ctrl หรือ Command เพื่อเลือกหลายรายการ",
      },
    ]);
    if (d)
      await run(null, () =>
        post("/documents/" + r.id + "/distribute", {
          version: r.version,
          ...d,
        }),
      );
  }
  async function printDocument(r) {
    const n = el("div", "print-document").append(
      el("h2", "", r.title),
      el("p", "muted", categories[r.category] + " · " + date(r.created_at)),
      el("div", "document-body", r.description || ""),
      el(
        "p",
        "data-meta",
        "เอกสารจาก NonPaperCoop TEST · " + classifications[r.classification],
      ),
      button("พิมพ์ / บันทึกเป็น PDF", () => window.print(), "secondary no-print"),
    );
    await CoopAlerts.show("ตัวอย่างก่อนพิมพ์", n, { width: 850 });
  }
  async function tasks() {
    const data = await ctx.api("/tasks/my");
    panel.append(
      banner(
        "งานอนุมัติและลงนามต้องยืนยันตัวตนซ้ำ เอกสารสำคัญจะถูกบล็อกหากยังไม่มีนโยบาย Assurance ที่รองรับ",
      ),
    );
    const rows = data.map((t) => [
      el("div", "document-title").append(
        el("span", "file-tile").append(icon("check")),
        el("div").append(
          el("strong", "", t.title),
          el("small", "", t.overdue ? "เกินกำหนด" : "กำหนด " + stamp(t.due_at)),
        ),
      ),
      el("span", "data-meta", "ขั้นที่ " + (t.step_no + 1)),
      el("div", "link-row").append(
        button("เอกสาร", () => viewDocument(t.document_id)),
        button("อนุมัติ", (b) => taskAction(b, t, "approve"), ""),
        button("ส่งกลับ", (b) => taskAction(b, t, "return")),
        button("ไม่อนุมัติ", (b) => taskAction(b, t, "reject"), "danger"),
        button("มอบหมาย", () => delegateTask(t)),
      ),
    ]);
    panel.append(
      card(
        "งานที่ได้รับมอบหมาย",
        rows.length
          ? table(["เอกสาร", "ขั้นตอน", "ดำเนินการ"], rows)
          : empty("ไม่มีงานค้างในขณะนี้", "เมื่อมีงานที่มอบหมายถึงคุณ รายการจะปรากฏที่นี่"),
      ),
    );
    const defs = await ctx.api("/workflows/definitions");
    const rows2 = defs.map((d) => [
      el("div").append(
        el("strong", "", d.name),
        el("small", "data-meta", d.code + " · v" + d.version),
      ),
      el(
        "span",
        "data-meta",
        d.definition.steps.map((s) => s.name + " (" + s.mode + ")").join(" → "),
      ),
      chip(d.status),
      d.status === "draft" && allowed("workflow:manage")
        ? button("เผยแพร่", async (b) => {
            if ((await CoopAlerts.confirmSubmit(d.name)).isConfirmed)
              await run(b, () =>
                post("/workflows/definitions/" + d.id + "/publish"),
              );
          })
        : el("span", "data-meta", "คงรุ่นเดิมไว้"),
    ]);
    panel.append(
      card(
        "ขั้นตอนการพิจารณา",
        rows2.length
          ? table(["Workflow", "ขั้นตอน", "สถานะ", ""], rows2)
          : empty("ยังไม่มี Workflow", "กำหนดผู้พิจารณาและเผยแพร่ก่อนส่งเอกสาร"),
        allowed("workflow:manage")
          ? button("สร้าง Workflow", () => newWorkflow(), "secondary", "plus")
          : null,
      ),
    );
  }
  async function taskAction(b, t, action) {
    const confirm = await (
      action === "approve"
        ? CoopAlerts.confirmApprove
        : action === "reject"
          ? CoopAlerts.confirmReject
          : CoopAlerts.confirmReturn
    )(t.title);
    if (!confirm.isConfirmed) return;
    let reason = "";
    if (action !== "approve") {
      const r = await CoopAlerts.promptReason("ระบุเหตุผล");
      if (!r.isConfirmed) return;
      reason = r.value;
    }
    await run(b, () =>
      post(
        "/tasks/" + t.id + "/" + action,
        { version: t.version, reason },
        true,
      ),
    );
  }
  async function delegateTask(t) {
    const d = await ask("มอบหมายผู้พิจารณาแทน", [
      {
        name: "assigneeId",
        label: "ผู้รับมอบหมาย",
        type: "select",
        options: userOptions(),
        required: true,
      },
      {
        name: "reason",
        label: "เหตุผล",
        type: "textarea",
        required: true,
        maxLength: 1000,
      },
    ]);
    if (d)
      await run(null, () =>
        post("/tasks/" + t.id + "/delegate", { version: t.version, ...d }),
      );
  }
  async function newWorkflow() {
    const data = await ask("สร้าง Workflow", [
      {
        name: "code",
        label: "รหัส (A–Z, 0–9, _)",
        required: true,
        maxLength: 40,
      },
      { name: "name", label: "ชื่อ Workflow", required: true, maxLength: 150 },
      {
        name: "version",
        label: "รุ่น",
        type: "number",
        min: 1,
        value: 1,
        required: true,
      },
      {
        name: "stepName",
        label: "ชื่อขั้นตอนแรก",
        value: "ตรวจสอบเอกสาร",
        required: true,
        maxLength: 100,
      },
      {
        name: "assignees",
        label: "ผู้พิจารณาขั้นแรก",
        type: "multiple",
        options: userOptions(),
        required: true,
      },
      {
        name: "mode",
        label: "เงื่อนไขขั้นแรก",
        type: "select",
        options: { all: "ทุกคนต้องอนุมัติ", any: "คนใดคนหนึ่งอนุมัติ" },
      },
      {
        name: "dueHours",
        label: "กำหนดพิจารณาภายใน (ชั่วโมง)",
        type: "number",
        min: 1,
        max: 8760,
        value: 24,
        required: true,
      },
      {
        name: "nextAssignees",
        label: "ขั้นที่สอง (ไม่บังคับ)",
        type: "multiple",
        options: userOptions(),
      },
    ]);
    if (!data) return;
    const steps = [
      {
        name: data.stepName,
        mode: data.mode,
        assignees: data.assignees,
        dueHours: data.dueHours,
      },
    ];
    if (data.nextAssignees.length)
      steps.push({
        name: "พิจารณาขั้นสุดท้าย",
        mode: "all",
        assignees: data.nextAssignees,
        dueHours: data.dueHours,
      });
    await run(null, () =>
      post("/workflows/definitions", {
        code: data.code,
        name: data.name,
        version: data.version,
        steps,
      }),
    );
  }
  async function registries() {
    const rows = await ctx.api("/registries");
    panel.append(
      card(
        "ทะเบียนรับ–ส่งเอกสาร",
        rows.length
          ? table(
              ["เลขทะเบียน", "เอกสาร", "ประเภท", "วันที่", ""],
              rows.map((r) => [
                el("strong", "", r.display_number),
                el("span", "", r.title),
                el("span", "data-meta", r.registry_type),
                el("span", "data-meta", date(r.assigned_at)),
                button("เปิดเอกสาร", () => viewDocument(r.document_id)),
              ]),
            )
          : empty(
              "ยังไม่มีเลขทะเบียน",
              "เอกสารที่อนุมัติและลงนามแล้วสามารถออกเลขทะเบียนได้โดยเจ้าหน้าที่สารบรรณ",
            ),
      ),
    );
  }
  async function meetings() {
    const rows = await ctx.api("/meetings"),
      list = el("div");
    for (const m of rows) {
      const when = new Date(m.starts_at);
      list.append(
        el("article", "meeting-card").append(
          el("div", "meeting-date").append(
            el("strong", "", String(when.getDate()).padStart(2, "0")),
            el(
              "small",
              "",
              new Intl.DateTimeFormat("th-TH", {
                month: "short",
                timeZone: "Asia/Bangkok",
              }).format(when),
            ),
          ),
          el("div", "meeting-info").append(
            el("h3", "", m.title),
            el("p", "", stamp(m.starts_at) + " · " + m.location),
          ),
          chip(m.state),
          button("รายละเอียด", () => meetingDetail(m.id)),
        ),
      );
    }
    panel.append(
      card(
        "ปฏิทินและการประชุม",
        rows.length
          ? list
          : empty(
              "เตรียมพื้นที่สำหรับการประชุมครั้งถัดไป",
              "กำหนดผู้เข้าร่วม องค์ประชุม และหลักเกณฑ์ลงคะแนนตามข้อบังคับที่อนุมัติแล้ว",
            ),
      ),
    );
  }
  async function newMeeting() {
    const data = await ask("นัดหมายการประชุม", [
      { name: "title", label: "ชื่อการประชุม", required: true, maxLength: 200 },
      {
        name: "startsAt",
        label: "วันและเวลา",
        type: "datetime-local",
        required: true,
      },
      {
        name: "location",
        label: "สถานที่ / ช่องทาง",
        required: true,
        maxLength: 200,
      },
      {
        name: "attendees",
        label: "ผู้ได้รับเชิญ",
        type: "multiple",
        options: userOptions(),
        required: true,
      },
      {
        name: "quorum",
        label: "องค์ประชุมขั้นต่ำ ตามข้อบังคับ",
        type: "number",
        min: 1,
        value: 1,
        required: true,
      },
      {
        name: "votingRule",
        label: "เกณฑ์รับมติที่ได้รับอนุมัติให้ใช้",
        type: "select",
        options: {
          majority_of_eligible: "มากกว่าครึ่งของผู้มีสิทธิ์ที่เข้าประชุม",
          unanimous_eligible: "เอกฉันท์จากผู้มีสิทธิ์ที่เข้าประชุม",
        },
      },
    ]);
    if (!data) return;
    data.startsAt = new Date(data.startsAt).toISOString();
    await run(null, () => post("/meetings", data));
  }
  async function meetingDetail(id) {
    const m = await ctx.api("/meetings/" + id),
      n = el("div");
    n.append(
      banner(
        "องค์ประชุม " +
          m.quorum_count +
          " คน · " +
          (m.voting_rule === "unanimous_eligible"
            ? "เอกฉันท์"
            : "มากกว่าครึ่งของผู้มีสิทธิ์ที่เข้าประชุม"),
      ),
      el("p", "muted", stamp(m.starts_at) + " · " + m.location),
    );
    const attendee = el("div");
    for (const a of m.attendees)
      attendee.append(
        el("div", "file-row").append(
          el("div").append(
            el("strong", "", a.email),
            el(
              "small",
              "",
              a.conflict_declared
                ? "แจ้งมีส่วนได้เสีย"
                : a.attended
                  ? "เข้าประชุมแล้ว"
                  : "รอเข้าประชุม",
            ),
          ),
        ),
      );
    n.append(el("h3", "", "ผู้เข้าร่วม"), attendee);
    const actions = el("div", "detail-actions");
    if (m.owner_id === ctx.user.id && m.state === "draft") {
      actions.append(
        button("เพิ่มวาระ", async () => {
          const d = await ask("เพิ่มวาระ", [
            {
              name: "ordinal",
              label: "ลำดับ",
              type: "number",
              min: 1,
              value: m.agendas.length + 1,
              required: true,
            },
            { name: "title", label: "ชื่อวาระ", required: true, maxLength: 200 },
            {
              name: "documentId",
              label: "รหัสเอกสารแนบ (ถ้ามี)",
              help: "ผู้เข้าร่วมต้องมีสิทธิ์เอกสารแยกต่างหาก",
            },
          ]);
          if (d)
            await run(null, () =>
              post("/meetings/" + id + "/agendas", {
                ...d,
                documentId: d.documentId || null,
              }),
            );
        }),
        button("เปิดประชุม", (b) =>
          run(b, () =>
            post("/meetings/" + id + "/state", {
              version: m.version,
              state: "open",
            }),
          ),
        ),
      );
    }
    if (m.state === "open") {
      actions.append(
        button("ลงชื่อ / แจ้งส่วนได้เสีย", async () => {
          const d = await ask("ยืนยันการเข้าประชุม", [
            {
              name: "attended",
              label: "เข้าร่วมการประชุม",
              type: "checkbox",
              value: true,
            },
            {
              name: "conflict",
              label: "มีส่วนได้เสียในการลงคะแนน",
              type: "checkbox",
              value: false,
            },
          ]);
          if (d)
            await run(null, () => post("/meetings/" + id + "/attendance", d));
        }),
      );
      if (m.owner_id === ctx.user.id)
        actions.append(
          button("เผยแพร่รายงานประชุม", async () => {
            const d = await ask("รายงานการประชุม", [
              {
                name: "minutes",
                label: "เนื้อหารายงานที่ตรวจทานแล้ว",
                type: "textarea",
                required: true,
                maxLength: 10000,
              },
            ]);
            if (d)
              await run(null, () =>
                post("/meetings/" + id + "/state", {
                  version: m.version,
                  state: "published",
                  minutes: d.minutes,
                }),
              );
          }),
        );
    }
    for (const a of m.agendas) {
      const row = el("div", "file-row").append(
        el("div").append(
          el("strong", "", a.ordinal + ". " + a.title),
          el("small", "", a.resolution_text || states[a.state] || a.state),
        ),
      );
      if (a.document_id)
        row.append(button("เอกสาร", () => viewDocument(a.document_id)));
      if (a.attachmentRestricted)
        row.append(el("small", "", "เอกสารแนบจำกัดสิทธิ์"));
      if (m.state === "open" && a.state === "draft") {
        row.append(
          button("ลงคะแนน", async () => {
            const d = await ask("ลงคะแนนวาระ", [
              {
                name: "vote",
                label: "ความคิดเห็น",
                type: "select",
                options: {
                  approve: "เห็นชอบ",
                  reject: "ไม่เห็นชอบ",
                  abstain: "งดออกเสียง",
                },
              },
            ]);
            if (d)
              await run(null, () =>
                post("/meetings/" + id + "/agendas/" + a.id + "/vote", d),
              );
          }),
        );
        if (m.owner_id === ctx.user.id)
          row.append(
            button("สรุปมติ", async () => {
              const d = await ask("บันทึกมติ", [
                {
                  name: "text",
                  label: "รายละเอียดมติ",
                  type: "textarea",
                  required: true,
                  maxLength: 1000,
                },
              ]);
              if (d)
                await run(null, () =>
                  post("/meetings/" + id + "/agendas/" + a.id + "/resolve", d),
                );
            }),
          );
      }
      n.append(row);
    }
    if (m.minutes_text) n.append(el("div", "document-body", m.minutes_text));
    n.append(actions);
    await CoopAlerts.show(m.title, n, { width: 850 });
  }
  async function templates() {
    const data = await ctx.api("/templates");
    panel.append(
      card(
        "แม่แบบเอกสาร",
        data.length
          ? table(
              ["แม่แบบ", "ประเภท", "รุ่น", "สถานะ", ""],
              data.map((t) => [
                el("strong", "", t.title),
                categories[t.category],
                String(t.version),
                chip(t.status),
                el("div", "link-row").append(
                  t.status === "draft" && allowed("template:manage")
                    ? button("เผยแพร่", (b) =>
                        run(b, () => post("/templates/" + t.id + "/publish")),
                      )
                    : null,
                  t.status === "published" && allowed("document:create")
                    ? button("สร้างเอกสารจากแม่แบบ", async () => {
                        const title = await CoopAlerts.textInput("ชื่อเอกสาร");
                        if (title.isConfirmed)
                          await run(null, () =>
                            post("/templates/" + t.id + "/documents", {
                              title: title.value,
                              category: t.category,
                              classification: [
                                "finance",
                                "procurement",
                                "member",
                                "board",
                              ].includes(t.category)
                                ? "restricted"
                                : "internal",
                            }),
                          );
                      })
                    : null,
                ),
              ]),
            )
          : empty(
              "แม่แบบที่ดี ช่วยให้เริ่มงานได้เร็วขึ้น",
              "สร้างแม่แบบข้อความภาษาไทย และเผยแพร่เป็นรุ่นที่ตรวจสอบได้",
            ),
      ),
    );
  }
  async function newTemplate() {
    const d = await ask("สร้างแม่แบบเอกสาร", [
      {
        name: "code",
        label: "รหัสแม่แบบ (A–Z, 0–9, _)",
        required: true,
        maxLength: 40,
      },
      {
        name: "version",
        label: "รุ่น",
        type: "number",
        min: 1,
        value: 1,
        required: true,
      },
      { name: "title", label: "ชื่อแม่แบบ", required: true, maxLength: 200 },
      {
        name: "category",
        label: "ประเภทเอกสาร",
        type: "select",
        options: categories,
      },
      {
        name: "body",
        label: "เนื้อหาแม่แบบ",
        type: "textarea",
        required: true,
        maxLength: 10000,
        help: "ใช้ {{title}} แทนชื่อเอกสารเมื่อสร้างฉบับใหม่",
      },
    ]);
    if (d) await run(null, () => post("/templates", d));
  }
  async function organization() {
    const data = await ctx.api("/organization");
    panel.append(
      card(
        "ฝ่ายและหน่วยงาน",
        data.departments.length
          ? table(
              ["รหัส", "ชื่อฝ่าย", "สถานะ", ""],
              data.departments.map((d) => [
                d.code,
                d.name,
                chip(d.active ? "approved" : "cancelled"),
                button("แก้ไข", async () => {
                  const fields = await ask("แก้ไขฝ่าย", [
                    {
                      name: "code",
                      label: "รหัส",
                      required: true,
                      value: d.code,
                    },
                    {
                      name: "name",
                      label: "ชื่อฝ่าย",
                      required: true,
                      value: d.name,
                    },
                    {
                      name: "active",
                      label: "เปิดใช้งาน",
                      type: "checkbox",
                      value: Boolean(d.active),
                    },
                  ]);
                  if (fields)
                    await run(null, () =>
                      ctx.api("/departments/" + d.id, "PATCH", {
                        ...fields,
                        version: d.version,
                      }),
                    );
                }),
              ]),
            )
          : empty(
              "เริ่มจากโครงสร้างที่ชัดเจน",
              "สร้างฝ่ายและกำหนดสมาชิกเพื่อใช้สิทธิ์ระดับองค์กร",
            ),
      ),
    );
    panel.append(
      card(
        "สมาชิกฝ่าย",
        data.memberships.length
          ? table(
              ["ผู้ใช้", "ฝ่าย", ""],
              data.memberships.map((m) => [
                m.email,
                data.departments.find((d) => d.id === m.department_id)?.name ||
                  m.department_id,
                button(
                  "นำออกจากฝ่าย",
                  async (b) => {
                    if (
                      (
                        await CoopAlerts.confirmDanger(
                          "นำสมาชิกออกจากฝ่ายและเพิกถอน Session",
                        )
                      ).isConfirmed
                    )
                      await run(b, () =>
                        post("/organization/memberships", {
                          userId: m.user_id,
                          departmentId: m.department_id,
                          enabled: false,
                        }),
                      );
                  },
                  "danger",
                ),
              ]),
            )
          : el("p", "muted", "ยังไม่มีสมาชิกฝ่าย"),
        button("เพิ่มสมาชิก", () => addMembership(data)),
      ),
    );
    panel.append(
      card(
        "บทบาทเพิ่มเติม",
        data.grants.length
          ? table(
              ["ผู้ใช้", "บทบาท", "ขอบเขต", ""],
              data.grants.map((g) => [
                g.email,
                roles[g.role_code] || g.role_code,
                data.departments.find((d) => d.id === g.department_id)?.name ||
                  "ทั้งองค์กร",
                button(
                  "เพิกถอน",
                  (b) =>
                    run(b, () =>
                      ctx.api("/organization/grants/" + g.id, "DELETE", {}),
                    ),
                  "danger",
                ),
              ]),
            )
          : el("p", "muted", "ยังไม่มีบทบาทเพิ่มเติม"),
        allowed("users:manage")
          ? button("เพิ่มบทบาท", () => newGrant(data))
          : null,
      ),
    );
    const groupData = await ctx.api("/organization/groups");
    panel.append(
      card(
        "กลุ่มผู้ใช้งาน",
        groupData.groups.length
          ? table(
              ["รหัส", "กลุ่ม", "สถานะ", ""],
              groupData.groups.map((g) => [
                g.code,
                g.name,
                chip(g.active ? "approved" : "cancelled"),
                button("แก้ไข", async () => {
                  const d = await ask("แก้ไขกลุ่ม", [
                    {
                      name: "code",
                      label: "รหัส",
                      required: true,
                      value: g.code,
                    },
                    {
                      name: "name",
                      label: "ชื่อกลุ่ม",
                      required: true,
                      value: g.name,
                    },
                    {
                      name: "active",
                      label: "เปิดใช้งาน",
                      type: "checkbox",
                      value: Boolean(g.active),
                    },
                  ]);
                  if (d)
                    await run(null, () =>
                      ctx.api("/organization/groups/" + g.id, "PATCH", {
                        ...d,
                        version: g.version,
                      }),
                    );
                }),
              ]),
            )
          : el("p", "muted", "ยังไม่มีกลุ่มผู้ใช้งาน"),
        button("สร้างกลุ่ม", async () => {
          const d = await ask("สร้างกลุ่ม", [
            {
              name: "code",
              label: "รหัส (A–Z, 0–9, _)",
              required: true,
              maxLength: 30,
            },
            { name: "name", label: "ชื่อกลุ่ม", required: true, maxLength: 150 },
          ]);
          if (d) await run(null, () => post("/organization/groups", d));
        }),
      ),
    );
    panel.append(
      card(
        "สมาชิกกลุ่ม",
        groupData.members.length
          ? table(
              ["ผู้ใช้", "กลุ่ม", ""],
              groupData.members.map((m) => [
                m.email,
                groupData.groups.find((g) => g.id === m.group_id)?.name ||
                  m.group_id,
                button(
                  "นำออก",
                  (b) =>
                    run(b, () =>
                      post("/organization/group-memberships", {
                        userId: m.user_id,
                        groupId: m.group_id,
                        enabled: false,
                      }),
                    ),
                  "danger",
                ),
              ]),
            )
          : el("p", "muted", "ยังไม่มีสมาชิกกลุ่ม"),
        button("เพิ่มสมาชิกกลุ่ม", async () => {
          const d = await ask("เพิ่มสมาชิกกลุ่ม", [
            {
              name: "userId",
              label: "ผู้ใช้",
              type: "select",
              options: userOptions(),
              required: true,
            },
            {
              name: "groupId",
              label: "กลุ่ม",
              type: "select",
              options: Object.fromEntries(
                groupData.groups
                  .filter((g) => g.active)
                  .map((g) => [g.id, g.name]),
              ),
              required: true,
            },
          ]);
          if (d)
            await run(null, () =>
              post("/organization/group-memberships", { ...d, enabled: true }),
            );
        }),
      ),
    );
  }
  async function newDepartment() {
    const d = await ask("สร้างฝ่าย", [
      {
        name: "code",
        label: "รหัสฝ่าย (A–Z, 0–9, _)",
        required: true,
        maxLength: 30,
      },
      { name: "name", label: "ชื่อฝ่าย", required: true, maxLength: 150 },
    ]);
    if (d) await run(null, () => post("/departments", d));
  }
  async function addMembership(data) {
    const d = await ask("เพิ่มสมาชิกฝ่าย", [
      {
        name: "userId",
        label: "ผู้ใช้",
        type: "select",
        options: userOptions(),
        required: true,
      },
      {
        name: "departmentId",
        label: "ฝ่าย",
        type: "select",
        options: Object.fromEntries(
          data.departments.filter((x) => x.active).map((x) => [x.id, x.name]),
        ),
        required: true,
      },
    ]);
    if (d)
      await run(null, () =>
        post("/organization/memberships", { ...d, enabled: true }),
      );
  }
  async function newGrant(data) {
    const d = await ask("กำหนดบทบาทเพิ่มเติม", [
      {
        name: "userId",
        label: "ผู้ใช้",
        type: "select",
        options: Object.fromEntries(
          directory
            .filter((u) => u.id !== ctx.user.id)
            .map((u) => [u.id, u.email]),
        ),
        required: true,
      },
      { name: "role", label: "บทบาท", type: "select", options: roles },
      {
        name: "departmentId",
        label: "ขอบเขต",
        type: "select",
        options: Object.fromEntries([
          ["", "ทั้งองค์กร"],
          ...data.departments
            .filter((x) => x.active)
            .map((x) => [x.id, x.name]),
        ]),
      },
    ]);
    if (d)
      await run(null, () =>
        post("/organization/grants", {
          ...d,
          departmentId: d.departmentId || null,
        }),
      );
  }
  async function users() {
    const data = await ctx.api("/admin/users");
    const active = data.filter((u) => u.status === "active");
    panel.append(
      banner(
        "การเปลี่ยนสิทธิ์ต้องยืนยันตัวตนซ้ำและจะเพิกถอน Session เดิม ไม่สามารถแก้บทบาทของตนเองผ่านหน้านี้ได้",
      ),
    );
    panel.append(
      card(
        "บัญชีที่ได้รับอนุมัติ · " + active.length + " คน",
        active.length
          ? table(
              ["ผู้ใช้", "บทบาท", "สถานะ", ""],
              active.map((u) => [
                el("strong", "", u.email),
                roles[u.role] || u.role,
                chip(u.status === "active" ? "approved" : "cancelled"),
                el("div", "link-row").append(
                  button("เพิกถอน Session", async (b) => {
                    if ((await CoopAlerts.confirmSubmit(u.email)).isConfirmed)
                      await run(b, () =>
                        post("/admin/users/" + u.id + "/revoke"),
                      );
                  }),
                  u.id !== ctx.user.id
                    ? button("แก้ไขสิทธิ์", () => editUser(u))
                    : null,
                ),
              ]),
            )
          : empty(
              "ยังไม่มีผู้ใช้งาน",
              "เพิ่มเฉพาะ Google Identity ที่ตรวจสอบและได้รับอนุมัติแล้ว",
            ),
      ),
    );
    const disabled = data.filter((u) => u.status !== "active");
    if (disabled.length)
      panel.append(
        card(
          "บัญชีระงับ / เพิกถอน",
          table(
            ["อีเมล", "บทบาท", "สถานะ"],
            disabled.map((u) => [u.email, roles[u.role] || u.role, u.status]),
          ),
        ),
      );
  }
  async function newUser() {
    const d = await ask("อนุมัติ Google Identity", [
      {
        name: "email",
        label: "อีเมลที่ตรวจสอบแล้ว",
        type: "email",
        required: true,
        maxLength: 254,
      },
      {
        name: "googleSub",
        label: "Google sub ที่ตรวจสอบและอนุมัติแล้ว",
        required: true,
        maxLength: 255,
      },
      { name: "role", label: "บทบาท", type: "select", options: roles },
    ]);
    if (d) await run(null, () => post("/admin/users", d));
  }
  async function editUser(u) {
    const d = await ask("แก้ไขสิทธิ์ผู้ใช้", [
      {
        name: "role",
        label: "บทบาท",
        type: "select",
        options: roles,
        value: u.role,
      },
      {
        name: "status",
        label: "สถานะ",
        type: "select",
        options: {
          active: "ใช้งาน",
          suspended: "ระงับ",
          revoked: "เพิกถอน",
          pending: "รออนุมัติ",
        },
        value: u.status,
      },
    ]);
    if (d) await run(null, () => ctx.api("/admin/users/" + u.id, "PATCH", d));
  }
  async function retention() {
    const rows = await ctx.api("/retention/policies");
    panel.append(
      banner(
        "Legal Hold จะระงับการทำลายเอกสาร การขอทำลายต้องครบระยะเก็บและผ่านผู้ตรวจสอบคนละคน การลบไฟล์จริงต้องได้รับอนุมัติแยกต่างหาก",
      ),
    );
    panel.append(
      card(
        "นโยบายระยะเวลาเก็บ",
        rows.length
          ? table(
              ["รหัส", "นโยบาย", "ระยะเวลา", "หลักเกณฑ์"],
              rows.map((r) => [r.code, r.title, r.years + " ปี", r.legal_basis]),
            )
          : empty(
              "กำหนดระยะเก็บจากหลักเกณฑ์ที่อนุมัติ",
              "ยังไม่มีการกำหนดระยะเวลาเก็บอัตโนมัติ",
            ),
      ),
    );
    panel.append(
      card(
        "เอกสารที่จัดเก็บ",
        el(
          "p",
          "muted",
          "เปิดรายละเอียดเอกสารที่ลงทะเบียนแล้วเพื่อเก็บถาวร ตั้ง Legal Hold หรือขอทำลายตามสิทธิ์",
        ),
        button("ดูเอกสาร", () => navigate("documents")),
      ),
    );
  }
  async function newRetention() {
    const d = await ask("สร้างนโยบายระยะเก็บ", [
      {
        name: "code",
        label: "รหัสนโยบาย (A–Z, 0–9, _)",
        required: true,
        maxLength: 40,
      },
      { name: "title", label: "ชื่อนโยบาย", required: true, maxLength: 150 },
      {
        name: "years",
        label: "จำนวนปี ตามหลักเกณฑ์",
        type: "number",
        min: 1,
        max: 100,
        value: 1,
        required: true,
      },
      {
        name: "legalBasis",
        label: "ข้อบังคับ / หลักเกณฑ์อ้างอิง",
        type: "textarea",
        required: true,
        maxLength: 1000,
      },
    ]);
    if (d) await run(null, () => post("/retention/policies", d));
  }
  async function archive(r) {
    const policies = await ctx.api("/retention/policies");
    const d = await ask("จัดเก็บเอกสารถาวร", [
      {
        name: "policyId",
        label: "นโยบายระยะเวลาเก็บ",
        type: "select",
        options: Object.fromEntries(
          policies.map((p) => [p.id, p.title + " · " + p.years + " ปี"]),
        ),
        required: true,
      },
    ]);
    if (d)
      await run(null, () =>
        post("/documents/" + r.id + "/archive", { version: r.version, ...d }),
      );
  }
  async function hold(r) {
    const d = await ask("ตั้ง / ปลด Legal Hold", [
      {
        name: "reason",
        label: "เหตุผลและหลักฐานอ้างอิง",
        type: "textarea",
        required: true,
        maxLength: 1000,
      },
      {
        name: "holdId",
        label: "การดำเนินการ",
        type: "select",
        options: Object.fromEntries([
          ["", "ตั้ง Legal Hold ใหม่"],
          ...(r.legalHolds || [])
            .filter((h) => h.active)
            .map((h) => [h.id, "ปลด: " + h.reason]),
        ]),
      },
    ]);
    if (d)
      await run(null, () =>
        post("/documents/" + r.id + "/holds", {
          reason: d.reason,
          holdId: d.holdId || null,
        }),
      );
  }
  async function disposal(r) {
    const d = await ask("ขอทำลาย / ตรวจสอบคำขอ", [
      {
        name: "reason",
        label: "เหตุผล",
        type: "textarea",
        required: true,
        maxLength: 1000,
      },
      {
        name: "requestId",
        label: "การดำเนินการ",
        type: "select",
        options: Object.fromEntries([
          ["", "สร้างคำขอทำลายใหม่"],
          ...(r.disposals || [])
            .filter(
              (d) => d.state === "pending" && d.requested_by !== ctx.user.id,
            )
            .map((d) => [d.id, "ตรวจสอบ: " + d.reason]),
        ]),
        help: "ต้องเป็นผู้ตรวจสอบคนละคนกับผู้ขอ และไม่มี Legal Hold",
      },
    ]);
    if (d)
      await run(
        null,
        () =>
          post("/documents/" + r.id + "/disposal", {
            reason: d.reason,
            requestId: d.requestId || null,
          }),
        "บันทึกคำขอแล้ว ยังไม่มีการลบไฟล์จริง",
      );
  }
  async function audit() {
    const result = await ctx.api("/admin/audit");
    panel.append(
      banner(
        result.chainValid
          ? "ตรวจสอบสายโซ่ Hash ของเหตุการณ์ที่โหลดได้ตรงกัน · ยังไม่ได้เชื่อมจุดยึดหลักฐานภายนอก"
          : "สายโซ่ Hash ไม่ตรงกัน หยุดใช้อ้างอิงและให้ผู้ดูแลตรวจสอบ",
      ),
    );
    panel.append(
      card(
        "บันทึกการดำเนินการ",
        result.events.length
          ? table(
              ["ลำดับ", "การดำเนินการ", "เวลา", "Hash"],
              result.events.map((e) => [
                String(e.sequence_no),
                e.action,
                stamp(e.created_at),
                el("span", "data-meta", e.chain_hash.slice(0, 16) + "…"),
              ]),
            )
          : empty(
              "ยังไม่มีบันทึกในขอบเขตสิทธิ์",
              "เหตุการณ์ใหม่จะแสดงตามลำดับและตรวจสอบ Hash ได้",
            ),
      ),
    );
  }
  async function reports() {
    const r = await ctx.api("/reports/overview");
    const rows = Object.entries(r.states).map(([state, count]) => [
      chip(state),
      String(count),
    ]);
    panel.append(
      card(
        "สรุปเอกสารตามสิทธิ์",
        rows.length
          ? table(["สถานะ", "จำนวน"], rows)
          : empty("ยังไม่มีข้อมูลรายงาน", "รายงานจะแสดงเฉพาะเอกสารที่คุณมีสิทธิ์เข้าถึง"),
      ),
      banner(
        "ส่งออก CSV ได้ไม่เกิน 200 รายการต่อครั้ง เอกสารสำคัญต้องผ่านนโยบาย Assurance ก่อนส่งออก",
      ),
    );
  }
  async function exportCsv() {
    const response = await fetch("/api/v1/reports/export.csv", {
      credentials: "same-origin",
    });
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.error?.message || "ส่งออกไม่สำเร็จ");
    }
    const url = URL.createObjectURL(await response.blob()),
      a = document.createElement("a");
    a.href = url;
    a.download = "nonpapercoop-test.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  let navigating = false,
    queued;
  async function navigate(route) {
    if (navigating) {
      queued = route;
      return;
    }
    navigating = true;
    current = route;
    toggleMenu(false);
    $(".nav-item").removeClass("active").removeAttr("aria-current");
    $('.nav-item[data-page="' + route + '"]')
      .addClass("active")
      .attr("aria-current", "page");
    const meta = {
      dashboard: ["ภาพรวมการทำงาน", "ทุกเรื่องสำคัญในพื้นที่ทำงานของคุณ"],
      documents: ["เอกสารทั้งหมด", "จัดการเอกสารและติดตามทุกขั้นตอนในที่เดียว"],
      tasks: ["งานรอพิจารณา", "งานที่ได้รับมอบหมายและขั้นตอนการอนุมัติ"],
      registries: ["ทะเบียนสารบรรณ", "เลขทะเบียนและประวัติรับ–ส่งเอกสาร"],
      meetings: ["การประชุม", "เตรียมวาระ เช็กองค์ประชุม และบันทึกมติ"],
      search: ["ค้นหาเอกสาร", "ค้นหาเฉพาะเอกสารที่คุณมีสิทธิ์เข้าถึง"],
      finance: ["เอกสารการเงิน", "บริหารชุดเอกสารประกอบ ไม่เชื่อมต่อระบบบัญชีหรือโอนเงิน"],
      procurement: ["จัดซื้อจัดจ้าง", "เอกสารประกอบและขั้นตอนพิจารณาการจัดซื้อ"],
      member: ["บริการสมาชิก", "รับเรื่องภายในและควบคุมสิทธิ์ข้อมูลสมาชิก"],
      templates: ["แม่แบบเอกสาร", "เริ่มต้นเอกสารใหม่ด้วยรูปแบบที่เป็นมาตรฐาน"],
      retention: [
        "จัดเก็บและ Legal Hold",
        "ระยะเก็บ การระงับทำลาย และกระบวนการตรวจสอบ",
      ],
      organization: ["โครงสร้างองค์กร", "ฝ่าย สมาชิก และบทบาทที่กำหนดขอบเขตได้"],
      users: ["จัดการผู้ใช้", "บัญชี Google ที่ได้รับอนุมัติให้เข้าใช้งาน"],
      audit: ["บันทึกตรวจสอบ", "เหตุการณ์ตามขอบเขตสิทธิ์และสายโซ่หลักฐาน"],
      reports: ["รายงาน", "ภาพรวมเอกสารและข้อมูลเพื่อการติดตาม"],
    }[route] || ["พื้นที่ทำงาน", ""];
    $("#page-title,#breadcrumb-current").text(meta[0]);
    $("#page-description").text(meta[1]);
    headerActions.empty();
    panel
      .empty()
      .append(
        el("div", "skeleton").attr("aria-label", "กำลังโหลดข้อมูล"),
        el("div", "skeleton"),
      );
    if (
      [
        "dashboard",
        "documents",
        "search",
        "finance",
        "procurement",
        "member",
      ].includes(route) &&
      allowed("document:create")
    )
      headerActions.append(
        button("สร้างเอกสารร่าง", () => editDocument(), "", "plus"),
      );
    if (route === "tasks" && allowed("workflow:manage"))
      headerActions.append(
        button("สร้าง Workflow", () => newWorkflow(), "", "plus"),
      );
    if (route === "meetings" && allowed("meeting:create"))
      headerActions.append(
        button("นัดหมายการประชุม", () => newMeeting(), "", "plus"),
      );
    if (route === "templates" && allowed("template:manage"))
      headerActions.append(
        button("สร้างแม่แบบ", () => newTemplate(), "", "plus"),
      );
    if (route === "organization")
      headerActions.append(
        button("สร้างฝ่าย", () => newDepartment(), "", "plus"),
      );
    if (route === "users" && allowed("users:manage"))
      headerActions.append(
        button("เพิ่ม Google Identity", () => newUser(), "", "plus"),
      );
    if (route === "retention" && allowed("retention:manage"))
      headerActions.append(
        button("เพิ่มนโยบาย", () => newRetention(), "", "plus"),
      );
    if (route === "reports")
      headerActions.append(
        button("ส่งออก CSV", () => exportCsv(), "secondary", "file"),
      );
    activeCategory = ["finance", "procurement", "member"].includes(route)
      ? route
      : "";
    try {
      panel.empty();
      if (
        ["documents", "search", "finance", "procurement", "member"].includes(
          route,
        )
      )
        await documents();
      else
        await (
          {
            dashboard,
            tasks,
            registries,
            meetings,
            templates,
            retention,
            organization,
            users,
            audit,
            reports,
          }[route] || dashboard
        )();
      $("#page-title").trigger("focus");
    } catch (e) {
      panel.empty().append(
        empty(
          "ไม่สามารถโหลดข้อมูลได้",
          e.message,
          button("ลองอีกครั้ง", () => navigate(route)),
        ),
      );
    } finally {
      navigating = false;
      if (queued) {
        const next = queued;
        queued = null;
        await navigate(next);
      }
    }
  }
  return {
    async start(context) {
      ctx = context;
      try {
        caps = await ctx.api("/capabilities");
      } catch (e) {
        if (e.status === 404) return false;
        throw e;
      }
      [departments, directory] = await Promise.all([
        ctx.api("/departments"),
        ctx.api("/directory").catch((e) => {
          if (e.status === 403) return [];
          throw e;
        }),
      ]);
      $("body").addClass("app-mode");
      if (!shell) buildShell();
      await navigate(current);
      return true;
    },
  };
})();
