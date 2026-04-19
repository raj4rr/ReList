import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import { formatINR } from "../lib/currency";

export default function AdminPage() {
  const PROTECTED_ADMIN_EMAIL = "admin@r4r.local";
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [listingPage, setListingPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const listingsLoaderRef = useRef(null);
  const usersLoaderRef = useRef(null);
  const [error, setError] = useState("");

  const loadListings = async (q = query, page = 1, reset = true) => {
    try {
      setLoadingListings(true);
      const data = await api.adminListings(q, page, 20);
      const incoming = data.items || [];
      setListings((prev) => (reset ? incoming : [...prev, ...incoming]));
      setListingPage(page);
      setHasMoreListings(incoming.length === 20);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingListings(false);
    }
  };

  const loadUsers = async (q = query, page = 1, reset = true) => {
    try {
      setLoadingUsers(true);
      const data = await api.adminUsers(q, page, 20);
      const incoming = data.items || [];
      setUsers((prev) => (reset ? incoming : [...prev, ...incoming]));
      setUsersPage(page);
      setHasMoreUsers(incoming.length === 20);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const runSearch = async (q = query) => {
    setError("");
    await Promise.all([loadListings(q, 1, true), loadUsers(q, 1, true)]);
  };

  useEffect(() => {
    runSearch();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setSuggestions([]);
    const t = setTimeout(async () => {
      try {
        setSuggestions(await api.adminSuggestions(q));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const node = listingsLoaderRef.current;
    if (!node || !hasMoreListings || loadingListings) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadListings(query, listingPage + 1, false);
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [listingPage, hasMoreListings, loadingListings, query]);

  useEffect(() => {
    const node = usersLoaderRef.current;
    if (!node || !hasMoreUsers || loadingUsers) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadUsers(query, usersPage + 1, false);
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [usersPage, hasMoreUsers, loadingUsers, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="relative flex gap-2">
        <Input placeholder="Search listings/users" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button onClick={() => runSearch(query)}>Search</Button>
        {suggestions.length > 0 ? (
          <div className="absolute top-12 z-10 w-[80%] rounded-md border border-border bg-card p-1 shadow">
            {suggestions.map((s, idx) => (
              <button
                key={`${s.type}-${s.id}-${idx}`}
                className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setQuery(s.label);
                  setSuggestions([]);
                  runSearch(s.label);
                }}
              >
                {s.label} ({s.type})
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Listings</h2>
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3">
              <div>
                <p className="font-medium">#{l.id} {l.title}</p>
                <p className="text-sm text-muted-foreground">{formatINR(l.price)} • {l.status} • Seller: {l.seller_name}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      if (!window.confirm(`Toggle listing #${l.id} status?`)) return;
                      if (l.status === "hidden") {
                        await api.adminUpdateListing(l.id, { status: "active" });
                      } else {
                        await api.adminDeactivateListing(l.id);
                      }
                      await runSearch(query);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  {l.status === "hidden" ? "Activate" : "Deactivate"}
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      if (!window.confirm(`Delete listing #${l.id}? This cannot be undone.`)) return;
                      await api.adminDeleteListing(l.id);
                      await runSearch(query);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
        {listings.length === 0 && !error ? (
          <p className="rounded border border-border p-3 text-sm">No listings found. The admin radar found nothing juicy.</p>
        ) : null}
        <div ref={listingsLoaderRef} className="h-8" />
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Users</h2>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3">
              <div>
                <p className="font-medium">#{u.id} {u.name} ({u.role})</p>
                <p className="text-sm text-muted-foreground">{u.email} • {u.mobile || "-"} • {u.status} • Listings: {u.listings_count}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/users/${u.id}/listings`)}>Show listings</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const c = await api.startDirectChat(u.id);
                      navigate(`/chats?chat=${c.chat_id}`);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Chat
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={u.email === PROTECTED_ADMIN_EMAIL}
                  onClick={async () => {
                    try {
                      if (!window.confirm(`Make ${u.name} a support user?`)) return;
                      await api.adminUpdateUserRole(u.id, "support");
                      await runSearch(query);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Make support
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={u.email === PROTECTED_ADMIN_EMAIL}
                  onClick={async () => {
                    try {
                      if (!window.confirm(`Make ${u.name} a normal user?`)) return;
                      await api.adminUpdateUserRole(u.id, "user");
                      await runSearch(query);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Make user
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={u.email === PROTECTED_ADMIN_EMAIL}
                  onClick={async () => {
                    try {
                      if (!window.confirm(`Block ${u.name}? Their listings will be hidden.`)) return;
                      await api.adminBlockUser(u.id);
                      await runSearch(query);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Block
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={u.email === PROTECTED_ADMIN_EMAIL}
                  onClick={async () => {
                    try {
                      if (!window.confirm(`Unblock ${u.name}?`)) return;
                      await api.adminUnblockUser(u.id);
                      await runSearch(query);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Unblock
                </Button>
                <Button
                  size="sm"
                  disabled={u.email === PROTECTED_ADMIN_EMAIL}
                  onClick={async () => {
                    try {
                      if (!window.confirm(`Delete ${u.name}? This sets user inactive and hides listings.`)) return;
                      await api.adminDeleteUser(u.id);
                      await runSearch(query);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Delete user
                </Button>
              </div>
            </div>
          ))}
        </div>
        {users.length === 0 && !error ? (
          <p className="rounded border border-border p-3 text-sm">No users found. Either perfect filters or a very quiet marketplace.</p>
        ) : null}
        <div ref={usersLoaderRef} className="h-8" />
      </Card>
    </div>
  );
}
