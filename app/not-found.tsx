import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-24 font-mono">
      <p className="text-sm text-fail">404</p>
      <h1 className="mt-3 text-3xl text-fg">Nothing lives at this path.</h1>
      <p className="mt-4 text-sm text-muted">
        <Link href="/projects" className="text-link underline">
          Browse the projects
        </Link>{" "}
        or go back to the{" "}
        <Link href="/" className="text-link underline">
          home page
        </Link>
        .
      </p>
    </div>
  );
}
