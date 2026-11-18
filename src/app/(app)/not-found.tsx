import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-3xl">Niet gevonden</h1>
      <p className="text-muted-foreground">Deze pagina bestaat niet.</p>
      <Button asChild>
        <Link href="/">Naar het overzicht</Link>
      </Button>
    </div>
  );
}
