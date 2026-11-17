/* global $, google, CoopAlerts */
$(async function () {
  let csrf = "",
    me = null,
    reauth = false,
    busy = false,
    challengeTimer;
  async function api(path, method = "GET", body, options = {}) {
    try {
      return (
        await $.ajax({
          url: "/api/v1" + path,
          method,
          contentType: "application/json",
          headers:
            method === "GET"
              ? {}
              : {
                  "X-CSRF-Token": csrf,
                  ...(options.idempotencyKey
                    ? { "Idempotency-Key": options.idempotencyKey }
                    : {}),
                },
          data: body ? JSON.stringify(body) : undefined,
          timeout: 20000,
        })
      ).data;
    } catch (e) {
      throw Object.assign(
        new Error(e.responseJSON?.error?.message || "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่"),
        { status: e.status },
      );
    }
  }
  async function mutate(button, job) {
    if (busy) return;
    busy = true;
    $(button).prop("disabled", true);
    CoopAlerts.showLoading();
    try {
      await job();
      CoopAlerts.closeLoading();
      await CoopAlerts.notifySuccess("Backend ยืนยันการบันทึกแล้ว");
    } catch (e) {
      CoopAlerts.closeLoading();
      await CoopAlerts.notifyError(e.message);
    } finally {
      busy = false;
      $(button).prop("disabled", false);
    }
  }
  const categories = {
    general: "ทั่วไป",
    saraban: "สารบรรณ",
    board: "คณะกรรมการ",
    finance: "การเงิน",
    procurement: "จัดซื้อ",
    member: "บริการสมาชิก",
  };
  const roleNames = {
    system_admin: "ผู้ดูแลระบบ",
    department_staff: "เจ้าหน้าที่",
    department_head: "หัวหน้าฝ่าย",
    auditor_readonly: "ผู้ตรวจสอบ",
  };
  async function render() {
    me = await api("/auth/me");
    $("#login").prop("hidden", true);
    $("#workspace").prop("hidden", false);
    $("#identity").text(me.email + " · " + (roleNames[me.role] || me.role));
    if (
      window.EnterpriseUI &&
      (await window.EnterpriseUI.start({
        api,
        user: me,
        csrf: () => csrf,
        reauth: () => $("#reauth").trigger("click"),
        logout: () => $("#logout").trigger("click"),
      }))
    )
      return;
    $("#new-document").prop("hidden", me.role !== "department_staff");
    const documentResponse = await api("/documents"),
      docs = Array.isArray(documentResponse)
        ? documentResponse
        : documentResponse.items;
    $("#count").text(docs.length);
    $("#documents").empty();
    if (!docs.length)
      $("#documents").append(
        $("<tr>").append($("<td>").attr("colspan", 4).text("ยังไม่มีเอกสาร")),
      );
    for (const d of docs) {
      const tr = $("<tr>").append(
        $("<td>").text(d.title),
        $("<td>").text(categories[d.category]),
        $("<td>").text(d.status + " · v" + d.version),
      );
      const actions = $("<td>");
      if (me.role === "department_staff") {
        $("<button>")
          .text("แก้ไข")
          .appendTo(actions)
          .on("click", async function () {
            const r = await CoopAlerts.textInput("ชื่อเอกสาร", d.title);
            if (r.isConfirmed)
              await mutate(this, async () => {
                await api("/documents/" + d.id, "PATCH", {
                  title: r.value,
                  category: d.category,
                  version: d.version,
                });
                await render();
              });
          });
        $("<button>")
          .addClass("danger")
          .text("ลบ")
          .appendTo(actions)
          .on("click", async function () {
            if ((await CoopAlerts.confirmDanger(d.title)).isConfirmed)
              await mutate(this, async () => {
                await api("/documents/" + d.id, "DELETE", {
                  version: d.version,
                });
                await render();
              });
          });
      }
      tr.append(actions);
      $("#documents").append(tr);
    }
    $("#admin").prop("hidden", me.role !== "system_admin");
    if (me.role === "system_admin") {
      const users = await api("/admin/users");
      $("#users").empty();
      for (const u of users) {
        const tr = $("<tr>").append(
          $("<td>").text(u.email),
          $("<td>").text(roleNames[u.role] || u.role),
          $("<td>").text(u.status),
        );
        const actions = $("<td>");
        $("<button>")
          .text("เพิกถอน Session")
          .appendTo(actions)
          .on("click", async function () {
            if ((await CoopAlerts.confirmSubmit(u.email)).isConfirmed)
              await mutate(this, () =>
                api("/admin/users/" + u.id + "/revoke", "POST", {}),
              );
          });
        if (u.id !== me.id) {
          $("<button>")
            .text("เปลี่ยนบทบาท")
            .appendTo(actions)
            .on("click", async function () {
              const r = await CoopAlerts.select("เลือกบทบาท", roleNames);
              if (r.isConfirmed)
                await mutate(this, async () => {
                  await api("/admin/users/" + u.id, "PATCH", {
                    role: r.value,
                    status: u.status,
                  });
                  await render();
                });
            });
          $("<button>")
            .addClass("danger")
            .text(u.status === "active" ? "ระงับบัญชี" : "เปิดบัญชี")
            .appendTo(actions)
            .on("click", async function () {
              if ((await CoopAlerts.confirmSubmit(u.email)).isConfirmed)
                await mutate(this, async () => {
                  await api("/admin/users/" + u.id, "PATCH", {
                    role: u.role,
                    status: u.status === "active" ? "suspended" : "active",
                  });
                  await render();
                });
            });
        }
        tr.append(actions);
        $("#users").append(tr);
      }
    }
  }
  async function setupGoogle() {
    clearTimeout(challengeTimer);
    const b = await api("/auth/google/start");
    csrf = b.csrf;
    google.accounts.id.initialize({
      client_id: b.clientId,
      nonce: b.nonce,
      auto_select: false,
      callback: async (response) => {
        await mutate("#google-button", async () => {
          const r = await api("/auth/google/callback", "POST", {
            credential: response.credential,
            reauth,
          });
          csrf = r.csrf;
          reauth = false;
          await render();
        });
        await setupGoogle().catch((e) => CoopAlerts.notifyError(e.message));
      },
    });
    $("#google-button").empty().prop("hidden", false);
    $("#refresh-google").prop("hidden", true);
    google.accounts.id.renderButton(document.getElementById("google-button"), {
      theme: "outline",
      size: "large",
      text: "signin_with",
      locale: "th",
    });
    $("#login-status").text("พร้อมเข้าสู่ระบบด้วย Google");
    challengeTimer = setTimeout(
      () => {
        $("#google-button").prop("hidden", true);
        $("#refresh-google").prop("hidden", false);
        $("#login-status").text("คำขอเข้าสู่ระบบหมดอายุ กรุณาเริ่มเข้าสู่ระบบใหม่");
      },
      Math.max(0, b.expiresAt - Date.now()),
    );
  }
  $("#refresh-google").on("click", () =>
    setupGoogle().catch((e) => CoopAlerts.notifyError(e.message)),
  );
  $("#logout").on("click", async function () {
    await mutate(this, async () => {
      await api("/auth/logout", "POST", {});
      location.reload();
    });
  });
  $("#reauth").on("click", async () => {
    reauth = true;
    $("body").removeClass("app-mode");
    $("#workspace").prop("hidden", true);
    $("#login").prop("hidden", false);
    $("#login-status").text("กรุณาเลือกบัญชี Google เดิมเพื่อยืนยันซ้ำ");
    if (!$("#cancel-reauth").length)
      $("<button>")
        .attr("id", "cancel-reauth")
        .addClass("ghost")
        .text("กลับพื้นที่ทำงาน")
        .insertAfter("#refresh-google")
        .on("click", () => {
          reauth = false;
          $("#cancel-reauth").remove();
          $("#login").prop("hidden", true);
          $("#workspace").prop("hidden", false);
          $("body").addClass("app-mode");
        });
    await setupGoogle();
    document.getElementById("google-button").scrollIntoView();
  });
  $("#new-document").on("click", async function () {
    const title = await CoopAlerts.textInput("ชื่อเอกสารร่าง");
    if (!title.isConfirmed) return;
    const category = await CoopAlerts.select("ประเภทเอกสาร", categories);
    if (!category.isConfirmed) return;
    await mutate(this, async () => {
      await api("/documents", "POST", {
        title: title.value,
        category: category.value,
      });
      await render();
    });
  });
  $("#new-user").on("click", async function () {
    const sub = await CoopAlerts.textInput("Google sub ที่ตรวจสอบและอนุมัติแล้ว");
    if (!sub.isConfirmed) return;
    const email = await CoopAlerts.textInput("อีเมลที่ได้รับอนุมัติ");
    if (!email.isConfirmed) return;
    const role = await CoopAlerts.select("บทบาท", roleNames);
    if (!role.isConfirmed) return;
    await mutate(this, async () => {
      await api("/admin/users", "POST", {
        googleSub: sub.value,
        email: email.value,
        role: role.value,
      });
      await render();
    });
  });
  try {
    await render();
  } catch {
    /* anonymous login screen */
  }
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = () =>
    setupGoogle().catch((e) => CoopAlerts.notifyError(e.message));
  script.onerror = () => {
    $("#login-status").text("Google ไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง");
    CoopAlerts.notifyError("ไม่สามารถโหลด Google Sign-in");
  };
  document.head.appendChild(script);
});
