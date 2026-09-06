import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import SignIn from "./sign-in";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(isAdminEmail(user.email) ? "/admin" : "/dashboard");
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          Team <span>ACE</span> · OD Tracker
        </div>
      </div>

      <h1>Sign in</h1>
      <p className="sub">
        Enter your email and we&apos;ll send you a one-tap sign-in link. Use the
        email you want your OD records tied to.
      </p>

      <SignIn />
    </div>
  );
}
