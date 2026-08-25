import axios from "axios";

// Vite uses import.meta.env instead of process.env
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

if (!BACKEND_URL) {
  console.warn(
    "VITE_BACKEND_URL is not configured. Please add it to your Vercel Environment Variables."
  );
}

export const API = `${BACKEND_URL || ""}/api`;

// -------------------------
// Basic HTTP helpers
// -------------------------

const get = (path) =>
  axios.get(`${API}${path}`).then((response) => response.data);

const post = (path, data) =>
  axios.post(`${API}${path}`, data).then((response) => response.data);

const put = (path, data) =>
  axios.put(`${API}${path}`, data).then((response) => response.data);

const del = (path) =>
  axios.delete(`${API}${path}`).then((response) => response.data);

// -------------------------
// Main API
// -------------------------

export const api = {
  dashboard: () => get("/dashboard"),

  heatmap: () => get("/analytics/heatmap"),

  analytics: () => get("/analytics/summary"),

  settings: () => get("/settings"),

  saveSettings: (data) =>
    put("/settings", data),

  exportAll: () =>
    get("/export"),

  importAll: (data) =>
    post("/import", data),

  clearAll: () =>
    del("/clear-all"),

  masterError: (id) =>
    post(`/errors/${id}/master`),

  completeRevision: (id) =>
    post(`/revisions/${id}/complete`),
};

// -------------------------
// Generic CRUD helper
// -------------------------

export const crud = (route) => ({
  list: () =>
    get(`/${route}`),

  create: (data) =>
    post(`/${route}`, data),

  update: (id, data) =>
    put(`/${route}/${id}`, data),

  remove: (id) =>
    del(`/${route}/${id}`),
});

// -------------------------
// Utility functions
// -------------------------

export const fmtMinutes = (minutes) => {
  if (!minutes) return "0m";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  return hours
    ? `${hours}h ${remainingMinutes}m`
    : `${remainingMinutes}m`;
};

export const today = () =>
  new Date().toISOString().slice(0, 10);