import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await login({ identifier, password });
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input
              placeholder="Email or mobile number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" type="submit">
              Login
            </Button>
          </form>
          <p className="mt-4 text-sm">
            No account? <Link className="text-primary" to="/register">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
