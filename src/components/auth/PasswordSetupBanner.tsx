import { Link } from "react-router-dom";

/** Shown when the user is approved but has not set a password yet. */
export function PasswordSetupBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 break-words">
      Set a password for faster sign-in next time.{" "}
      <Link to="/reset-password" className="font-semibold underline">
        Choose a password
      </Link>
      {" or "}
      <Link to="/forgot-password" className="font-semibold underline">
        email me a setup link
      </Link>
      .
    </div>
  );
}
