import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { useAuth } from "./lib/auth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NewListingPage from "./pages/NewListingPage";
import ListingPage from "./pages/ListingPage";
import FavoritesPage from "./pages/FavoritesPage";
import ChatsPage from "./pages/ChatsPage";
import EditListingPage from "./pages/EditListingPage";
import AdminPage from "./pages/AdminPage";
import MyListingsPage from "./pages/MyListingsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminUserListingsPage from "./pages/AdminUserListingsPage";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/listing/:id" element={<ListingPage />} />
        <Route
          path="/listing/:id/edit"
          element={
            <PrivateRoute>
              <EditListingPage />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/new"
          element={
            <PrivateRoute>
              <NewListingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <PrivateRoute>
              <FavoritesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-listings"
          element={
            <PrivateRoute>
              <MyListingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/chats"
          element={
            <PrivateRoute>
              <ChatsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/:id/listings"
          element={
            <AdminRoute>
              <AdminUserListingsPage />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  );
}
