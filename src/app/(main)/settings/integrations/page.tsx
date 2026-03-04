import { redirect } from "next/navigation";

// Integrations page now redirects to the full DIAN module
// which includes Transmissions, Resolutions, and Configuration
export default function IntegrationsPage() {
    redirect("/dian");
}
