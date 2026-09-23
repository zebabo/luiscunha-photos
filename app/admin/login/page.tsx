"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <div className="container" style={{ maxWidth: 400, paddingTop: 80 }}>
      <h1>Administração</h1>
      <form action={action} className="card">
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" />
        </div>
        {state?.error && <p className="error">{state.error}</p>}
        <button className="btn block" disabled={pending}>
          {pending ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
