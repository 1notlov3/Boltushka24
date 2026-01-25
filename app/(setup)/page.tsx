import { redirect } from "next/navigation";

// Back-compat route: this group route maps to "/".
// Keep it as a redirect so the canonical setup URL is /setup.
export default function RootPage() {
  redirect("/setup");
}
