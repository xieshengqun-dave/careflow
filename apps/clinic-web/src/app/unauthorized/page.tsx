import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">403</h1>
        <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
        <Button asChild>
          <Link href="/queue">Go to Queue</Link>
        </Button>
      </div>
    </div>
  );
}
