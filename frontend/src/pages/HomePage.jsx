import { useEffect, useRef, useState } from "react";
import { ListingCard } from "../components/ListingCard";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [cities, setCities] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef(null);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const load = async (targetPage = 1, reset = false) => {
    try {
      if (!reset && loadingMore) return;
      if (!reset) setLoadingMore(true);
      setError("");
      const matchedCity = cities.find((c) => c.name.toLowerCase() === city.trim().toLowerCase());
      const data = await api.listListings({
        q: query || undefined,
        city_id: matchedCity ? matchedCity.id : undefined,
        city: matchedCity ? undefined : city || undefined,
        page: targetPage,
        limit: 20,
      });
      const incoming = data.items || [];
      setItems((prev) => (reset ? incoming : [...prev, ...incoming]));
      setHasMore(incoming.length === 20);
      setPage(targetPage);
    } catch (e) {
      setError(e.message);
    } finally {
      if (!reset) setLoadingMore(false);
    }
  };

  useEffect(() => {
    api.cities().then(setCities).catch(() => {});
    load(1, true);
  }, []);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        load(page + 1, false);
      }
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [page, hasMore, loadingMore, query, city, cities]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSuggestions(await api.listingSuggestions(value));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h1 className="text-2xl font-bold">Find second-hand deals near you</h1>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Input
              placeholder="Search listings"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            />
            {showSuggestions && suggestions.length > 0 ? (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card shadow">
                {suggestions.map((title) => (
                  <button
                    key={title}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery(title);
                      setShowSuggestions(false);
                      setTimeout(() => load(1, true), 0);
                    }}
                  >
                    {title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Input
            placeholder="Type city"
            list="cities-list-home"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <datalist id="cities-list-home">
            {cities.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>

          <button className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={() => load(1, true)}>
            Search
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <iframe
            title="Google Map"
            className="h-64 w-full"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(city || "India")}&z=10&output=embed`}
          />
        </div>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ListingCard key={item.id} item={item} onFavorite={user ? () => {} : null} />
        ))}
      </section>
      {items.length === 0 && !error ? (
        <p className="rounded-md border border-border bg-card p-4 text-center text-sm">
          No listings yet. Looks like everyone is still taking photos of their stuff.
        </p>
      ) : null}
      <div ref={loaderRef} className="h-8" />
    </div>
  );
}
