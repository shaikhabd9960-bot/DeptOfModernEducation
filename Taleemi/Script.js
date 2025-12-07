// script.js — TableManager compatible with teachers.html usage
// Supports: addBtnId, importBtnId, exportBtnId, exportPdfId, clearBtnId, fileInputId,
// searchInputId, searchTeacherId, searchClassId, searchPeriodsId,
// modalId, modalTitleId, saveBtnId, cancelBtnId, formFieldIds, tableBodyId, storageKey

class TableManager {
  constructor(opts) {
    // required options with defaults
    this.storageKey = opts.storageKey || "table_data";
    this.columns = opts.columns || [];
    this.tableBody = document.getElementById(opts.tableBodyId);
    this.searchInput = opts.searchInputId ? document.getElementById(opts.searchInputId) : null;
    this.searchTeacher = opts.searchTeacherId ? document.getElementById(opts.searchTeacherId) : null;
    this.searchClass = opts.searchClassId ? document.getElementById(opts.searchClassId) : null;
    this.searchPeriods = opts.searchPeriodsId ? document.getElementById(opts.searchPeriodsId) : null;

    this.addBtn = opts.addBtnId ? document.getElementById(opts.addBtnId) : null;
    this.importBtn = opts.importBtnId ? document.getElementById(opts.importBtnId) : null;
    this.exportBtn = opts.exportBtnId ? document.getElementById(opts.exportBtnId) : null;
    this.exportPdfBtn = opts.exportPdfId ? document.getElementById(opts.exportPdfId) : null;
    this.clearBtn = opts.clearBtnId ? document.getElementById(opts.clearBtnId) : null;
    this.fileInput = opts.fileInputId ? document.getElementById(opts.fileInputId) : null;

    this.modal = opts.modalId ? document.getElementById(opts.modalId) : null;
    this.modalTitle = opts.modalTitleId ? document.getElementById(opts.modalTitleId) : null;
    this.saveBtn = opts.saveBtnId ? document.getElementById(opts.saveBtnId) : null;
    this.cancelBtn = opts.cancelBtnId ? document.getElementById(opts.cancelBtnId) : null;
    this.formFieldIds = opts.formFieldIds || [];
    this.formFields = this.formFieldIds.map(id => document.getElementById(id));

    this.initialData = opts.initialData || [];
    this.data = JSON.parse(localStorage.getItem(this.storageKey)) || this.initialData.slice();

    this.editIndex = null;

    this._bindUI();
    this.render();
  }

