import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { applySEO, buildListingSEO } from "../lib/seo";

const descriptionTemplates = [
  "Condition: Mention scratches, dents, and functionality clearly. Usage: Explain how long it has been used and why you are selling it. Accessories: Include original box, charger, bill, and warranty details if available. Pickup/Delivery: Mention preferred handover area and timing.",
  "Please describe the exact model, purchase date, current condition, and any issues. Add details about repair history, battery health, and included accessories. Mention if price is negotiable and preferred meeting location.",
];

export default function NewListingPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    category: "",
    item_condition: "good",
    latitude: "",
    longitude: "",
    images: [],
  });
  const descriptionWordCount = form.description.trim() ? form.description.trim().split(/\s+/).length : 0;
  const seo = buildListingSEO({
    title: form.title,
    description: form.description,
    category: form.category,
    city: form.city,
    price: form.price,
  });

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.cities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    applySEO(seo);
  }, [seo.titleTag, seo.metaDescription, seo.keywords]);

  useEffect(() => {
    const files = Array.from(form.images || []);
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [form.images]);

  const resolveCityId = async (name) => {
    const value = name.trim();
    if (!value) return undefined;
    const existing = cities.find((c) => c.name.toLowerCase() === value.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createCity(value);
    setCities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created.id;
  };

  const resolveCategoryId = async (name) => {
    const value = name.trim();
    if (!value) return undefined;
    const existing = categories.find((c) => c.name.toLowerCase() === value.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createCategory(value);
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created.id;
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((s) => ({ ...s, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) })),
      () => setError("Unable to fetch your location."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      if ((form.images?.length || 0) > 10) return setError("You can upload a maximum of 10 photos.");
      if (descriptionWordCount < 30) return setError("Description must be at least 30 words.");
      if (Array.from(form.images || []).some((file) => file.size > 10 * 1024 * 1024)) {
        return setError("Each photo must be 10MB or smaller.");
      }

      const city_id = await resolveCityId(form.city);
      const category_id = await resolveCategoryId(form.category);

      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("price", form.price);
      fd.append("item_condition", form.item_condition);
      if (city_id) fd.append("city_id", String(city_id));
      if (category_id) fd.append("category_id", String(category_id));
      if (form.latitude) fd.append("latitude", form.latitude);
      if (form.longitude) fd.append("longitude", form.longitude);
      Array.from(form.images).forEach((file) => fd.append("images", file));

      await api.createListing(fd);
      navigate("/my-listings");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create listing</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            <div className="flex flex-wrap gap-2">
              {descriptionTemplates.map((t, i) => (
                <Button key={i} type="button" variant="outline" size="sm" onClick={() => setForm((s) => ({ ...s, description: t }))}>
                  Use suggestion {i + 1}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Minimum 30 words. Current: {descriptionWordCount}</p>
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Description preview</p>
              <p className="whitespace-pre-line break-words text-sm">
                {form.description || "Your formatted description preview appears here."}
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">SEO report ({seo.score}/100)</p>
              <p className="text-xs">Title: {seo.titleTag}</p>
              <p className="mt-1 text-xs">Meta description: {seo.metaDescription}</p>
              <p className="mt-1 text-xs">Keywords: {seo.keywords}</p>
              <p className="mt-1 text-xs">Slug preview: /listing/{seo.slug || "your-title"}</p>
              {seo.priceSnippet ? <p className="mt-1 text-xs">{seo.priceSnippet}</p> : null}
              <div className="mt-2 space-y-1">
                {seo.checks.map((c) => (
                  <p key={c.label} className={`text-xs ${c.pass ? "text-green-700" : "text-amber-700"}`}>
                    {c.pass ? "PASS" : "TODO"}: {c.label}
                  </p>
                ))}
              </div>
            </div>

            <Input placeholder="Price (INR)" type="number" min="0" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />

            <Input
              placeholder="Type city (new city will be added)"
              list="cities-list-new"
              value={form.city}
              onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
            />
            <datalist id="cities-list-new">
              {cities.map((city) => (
                <option key={city.id} value={city.name} />
              ))}
            </datalist>

            <Input
              placeholder="Type category (new category will be added)"
              list="categories-list-new"
              value={form.category}
              onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
            />
            <datalist id="categories-list-new">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} />
              ))}
            </datalist>

            <select className="h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={form.item_condition} onChange={(e) => setForm((s) => ({ ...s, item_condition: e.target.value }))}>
              <option value="new">New</option>
              <option value="like_new">Like new</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>

            <div className="flex gap-2">
              <Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))} />
              <Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))} />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={useLocation}>Use current location</Button>

            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const files = e.target.files;
                if ((files?.length || 0) > 10) {
                  setError("You can upload a maximum of 10 photos.");
                } else if (Array.from(files || []).some((file) => file.size > 10 * 1024 * 1024)) {
                  setError("Each photo must be 10MB or smaller.");
                } else {
                  setError("");
                }
                setForm((s) => ({ ...s, images: files }));
              }}
            />
            <p className="text-xs text-muted-foreground">Up to 10 photos, 10MB each. Watermark: R4R.</p>

            {previewUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {previewUrls.map((url, idx) => (
                  <div key={url} className="overflow-hidden rounded-md border border-border bg-muted">
                    <img src={url} alt={`Preview ${idx + 1}`} className="h-24 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full">Post listing</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
