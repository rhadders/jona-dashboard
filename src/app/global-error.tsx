"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="nl">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 font-sans">
        <h1 className="text-xl font-semibold">Er ging iets mis</h1>
        <p className="max-w-md text-center text-muted-foreground">De pagina kon niet laden. Herlaad de pagina.</p>
        <button type="button" onClick={reset} className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover">
          Herlaad
        </button>
      </body>
    </html>
  );
}