  _bindUI() {
    // Add button
    if (this.addBtn) this.addBtn.addEventListener("click", () => this.openModal());

    // Import button -> file input click
    if (this.importBtn && this.fileInput) {
      this.importBtn.addEventListener("click", () => this.fileInput.click());
      this.fileInput.addEventListener("change", e => this._handleImportFile(e));
    }

    // Export CSV
    if (this.exportBtn) this.exportBtn.addEventListener("click", () => this.exportCSV());

    // Export PDF
    if (this.exportPdfBtn) this.exportPdfBtn.addEventListener("click", () => this.exportPDF());

    // Clear Search
    if (this.clearBtn) this.clearBtn.addEventListener("click", () => {
      if (this.searchInput) this.searchInput.value = "";
      if (this.searchTeacher) this.searchTeacher.value = "";
      if (this.searchClass) this.searchClass.value = "";
      if (this.searchPeriods) this.searchPeriods.value = "";
      this.render();
    });

    // Search inputs
    [this.searchInput, this.searchTeacher, this.searchClass, this.searchPeriods].forEach(inp => {
      if (!inp) return;
      inp.addEventListener("input", () => this.render());
    });

    // Modal Save / Cancel
    if (this.cancelBtn) this.cancelBtn.addEventListener("click", () => this.closeModal());
    if (this.saveBtn) this.saveBtn.addEventListener("click", () => this.saveRecord());

    // Enter key save (also double-ensures)
    document.addEventListener("keydown", (e) => {
      if (!this.modal) return;
      if (this.modal.style.display === "flex" || this.modal.style.display === "block") {
        if (e.key === "Enter") {
          e.preventDefault();
          if (this.saveBtn) this.saveBtn.click();
        }
      }
    });

    // Delegated click for edit/delete buttons inside table
    if (this.tableBody) {
      this.tableBody.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button");
        if (!btn) return;
        const action = btn.dataset.action;
        const idx = btn.dataset.index !== undefined ? Number(btn.dataset.index) : null;
        if (action === "edit" && idx !== null) this.openModal(idx);
        if (action === "delete" && idx !== null) this.deleteRecord(idx);
      });
    }
  }

  openModal(editIndex = null) {
    if (!this.modal) return;
    this.modal.style.display = "flex";
    this.editIndex = (editIndex !== null) ? editIndex : null;
    if (this.editIndex !== null) {
      if (this.modalTitle) this.modalTitle.textContent = "Edit Record";
      const record = this.data[this.editIndex];
      this.formFields.forEach((f, i) => {
        const key = this.columns[i].id;
        f.value = record[key] !== undefined ? record[key] : "";
      });
    } else {
      if (this.modalTitle) this.modalTitle.textContent = "Add New";
      this.formFields.forEach(f => f.value = "");
    }
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.style.display = "none";
    this.editIndex = null;
  }

  saveRecord() {
    // gather values
    const values = this.formFields.map(f => f.value.trim());
    // basic validation: ensure at least teacher name exists (you can change)
    if (values.length === 0) return;
    // build object by columns order
    const obj = {};
    this.columns.forEach((c, i) => {
      obj[c.id] = values[i] !== undefined ? values[i] : "";
    });

    if (this.editIndex !== null) {
      this.data[this.editIndex] = obj;
    } else {
      this.data.push(obj);
    }
    this._save();
    this.closeModal();
    this.render();
  }

  deleteRecord(index) {
    if (!confirm("Are you sure you want to delete this record?")) return;
    this.data.splice(index, 1);
    this._save();
    this.render();
  }

  _save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  render() {
    if (!this.tableBody) return;
    // build header if needed (optional) - table header present in HTML
    this.tableBody.innerHTML = "";

    const qSr = this.searchInput ? (this.searchInput.value || "").toLowerCase() : "";
    const qTeacher = this.searchTeacher ? (this.searchTeacher.value || "").toLowerCase() : "";
    const qClass = this.searchClass ? (this.searchClass.value || "").toLowerCase() : "";
    const qPeriods = this.searchPeriods ? (this.searchPeriods.value || "").toLowerCase() : "";

    this.data.forEach((rec, idx) => {
      // multi-filter: if any filter specified and record doesn't match, skip
      const values = this.columns.map(c => String(rec[c.id] || "").toLowerCase()).join(" ");
      if (qSr && !(String(rec[this.columns[0].id] || "").toLowerCase().includes(qSr))) return;
      if (qTeacher && !values.includes(qTeacher)) return;
      if (qClass && !values.includes(qClass)) return;
      if (qPeriods && !values.includes(qPeriods)) return;
      if (!qSr && !qTeacher && !qClass && !qPeriods) {
        // no filter or proceed
      }
      // create row
      const tr = document.createElement("tr");
      this.columns.forEach(col => {
        const td = document.createElement("td");
        td.textContent = rec[col.id] !== undefined ? rec[col.id] : "";
        tr.appendChild(td);
      });
      const tdAction = document.createElement("td");
      tdAction.innerHTML = `
        <button class="button secondary" data-action="edit" data-index="${idx}">Edit</button>
        <button class="button danger" data-action="delete" data-index="${idx}">Delete</button>
      `;
      tr.appendChild(tdAction);
      this.tableBody.appendChild(tr);
    });

    // if empty show message
    if (!this.tableBody.children.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = this.columns.length + 1;
      td.style.textAlign = "center";
      td.style.padding = "18px";
      td.textContent = "No records found.";
      tr.appendChild(td);
      this.tableBody.appendChild(tr);
    }
  }

  // CSV import expects the CSV columns to match columns order
  _handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result.replace(/\r/g, "");
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (!lines.length) return alert("Empty CSV");
      // attempt to detect header: if header matches labels, skip
      const header = lines[0].split(",").map(h => h.trim().toLowerCase());
      let start = 0;
      const colLabels = this.columns.map(c => (c.label || c.id).toLowerCase());
      const headerMatches = colLabels.every(l => header.includes(l));
      if (headerMatches) start = 1;
      const rows = lines.slice(start).map(line => {
        const parts = this._splitCsvLine(line);
        const obj = {};
        this.columns.forEach((c, i) => {
          obj[c.id] = parts[i] !== undefined ? parts[i] : "";
        });
        return obj;
      });
      this.data = rows;
      this._save();
      this.render();
      alert("Import successful: " + rows.length + " rows");
    };
    reader.readAsText(file);
    // clear input for next import
    e.target.value = "";
  }

  exportCSV() {
    if (!this.data.length) return alert("No data to export");
    const header = this.columns.map(c => (c.label || c.id)).join(",");
    const rows = this.data.map(r => this.columns.map(c => {
      const v = r[c.id] !== undefined ? String(r[c.id]) : "";
      // escape quotes
      return `"${v.replace(/"/g, '""')}"`;
    }).join(","));
    const csv = header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = this.storageKey + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  exportPDF() {
    // simple print view
    let html = `<html><head><title>Export PDF</title><style>body{font-family:Arial}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f0f8ff}</style></head><body>`;
    html += `<h2>${this.storageKey}</h2><table><thead><tr>`;
    this.columns.forEach(c => html += `<th>${c.label || c.id}</th>`);
    html += `<th>Action</th></tr></thead><tbody>`;
    this.data.forEach(r => {
      html += "<tr>";
      this.columns.forEach(c => html += `<td>${(r[c.id] !== undefined ? r[c.id] : "")}</td>`);
      html += "<td></td></tr>";
    });
    html += "</tbody></table></body></html>";
    const w = window.open("", "_blank", "width=900,height=700");
    w.document.write(html); w.document.close();
    w.print();
  }

  _splitCsvLine(line) {
    const out = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }
}

// When page loads and specific global "columns" variable exists (as in your teachers.html),
// instantiate TableManager with the exact ids used in that page.
window.addEventListener("DOMContentLoaded", () => {
  try {
    if (typeof columns !== "undefined") {
      // gather IDs from the page (teachers.html passes these names)
      const config = {
        storageKey: window.storageKey || "teachersData",
        columns: columns || [],
        tableBodyId: "dataBody",
        searchInputId: "searchSr",
        searchTeacherId: "searchTeacher",
        searchClassId: "searchClass",
        searchPeriodsId: "searchPeriods",
        addBtnId: "addBtn",
        importBtnId: "importBtn",
        exportBtnId: "exportBtn",
        exportPdfId: "exportPdf",
        clearBtnId: "clearBtn",
        fileInputId: "fileInput",
        modalId: "modal",
        modalTitleId: "modalTitle",
        saveBtnId: "saveModal",
        cancelBtnId: "cancelModal",
        formFieldIds: (window.formFieldIds || ["f_sr","f_class","f_teacher","f_subject","f_periods"]),
        initialData: window.initialData || []
      };
      // Create instance globally so edit/delete inline calls can use it (e.g., tm.editRecord)
      window.tm = new TableManager(config);
    }
  } catch (err) {
    console.error("TableManager init error:", err);
  }
});
