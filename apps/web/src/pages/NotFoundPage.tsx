import { SearchX } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="standalone-message">
      <SearchX aria-hidden="true" size={30} />
      <p className="eyebrow">404</p>
      <h1>That operational view does not exist.</h1>
      <p>
        The route may have changed, or the resource is outside your authorized
        organization.
      </p>
      <Link className="button button--primary" to="/">
        Return to dashboard
      </Link>
    </main>
  );
}
