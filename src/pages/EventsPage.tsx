import { Link } from "react-router-dom";
import { CommunityPlaceholderPage } from "@/components/content/CommunityPlaceholderPage";
import { Button } from "@/components/ui/Button";

export function EventsPage() {
  return (
    <CommunityPlaceholderPage title="Ajeet Events">
      <p>We are building a dedicated Events experience for the Ajeet community.</p>
      <p>
        Soon you will be able to discover alumni gatherings, reunions, chapter events, webinars,
        speaker sessions, and other community initiatives.
      </p>
      <p className="font-medium text-brand-800">Please check back soon for updates.</p>
      <Link to="/" className="mt-4 inline-block">
        <Button variant="secondary">Return to Home</Button>
      </Link>
    </CommunityPlaceholderPage>
  );
}
