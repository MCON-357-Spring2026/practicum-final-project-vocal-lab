import { useState } from "react";

import { login, register } from "../api/auth";



export default function AuthForm({ onAuthenticated }) {

  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState(null);

  const [submitting, setSubmitting] = useState(false);



  const isRegister = mode === "register";

  const passwordsMatch = !isRegister || password === confirmPassword;

  const canSubmit =

    email &&

    password &&

    passwordsMatch &&

    !submitting &&

    (!isRegister || confirmPassword);



  const handleSubmit = async () => {

    setSubmitting(true);

    setError(null);



    try {

      if (isRegister) {

        if (password !== confirmPassword) {

          throw new Error("Passwords do not match");

        }

        await register(email, password);

      }



      const data = await login(email, password);

      onAuthenticated(data.access_token);

    } catch (err) {

      setError(err.message);

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <section>

      <h2>{isRegister ? "Create account" : "Log in"}</h2>

      <p className="msg-muted" style={{ marginBottom: "1rem" }}>

        {isRegister

          ? "Join SoundLab and start your first project."

          : "Welcome back — pick up where you left off."}

      </p>



      <div className="form-field">

        <input

          type="email"

          placeholder="Email"

          value={email}

          onChange={(e) => setEmail(e.target.value)}

          autoComplete="email"

        />

      </div>

      <div className="form-field">

        <input

          type="password"

          placeholder="Password"

          value={password}

          onChange={(e) => setPassword(e.target.value)}

          autoComplete={isRegister ? "new-password" : "current-password"}

        />

      </div>



      {isRegister && (

        <div className="form-field">

          <input

            type="password"

            placeholder="Confirm password"

            value={confirmPassword}

            onChange={(e) => setConfirmPassword(e.target.value)}

            autoComplete="new-password"

          />

        </div>

      )}



      {isRegister && confirmPassword && !passwordsMatch && (

        <p className="msg-error">Passwords do not match.</p>

      )}



      {error && <p className="msg-error">{error}</p>}



      <button

        type="button"

        className="btn-primary"

        onClick={handleSubmit}

        disabled={!canSubmit}

        style={{ width: "100%", marginTop: "0.5rem" }}

      >

        {submitting

          ? isRegister

            ? "Creating account…"

            : "Logging in…"

          : isRegister

            ? "Register"

            : "Log in"}

      </button>



      <p className="msg-muted" style={{ marginTop: "1rem" }}>

        {isRegister ? "Already have an account?" : "New here?"}{" "}

        <button

          type="button"

          className="btn-link"

          onClick={() => {

            setMode(isRegister ? "login" : "register");

            setError(null);

            setConfirmPassword("");

          }}

        >

          {isRegister ? "Log in" : "Create an account"}

        </button>

      </p>

    </section>

  );

}

