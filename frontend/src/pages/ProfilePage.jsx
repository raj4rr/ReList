import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [cities, setCities] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    city: "",
    latitude: "",
    longitude: "",
  });
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  useEffect(() => {
    api.cities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      city: user.city || "",
      latitude: user.latitude || "",
      longitude: user.longitude || "",
    });
  }, [user?.id]);

  const resolveCityId = async (name) => {
    const value = (name || "").trim();
    if (!value) return null;
    const existing = cities.find((c) => c.name.toLowerCase() === value.toLowerCase());
    if (existing) return existing.id;
    const created = await api.createCity(value);
    setCities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created.id;
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setOk("");
      const city_id = await resolveCityId(form.city);
      await updateProfile({
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        city_id,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      });
      setOk("Profile updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setOk("");
      await api.changePassword(pwd);
      setPwd({ current_password: "", new_password: "" });
      setOk("Password updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setError("Geolocation is not supported by this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((s) => ({ ...s, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) })),
      () => setError("Unable to fetch your location."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={saveProfile}>
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <Input placeholder="Mobile" value={form.mobile} onChange={(e) => setForm((s) => ({ ...s, mobile: e.target.value }))} />
            <Input placeholder="Type city" list="cities-list-profile" value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} />
            <datalist id="cities-list-profile">{cities.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))} />
              <Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-full" onClick={useCurrentLocation}>Use current location</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => window.alert(`Latitude: ${form.latitude || "-"}\\nLongitude: ${form.longitude || "-"}`)}>
                Peek lat/lng
              </Button>
            </div>
            <Button type="submit" className="w-full">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={changePassword}>
            <Input type="password" placeholder="Current password" value={pwd.current_password} onChange={(e) => setPwd((s) => ({ ...s, current_password: e.target.value }))} />
            <Input type="password" placeholder="New password" value={pwd.new_password} onChange={(e) => setPwd((s) => ({ ...s, new_password: e.target.value }))} />
            <Button type="submit" className="w-full">Update password</Button>
          </form>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {ok ? <p className="text-sm text-green-700">{ok}</p> : null}
    </div>
  );
}
