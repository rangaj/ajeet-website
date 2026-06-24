import { Link } from "react-router-dom";
import { CommunityPlaceholderPage } from "@/components/content/CommunityPlaceholderPage";
import { Button } from "@/components/ui/Button";

export function StoriesPage() {
  return (
    <CommunityPlaceholderPage title="Ajeet Stories">
      <p>Every Ajeet has a story worth sharing.</p>
      <p>
        We are working on a dedicated space to showcase alumni journeys, achievements, memories,
        experiences, and reflections from across the Ajeet fraternity.
      </p>
      <p className="font-medium text-brand-800">Please check back soon.</p>
      <Link to="/" className="mt-4 inline-block">
        <Button variant="secondary">Return to Home</Button>
      </Link>
    </CommunityPlaceholderPage>
  );
}
