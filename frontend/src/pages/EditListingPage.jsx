import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { applySEO, buildListingSEO } from "../lib/seo";

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    category: "",
    item_condition: "good",
    status: "active",
    latitude: "",
    longitude: "",
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
    Promise.all([api.categories(), api.cities(), api.getListing(id)])
      .then(([cats, cityRows, item]) => {
        setCategories(cats);
        setCities(cityRows);
        setForm({
          title: item.title || "",
          description: item.description || "",
          price: item.price || "",
          city: item.city || "",
          category: item.category_name || "",
          item_condition: item.item_condition || "good",
          status: item.status || "active",
          latitude: item.latitude || "",
          longitude: item.longitude || "",
        });
        setExistingImages(item.images || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    applySEO(seo);
  }, [seo.titleTag, seo.metaDescription, seo.keywords]);

  useEffect(() => {
    const files = Array.from(newImages || []);
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newImages]);

  const resolveCityId = async (name) => {
    const value = (name || "").trim();
    if (!value) return null;
    const existing = cities.find((c) => c.name.toLowerCase() === value.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createCity(value);
    setCities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created.id;
  };

  const resolveCategoryId = async (name) => {
    const value = (name || "").trim();
    if (!value) return null;
    const existing = categories.find((c) => c.name.toLowerCase() === value.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createCategory(value);
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created.id;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      if (descriptionWordCount < 30) return setError("Description must be at least 30 words.");
      if (newImages.length > 10) return setError("You can upload a maximum of 10 photos.");
      if (Array.from(newImages).some((file) => file.size > 10 * 1024 * 1024)) {
        return setError("Each photo must be 10MB or smaller.");
      }

      const city_id = await resolveCityId(form.city);
      const category_id = await resolveCategoryId(form.category);

      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("price", form.price);
      fd.append("item_condition", form.item_condition);
      fd.append("status", form.status);
      if (city_id) fd.append("city_id", String(city_id));
      if (category_id) fd.append("category_id", String(category_id));
      if (form.latitude) fd.append("latitude", form.latitude);
      if (form.longitude) fd.append("longitude", form.longitude);
      newImages.forEach((file) => fd.append("images", file));

      await api.updateListing(id, fd);
      navigate("/my-listings");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-8">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit listing</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
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
            <Input placeholder="Price" type="number" min="0" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />

            <Input placeholder="Type city" list="cities-list-edit" value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} />
            <datalist id="cities-list-edit">{cities.map((c) => <option key={c.id} value={c.name} />)}</datalist>

            <Input placeholder="Type category" list="categories-list-edit" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
            <datalist id="categories-list-edit">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist>

            <select className="h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={form.item_condition} onChange={(e) => setForm((s) => ({ ...s, item_condition: e.target.value }))}>
              <option value="new">New</option>
              <option value="like_new">Like new</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>

            <select className="h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="hidden">Hidden</option>
            </select>

            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))} />
              <Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))} />
            </div>

            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 10) {
                  setError("You can upload a maximum of 10 photos.");
                } else if (files.some((file) => file.size > 10 * 1024 * 1024)) {
                  setError("Each photo must be 10MB or smaller.");
                } else {
                  setError("");
                }
                setNewImages(files);
              }}
            />
            <p className="text-xs text-muted-foreground">Upload up to 10 new photos. Existing listing photos will remain visible unless removed separately.</p>

            {existingImages.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Existing photos</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {existingImages.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-md border border-border bg-muted">
                      <img src={image.image_url} alt="Existing listing" className="h-24 w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {previewUrls.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">New image previews</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {previewUrls.map((url, idx) => (
                    <div key={url} className="overflow-hidden rounded-md border border-border bg-muted">
                      <img src={url} alt={`Preview ${idx + 1}`} className="h-24 w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full">Save changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
