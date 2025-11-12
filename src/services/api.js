const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

export default {
  post: async (path, payload) => {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};