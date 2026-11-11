import Link from "next/link";
import SignInCard from "@/components/SignInCard";

export const metadata = { title: "Sign in · Requirements Studio" };

export default function LoginPage() {
  return (
    <SignInCard
      kind="org"
      note={
        <>
          Don&apos;t have a code? Ask your admin. · <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link>
        </>
      }
    />
  );
}
