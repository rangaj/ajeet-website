import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";

export function ApprovedWelcome() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader title="Welcome Back, Ajeet" />
      <Card className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
          Your profile has been successfully activated. You can now review and update your
          information, explore the alumni directory, and reconnect with fellow Ajeets across
          generations.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/profile" className="sm:flex-1">
            <Button className="w-full">View My Profile</Button>
          </Link>
          <Link to="/directory" className="sm:flex-1">
            <Button variant="secondary" className="w-full">
              Explore Directory
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
