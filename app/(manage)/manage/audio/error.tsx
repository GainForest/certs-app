"use client";

import { useTranslations } from "./_components/audio-copy";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";

interface AudioErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AudioError({ error, reset }: AudioErrorProps) {
  const t = useTranslations("upload.errors");
  console.error("Audio route error:", error);
  return (
    <Container className="pt-8 pb-8">
      <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
        <p className="text-xl font-semibold text-destructive">
          {t("audioTitle")}
        </p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("audioDescription")}
        </p>
        <Button variant="outline" onClick={reset}>
          {t("tryAgain")}
        </Button>
      </div>
    </Container>
  );
}
