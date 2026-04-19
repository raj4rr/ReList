const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  updateProfile: (body) => request("/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body) => request("/auth/change-password", { method: "PATCH", body: JSON.stringify(body) }),

  categories: () => request("/listings/categories"),
  createCategory: (name) => request("/listings/categories", { method: "POST", body: JSON.stringify({ name }) }),
  cities: () => request("/listings/cities"),
  createCity: (name) => request("/listings/cities", { method: "POST", body: JSON.stringify({ name }) }),
  listListings: (params) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== "" && value !== "undefined",
      ),
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return request(`/listings${qs ? `?${qs}` : ""}`);
  },
  listingSuggestions: (q) => request(`/listings/suggestions?q=${encodeURIComponent(q)}`),
  myListings: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return request(`/listings/mine${qs ? `?${qs}` : ""}`);
  },
  getListing: (id) => request(`/listings/${id}`),
  createListing: (formData) => request("/listings", { method: "POST", body: formData }),
  deactivateListing: (id) => request(`/listings/${id}/deactivate`, { method: "PATCH" }),
  deleteListing: (id) => request(`/listings/${id}`, { method: "DELETE" }),
  markSold: (id) => request(`/listings/${id}/sold`, { method: "PATCH" }),

  getFavorites: () => request("/favorites"),
  addFavorite: (listingId) => request(`/favorites/${listingId}`, { method: "POST" }),
  removeFavorite: (listingId) => request(`/favorites/${listingId}`, { method: "DELETE" }),

  getChats: () => request("/chats"),
  getChatUnreadCount: () => request("/chats/notifications/unread"),
  suggestChatUsers: (q) => request(`/chats/users/suggest?q=${encodeURIComponent(q)}`),
  startDirectChat: (target_user_id) => request("/chats/direct/start", { method: "POST", body: JSON.stringify({ target_user_id }) }),
  startChat: (listing_id) => request("/chats/start", { method: "POST", body: JSON.stringify({ listing_id }) }),
  getMessages: (chatId) => request(`/chats/${chatId}/messages`),
  sendMessage: (chatId, body) => request(`/chats/${chatId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  editMessage: (messageId, body) => request(`/chats/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ body }) }),
  deleteChat: (chatId) => request(`/chats/${chatId}`, { method: "DELETE" }),

  updateListing: (id, body) => request(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  adminListings: (q, page = 1, limit = 20) =>
    request(`/admin/listings?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  adminListingsBySeller: (sellerId, page = 1, limit = 20) =>
    request(`/admin/listings?seller_id=${sellerId}&page=${page}&limit=${limit}`),
  adminSuggestions: (q) => request(`/admin/suggestions?q=${encodeURIComponent(q)}`),
  adminUpdateListing: (id, body) => request(`/admin/listings/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminDeactivateListing: (id) => request(`/admin/listings/${id}/deactivate`, { method: "PATCH" }),
  adminDeleteListing: (id) => request(`/admin/listings/${id}`, { method: "DELETE" }),
  adminUsers: (q, page = 1, limit = 20) =>
    request(`/admin/users?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  adminUserListings: (id, page = 1, limit = 20) =>
    request(`/admin/users/${id}/listings?page=${page}&limit=${limit}`),
  adminUpdateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  adminBlockUser: (id) => request(`/admin/users/${id}/block`, { method: "PATCH" }),
  adminUnblockUser: (id) => request(`/admin/users/${id}/unblock`, { method: "PATCH" }),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),
};

export const apiBase = API_BASE.replace(/\/api$/, "");
