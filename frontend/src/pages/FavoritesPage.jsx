import { useEffect, useState } from "react";
import { ListingCard } from "../components/ListingCard";
import { api } from "../lib/api";

export default function FavoritesPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      setItems(await api.getFavorites());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Saved listings</h1>
      {error ? <p className="text-red-600">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
