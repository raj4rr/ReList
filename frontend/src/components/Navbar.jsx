import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import logo from "../assets/logo.svg";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let timer = null;
    async function loadUnread() {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      try {
        const data = await api.getChatUnreadCount();
        setUnreadCount(Number(data.unread_count || 0));
      } catch {
        setUnreadCount(0);
      }
    }
    loadUnread();
    if (user) timer = setInterval(loadUnread, 10000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [user?.id]);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-primary">
          <img src={logo} alt="ReList Logo" className="h-8 w-8" />
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink to="/" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
            Browse
          </NavLink>
          {user && (
            <>
              <NavLink to="/new" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                Ads Posted By
              </NavLink>
              <NavLink to="/favorites" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                Favorites
              </NavLink>
              <NavLink to="/my-listings" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                My Listings
              </NavLink>
              <NavLink to="/profile" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                Profile
              </NavLink>
              <NavLink to="/chats" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                Chats {unreadCount > 0 ? `(${unreadCount})` : ""}
              </NavLink>
              {user.role === "admin" ? (
                <NavLink to="/admin" className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                  Admin
                </NavLink>
              ) : null}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden sm:flex">
            Download Mobile App
          </Button>

          {user ? (
            <>
              <span className="hidden text-sm md:block">{user.name}</span>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
