import { redirect } from "next/navigation";

export default function LegacyAddBusinessRedirect() {
  redirect("/admin/add-business");
}
