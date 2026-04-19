import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "http://localhost:4000/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

async function request(path, options = {}, token = "") {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function ListingItem({ item, favoriteIds, onToggleFavorite }) {
  const imageUrl = item.image ? `${API_ORIGIN}${item.image}` : "";
  const isFav = favoriteIds.has(item.id);

  return (
    <View style={styles.card}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : null}
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.meta}>Rs {Number(item.price || 0).toLocaleString("en-IN")}</Text>
      <Text style={styles.meta}>{item.city || "Unknown city"}</Text>
      <Pressable style={[styles.btn, isFav ? styles.btnDanger : styles.btnPrimary]} onPress={() => onToggleFavorite(item.id, isFav)}>
        <Text style={styles.btnText}>{isFav ? "Remove Favorite" : "Add Favorite"}</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [error, setError] = useState("");

  const isLoggedIn = useMemo(() => Boolean(token && user), [token, user]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const savedToken = await AsyncStorage.getItem("mobile_token");
        if (!savedToken) return;
        const me = await request("/auth/me", {}, savedToken);
        setToken(savedToken);
        setUser(me);
      } catch {
        await AsyncStorage.removeItem("mobile_token");
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        const [listings, favorites] = await Promise.all([
          request("/listings?limit=20", {}, token),
          request("/favorites", {}, token),
        ]);
        setItems(listings.items || []);
        setFavoriteIds(new Set((favorites || []).map((f) => f.id)));
      } catch (e) {
        setError(e.message);
      }
    }
    loadData();
  }, [token]);

  async function handleLogin() {
    try {
      setError("");
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      setToken(data.token);
      setUser(data.user);
      await AsyncStorage.setItem("mobile_token", data.token);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleLogout() {
    await AsyncStorage.removeItem("mobile_token");
    setToken("");
    setUser(null);
    setItems([]);
    setFavoriteIds(new Set());
    setIdentifier("");
    setPassword("");
  }

  async function toggleFavorite(listingId, isFav) {
    try {
      setError("");
      if (isFav) {
        await request(`/favorites/${listingId}`, { method: "DELETE" }, token);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        await request(`/favorites/${listingId}`, { method: "POST" }, token);
        setFavoriteIds((prev) => new Set(prev).add(listingId));
      }
    } catch (e) {
      Alert.alert("Failed", e.message);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {!isLoggedIn ? (
        <View style={styles.authBox}>
          <Text style={styles.heading}>ReList Mobile</Text>
          <Text style={styles.subheading}>Login with email or mobile</Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Email or mobile"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleLogin}>
            <Text style={styles.btnText}>Login</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.heading}>Hi, {user?.name || "User"}</Text>
              <Text style={styles.subheading}>Latest listings</Text>
            </View>
            <Pressable style={[styles.btn, styles.btnDanger]} onPress={handleLogout}>
              <Text style={styles.btnText}>Logout</Text>
            </Pressable>
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ListingItem item={item} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} />
            )}
            ListEmptyComponent={<Text style={styles.subheading}>No listings found.</Text>}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  authBox: { flex: 1, justifyContent: "center", padding: 20, gap: 12 },
  content: { flex: 1, padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  heading: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subheading: { fontSize: 14, color: "#6b7280" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: { paddingBottom: 20, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    gap: 6,
  },
  image: { width: "100%", height: 160, borderRadius: 10, backgroundColor: "#e5e7eb" },
  title: { fontSize: 16, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 13, color: "#4b5563" },
  btn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnDanger: { backgroundColor: "#dc2626" },
  btnText: { color: "#fff", fontWeight: "600" },
  error: { color: "#dc2626", fontSize: 13 },
});
