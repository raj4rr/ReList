import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api, apiBase } from "../lib/api";
import { formatINR } from "../lib/currency";

export default function MyListingsPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef(null);
  const [error, setError] = useState("");

  const load = async (targetPage = 1, reset = false) => {
    try {
      if (!reset && loadingMore) return;
      if (!reset) setLoadingMore(true);
      setError("");
      const data = await api.myListings({ page: targetPage, limit: 20 });
      const incoming = data.items || [];
      setItems((prev) => (reset ? incoming : [...prev, ...incoming]));
      setHasMore(incoming.length === 20);
      setPage(targetPage);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!reset) setLoadingMore(false);
    }
  };

  useEffect(() => {
    load(1, true);
  }, []);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) load(page + 1, false);
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [page, hasMore, loadingMore]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">My Listings</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-4 p-3">
            <div className="flex items-center gap-3">
              <div className="h-16 w-20 overflow-hidden rounded bg-muted">
                {item.image ? <img src={`${apiBase}${item.image}`} alt={item.title} className="h-full w-full object-cover" /> : null}
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{formatINR(item.price)} • {item.status}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild><Link to={`/listing/${item.id}`}>View</Link></Button>
              <Button size="sm" asChild><Link to={`/listing/${item.id}/edit`}>Edit</Link></Button>
              {item.status !== "hidden" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!window.confirm(`Deactivate listing "${item.title}"?`)) return;
                    await api.deactivateListing(item.id);
                    await load();
                  }}
                >
                  Deactivate
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!window.confirm(`Delete listing "${item.title}"? This cannot be undone.`)) return;
                  await api.deleteListing(item.id);
                  await load();
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {items.length === 0 && !error ? (
        <p className="rounded-md border border-border bg-card p-4 text-center text-sm">
          You have no listings yet. Time to unleash your inner shopkeeper.
        </p>
      ) : null}
      <div ref={loaderRef} className="h-8" />
    </div>
  );
}
