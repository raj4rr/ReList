import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ListingCard } from "../components/ListingCard";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatINR } from "../lib/currency";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function FitBounds({ items }) {
  const map = useMap();

  useEffect(() => {
    const validItems = items.filter((item) => item.latitude && item.longitude);
    if (validItems.length > 0) {
      const bounds = L.latLngBounds(
        validItems.map((item) => [parseFloat(item.latitude), parseFloat(item.longitude)])
      );
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [items, map]);

  return null;
}

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
  const [viewMode, setViewMode] = useState("list");
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);

  const validMapItems = useMemo(
    () => items.filter((item) => item.latitude && item.longitude),
    [items]
  );

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

  useEffect(() => {
    if (viewMode !== "map" || validMapItems.length === 0) return;
    const bounds = L.latLngBounds(
      validMapItems.map((item) => [parseFloat(item.latitude), parseFloat(item.longitude)])
    );
    if (bounds.isValid()) {
      const center = bounds.getCenter();
      setMapCenter([center.lat, center.lng]);
      setMapZoom(10);
    }
  }, [viewMode, validMapItems]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h1 className="text-2xl font-bold">Find second-hand deals near you</h1>
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); load(1, true); }}>
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
                    type="button"
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

          <button type="submit" className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            onClick={() => setViewMode("list")}
          >
            List View
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium ${viewMode === "map" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            onClick={() => setViewMode("map")}
          >
            Map View
          </button>
        </div>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      {viewMode === "list" ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ListingCard key={item.id} item={item} onFavorite={user ? () => {} : null} />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-4">
          {validMapItems.length > 0 ? (
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "500px", width: "100%" }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <FitBounds items={validMapItems} />
              {validMapItems.map((item) => (
                <Marker key={item.id} position={[parseFloat(item.latitude), parseFloat(item.longitude)]}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                      <p className="text-sm font-bold text-primary mb-1">{formatINR(item.price)}</p>
                      <p className="text-xs text-muted-foreground mb-2">{item.city || "Unknown city"}</p>
                      <Link to={`/listing/${item.id}`} className="text-primary hover:underline text-sm">View Details</Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <p className="rounded-md border border-border bg-card p-4 text-center text-sm">
              No listings with location data available for map view.
            </p>
          )}
        </section>
      )}
      {items.length === 0 && !error ? (
        <p className="rounded-md border border-border bg-card p-4 text-center text-sm">
          No listings yet. Looks like everyone is still taking photos of their stuff.
        </p>
      ) : null}
      <div ref={loaderRef} className="h-8" />
    </div>
  );
}
