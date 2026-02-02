const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiService {
  async request(method, path, options = {}) {
    const { json, params, ...customOptions } = options;

    let url = `${API_URL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers = {
      "Content-Type": "application/json",
    };

    const config = {
      method,
      headers,
      ...customOptions,
    };

    if (json) {
      config.body = JSON.stringify(json);
    }

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get("content-type");

      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Handle specific error structure from FastAPI (detail)
        const error = (data && data.detail) || response.statusText;
        throw new Error(error);
      }

      return data;
    } catch (error) {
      console.error("API Request Error:", error);
      throw error;
    }
  }

  get(path, params) {
    return this.request("GET", path, { params });
  }

  post(path, json, params) {
    return this.request("POST", path, { json, params });
  }
}

export const apiService = new ApiService();
export default apiService;
