const BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8001";

export const fetchData = async (month) => {
  try {
    const res = await fetch(`${BASE}/data?month=${month || ""}`);
    if (!res.ok) {
      console.warn(`fetchData failed with status ${res.status}`);
      return { raw: [], product_columns: [], product_totals: {}, product_groups: {} };
    }
    return await res.json();
  } catch (err) {
    console.warn("fetchData network error:", err.message || err);
    return { raw: [], product_columns: [], product_totals: {}, product_groups: {} };
  }
};

export const updateRow = async (email, column, value) => {
  try {
    const res = await fetch(`${BASE}/update-row`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, column, value }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch (err) {
    console.warn("updateRow network error:", err.message || err);
    return { success: false, error: "Network error" };
  }
};
