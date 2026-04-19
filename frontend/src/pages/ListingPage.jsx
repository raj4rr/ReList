import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { api, apiBase } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatINR } from "../lib/currency";
import { applySEO, buildListingSEO } from "../lib/seo";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      setItem(await api.getListing(id));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setZoomScale(1);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const seo = buildListingSEO({
      title: item.title,
      description: item.description,
      category: item.category_name,
      city: item.city,
      price: item.price,
    });
    applySEO(seo);
  }, [item?.id]);

  if (error) return <div className="mx-auto max-w-5xl p-6 text-red-600">{error}</div>;
  if (!item) return <div className="mx-auto max-w-5xl p-6">Loading...</div>;

  const isOwner = user && item.user_id === user.id;
  const selectedImage = item.images?.[selectedImageIndex] || item.images?.[0] || null;

  return (
    <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 md:grid-cols-2">
      <Card className="space-y-3 p-3">
        <div className="aspect-square overflow-hidden rounded-md bg-muted">
          {selectedImage ? (
            <img
              src={`${apiBase}${selectedImage.image_url}`}
              alt={item.title}
              className="h-full w-full cursor-zoom-in object-cover"
              onClick={() => setZoomOpen(true)}
            />
          ) : null}
        </div>
        {item.images?.length > 1 ? (
          <div className="grid grid-cols-5 gap-2">
            {item.images.map((img, idx) => (
              <button
                key={img.id}
                className={`overflow-hidden rounded-md border ${idx === selectedImageIndex ? "border-primary" : "border-border"}`}
                onClick={() => setSelectedImageIndex(idx)}
              >
                <img src={`${apiBase}${img.image_url}`} alt={`${item.title} ${idx + 1}`} className="h-16 w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </Card>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          <Button variant="outline" asChild><Link to="/">View listings</Link></Button>
        </div>
        <h1 className="text-3xl font-bold">{item.title}</h1>
        <p className="text-2xl font-extrabold text-primary">{formatINR(item.price)}</p>
        <p className="text-sm text-muted-foreground">{item.city || "Unknown city"} • {item.item_condition}</p>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Description</p>
          <div className="whitespace-pre-line break-words text-sm">
            {item.description}
          </div>
        </div>
        <p className="text-sm">Seller: <span className="font-medium">{item.seller_name}</span></p>

        <div className="flex gap-2">
          {user && !isOwner && (
            <>
              <Button onClick={async () => await api.addFavorite(item.id)}>Save</Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const c = await api.startChat(item.id);
                  navigate(`/chats?chat=${c.chat_id}`);
                }}
              >
                Chat with seller
              </Button>
            </>
          )}
          {isOwner && (
            <>
              <Button variant="outline" asChild>
                <Link to={`/listing/${item.id}/edit`}>Edit</Link>
              </Button>
              {item.status === "active" ? (
              <Button variant="outline" onClick={async () => { await api.markSold(item.id); await load(); }}>
                Mark as sold
              </Button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {zoomOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-5xl">
            <button className="absolute right-2 top-2 z-10 rounded bg-card px-3 py-1 text-sm" onClick={() => setZoomOpen(false)}>
              Close
            </button>
            <div className="absolute left-2 top-2 z-10 flex gap-2">
              <button className="rounded bg-card px-3 py-1 text-sm" onClick={() => setZoomScale((s) => Math.max(1, s - 0.25))}>-</button>
              <button className="rounded bg-card px-3 py-1 text-sm" onClick={() => setZoomScale(1)}>Reset</button>
              <button className="rounded bg-card px-3 py-1 text-sm" onClick={() => setZoomScale((s) => Math.min(3, s + 0.25))}>+</button>
            </div>
            {selectedImage ? (
              <div className="max-h-[85vh] overflow-auto rounded-md bg-black">
                <img
                  src={`${apiBase}${selectedImage.image_url}`}
                  alt={item.title}
                  className="mx-auto max-w-none origin-center"
                  style={{ transform: `scale(${zoomScale})` }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Location Map Section */}
      {item.latitude && item.longitude && (
        <div className="mt-8">
          <Card className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Location</h2>
            <div className="h-64 w-full rounded-md overflow-hidden">
              <MapContainer
                center={[parseFloat(item.latitude), parseFloat(item.longitude)]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[parseFloat(item.latitude), parseFloat(item.longitude)]}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                      <p className="text-sm font-bold text-primary mb-1">{formatINR(item.price)}</p>
                      <p className="text-xs text-muted-foreground mb-2">{item.city || "Unknown city"}</p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
                          window.open(url, '_blank');
                        }}
                      >
                        Get Directions
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
                  window.open(url, '_blank');
                }}
              >
                Open in Google Maps
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `https://maps.apple.com/?daddr=${item.latitude},${item.longitude}`;
                  window.open(url, '_blank');
                }}
              >
                Open in Apple Maps
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
