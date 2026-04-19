import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { formatINR } from "../lib/currency";

export default function AdminUserListingsPage() {
  const { id } = useParams();
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
      const data = await api.adminUserListings(id, targetPage, 20);
      const incoming = data.items || [];
      setItems((prev) => (reset ? incoming : [...prev, ...incoming]));
      setPage(targetPage);
      setHasMore(incoming.length === 20);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!reset) setLoadingMore(false);
    }
  };

  useEffect(() => {
    load(1, true);
  }, [id]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Listings (User #{id})</h1>
        <Button variant="outline" asChild>
          <Link to="/admin">Back to Admin</Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        {items.map((l) => (
          <Card key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="font-medium">#{l.id} {l.title}</p>
              <p className="text-sm text-muted-foreground">{formatINR(l.price)} • {l.status}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild><Link to={`/listing/${l.id}`}>View</Link></Button>
            </div>
          </Card>
        ))}
      </div>
      {items.length === 0 && !error ? <p className="text-sm text-muted-foreground">This user has no listings. Quiet but mysterious.</p> : null}
      <div ref={loaderRef} className="h-8" />
    </div>
  );
}
