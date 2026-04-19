import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { api, apiBase } from "../lib/api";
import { formatINR } from "../lib/currency";

export function ListingCard({ item, onFavorite }) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[4/3] w-full bg-muted">
        {item.image ? (
          <img src={`${apiBase}${item.image}`} alt={item.title} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <CardContent className="space-y-2 pt-4">
        <h3 className="line-clamp-1 text-base font-semibold">{item.title}</h3>
        <p className="text-xl font-bold text-primary">{formatINR(item.price)}</p>
        <p className="text-sm text-muted-foreground">{item.city || "Unknown city"}</p>
        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link to={`/listing/${item.id}`}>View</Link>
          </Button>
          {onFavorite && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await api.addFavorite(item.id);
                onFavorite();
              }}
            >
              Save
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
