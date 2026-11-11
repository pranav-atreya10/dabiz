import Link from "next/link";
import SignInCard from "@/components/SignInCard";

export const metadata = { title: "Admin · Requirements Studio" };

export default function AdminLoginPage() {
  return (
    <SignInCard
      kind="admin"
      note={
        <>
          Looking for the app? <Link href="/login" style={{ color: "inherit" }}>Sign in with your org code</Link>.
        </>
      }
    />
  );
}
