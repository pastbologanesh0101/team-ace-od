import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth";
import PasscodeForm from "./passcode-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const role = await currentRole();
  if (role === "admin") redirect("/admin");
  if (role === "member") redirect("/dashboard");

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          Team <span>ACE</span> · OD Tracker
        </div>
      </div>

      <h1>Enter passcode</h1>
      <p className="sub">
        Use the <b>team passcode</b> shared by the management head. Admins enter
        the admin passcode instead. It&apos;s remembered on this device.
      </p>

      <PasscodeForm />
    </div>
  );
}
