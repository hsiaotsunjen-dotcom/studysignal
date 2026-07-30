import { redirect } from "next/navigation";

/** V0 demo: /v1 enters Student Home directly */
export default function V1IndexPage() {
  redirect("/v1/dashboard");
}
