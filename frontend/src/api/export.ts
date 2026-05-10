function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fetchExport(path: string, filename: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "导出失败" }));
    throw new Error(err.detail || "导出失败");
  }

  const blob = await res.blob();
  downloadBlob(blob, filename);
}

export async function exportReport() {
  const today = new Date().toISOString().slice(0, 10);
  await fetchExport("/api/export/report", `learnpilot-report-${today}.md`);
}

export async function exportData() {
  const today = new Date().toISOString().slice(0, 10);
  await fetchExport("/api/export/data", `learnpilot-backup-${today}.json`);
}
