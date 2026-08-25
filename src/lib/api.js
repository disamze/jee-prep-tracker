import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const get = (p) => axios.get(`${API}${p}`).then((r) => r.data);
const post = (p, d) => axios.post(`${API}${p}`, d).then((r) => r.data);
const put = (p, d) => axios.put(`${API}${p}`, d).then((r) => r.data);
const del = (p) => axios.delete(`${API}${p}`).then((r) => r.data);

export const api = {
  dashboard: () => get("/dashboard"),
  heatmap: () => get("/analytics/heatmap"),
  analytics: () => get("/analytics/summary"),
  settings: () => get("/settings"),
  saveSettings: (d) => put("/settings", d),
  exportAll: () => get("/export"),
  importAll: (d) => post("/import", d),
  clearAll: () => del("/clear-all"),
  masterError: (id) => post(`/errors/${id}/master`),
  completeRevision: (id) => post(`/revisions/${id}/complete`),
};

export const crud = (route) => ({
  list: () => get(`/${route}`),
  create: (d) => post(`/${route}`, d),
  update: (id, d) => put(`/${route}/${id}`, d),
  remove: (id) => del(`/${route}/${id}`),
});

export const fmtMinutes = (m) => {
  if (!m) return "0m";
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h ? `${h}h ${mm}m` : `${mm}m`;
};

export const today = () => new Date().toISOString().slice(0, 10);
