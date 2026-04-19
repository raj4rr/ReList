import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "", city: "", latitude: "", longitude: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    api.cities().then(setCities).catch(() => {});
  }, []);

  const resolveCityId = async (cityName) => {
    const name = cityName.trim();
    if (!name) return undefined;
    const existing = cities.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createCity(name);
    setCities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created.id;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const city_id = await resolveCityId(form.city);
      await register({
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        city_id,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
      });
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((s) => ({ ...s, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }));
      },
      () => setError("Unable to fetch your location."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <Input placeholder="Mobile (10-15 digits)" value={form.mobile} onChange={(e) => setForm((s) => ({ ...s, mobile: e.target.value }))} />
            <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
            <Input
              placeholder="Type city"
              list="cities-list-register"
              value={form.city}
              onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
            />
            <datalist id="cities-list-register">
              {cities.map((city) => (
                <option key={city.id} value={city.name} />
              ))}
            </datalist>

            <div className="flex gap-2">
              <Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))} />
              <Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))} />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={useLocation}>
              Use current location
            </Button>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" type="submit">
              Register
            </Button>
          </form>
          <p className="mt-4 text-sm">
            Already have an account? <Link className="text-primary" to="/login">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
