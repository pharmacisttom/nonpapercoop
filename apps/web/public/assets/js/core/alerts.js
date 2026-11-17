/* All untrusted content is passed as text, never html. One active dialog. */
window.CoopAlerts = (() => {
  // Restore focus after close without SweetAlert's delayed focus timer racing the next dialog.
  const base = {
    confirmButtonText: "ตกลง",
    cancelButtonText: "ยกเลิก",
    returnFocus: false,
    buttonsStyling: true,
  };
  const fire = (o) => {
    const opener = document.activeElement;
    return Swal.fire({
      ...base,
      ...o,
      didClose: () => {
        if (!Swal.isVisible() && opener?.isConnected && !opener.disabled)
          opener.focus();
        o.didClose?.();
      },
    });
  };
  const confirm = (title, text) =>
    fire({
      icon: "question",
      title,
      text,
      showCancelButton: true,
      focusCancel: true,
      allowOutsideClick: false,
      reverseButtons: true,
    });
  const api = {
    show: (title, node, options = {}) =>
      fire({
        title,
        html: node?.jquery ? node[0] : node,
        width: 760,
        ...options,
      }),
    form: async (title, fields) => {
      const form = document.createElement("form");
      form.className = "coop-form";
      const controls = new Map();
      for (const field of fields) {
        const wrap = document.createElement("div");
        wrap.className = "form-field";
        const label = document.createElement("label"),
          id = "field-" + field.name;
        label.htmlFor = id;
        label.textContent = field.label;
        const control = document.createElement(
          field.type === "textarea"
            ? "textarea"
            : field.type === "select" || field.type === "multiple"
              ? "select"
              : "input",
        );
        control.id = id;
        control.name = field.name;
        if (control.tagName === "INPUT") control.type = field.type || "text";
        if (field.type === "multiple") control.multiple = true;
        if (field.options)
          for (const [value, text] of Object.entries(field.options)) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = text;
            option.selected = Array.isArray(field.value)
              ? field.value.includes(value)
              : field.value === value;
            control.append(option);
          }
        if (
          field.type !== "file" &&
          field.value !== undefined &&
          !Array.isArray(field.value)
        )
          control.value = field.value;
        if (field.type === "checkbox") control.checked = Boolean(field.value);
        control.required = Boolean(field.required);
        if (field.maxLength) control.maxLength = field.maxLength;
        if (field.min !== undefined) control.min = field.min;
        if (field.max !== undefined) control.max = field.max;
        if (field.step !== undefined) control.step = field.step;
        if (field.accept) control.accept = field.accept;
        wrap.append(label, control);
        if (field.help) {
          const help = document.createElement("small");
          help.textContent = field.help;
          wrap.append(help);
        }
        form.append(wrap);
        controls.set(field.name, { control, field });
      }
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        Swal.clickConfirm();
      });
      return fire({
        title,
        html: form,
        width: 650,
        showCancelButton: true,
        allowOutsideClick: false,
        confirmButtonText: "บันทึก",
        preConfirm: () => {
          if (!form.checkValidity()) {
            Swal.showValidationMessage("กรุณากรอกข้อมูลให้ครบและตรวจสอบรูปแบบ");
            form.querySelector(":invalid")?.focus();
            return false;
          }
          return Object.fromEntries(
            [...controls].map(([name, { control, field }]) => [
              name,
              field.type === "file"
                ? control.files[0]
                : field.type === "multiple"
                  ? [...control.selectedOptions].map((o) => o.value)
                  : field.type === "checkbox"
                    ? control.checked
                    : field.type === "number"
                      ? Number(control.value)
                      : control.value,
            ]),
          );
        },
      });
    },
    notifySuccess: (text) => fire({ icon: "success", title: "สำเร็จ", text }),
    notifyError: (text) =>
      fire({
        icon: "error",
        title: "ไม่สามารถทำรายการได้",
        text: text || "กรุณาลองใหม่อีกครั้ง",
      }),
    warning: (text) => fire({ icon: "warning", title: "โปรดตรวจสอบ", text }),
    confirmDanger: (text) => confirm("ยืนยันการลบ", text),
    confirmSubmit: (text) => confirm("ยืนยันทำรายการ", text),
    confirmApprove: (text) => confirm("ยืนยันการอนุมัติ", text),
    confirmReject: (text) => confirm("ยืนยันการปฏิเสธ", text),
    confirmReturn: (text) => confirm("ยืนยันส่งกลับแก้ไข", text),
    promptReason: (title) =>
      fire({
        title,
        input: "textarea",
        inputLabel: "เหตุผล",
        showCancelButton: true,
        focusCancel: true,
        inputValidator: (v) => (!v.trim() ? "กรุณาระบุเหตุผล" : undefined),
      }),
    textInput: (title, value = "") =>
      fire({
        title,
        input: "text",
        inputValue: value,
        showCancelButton: true,
        inputValidator: (v) =>
          !v.trim()
            ? "กรุณากรอกข้อมูล"
            : v.length > 250
              ? "ไม่เกิน 250 ตัวอักษร"
              : undefined,
      }),
    select: (title, options) =>
      fire({
        title,
        input: "select",
        inputOptions: options,
        showCancelButton: true,
      }),
    showLoading: () =>
      fire({
        title: "กำลังดำเนินการ",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      }),
    closeLoading: () => Swal.close(),
    formValidation: (text) =>
      fire({ icon: "warning", title: "ตรวจสอบข้อมูล", text }),
    toast: (text) =>
      fire({
        toast: true,
        position: "top-end",
        icon: "success",
        text,
        timer: 2600,
        showConfirmButton: false,
      }),
  };
  return api;
})();
