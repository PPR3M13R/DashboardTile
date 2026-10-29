import { supabase } from "./supabase";

export default function Login() {
  const google = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        scopes: "https://www.googleapis.com/auth/calendar.readonly",
      },
    });
  return <button onClick={google}>Sign in with Google</button>;
}