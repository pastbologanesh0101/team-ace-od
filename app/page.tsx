import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await currentSession();
  if (session?.role === "admin") redirect("/admin");
  if (session?.role === "member") redirect("/dashboard");

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          Team <span>ACE</span> · OD Tracker
        </div>
      </div>

      <h1>Sign in</h1>
      <p className="sub">
        Log in with your <b>registration number</b> and a personal PIN. You can
        only file OD for yourself.
      </p>

      <LoginForm />
    </div>
  );
}
