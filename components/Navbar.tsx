import { getCurrentUser } from "@/lib/auth-server";
import { NavbarClient } from "@/components/NavbarClient";

export default async function Navbar() {
  const user = await getCurrentUser();

  return <NavbarClient user={user ? { isOwner: user.tier === "owner" } : null} />;
}
