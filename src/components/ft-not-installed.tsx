// Boot-gate empty state shown by `FtGate` (App.tsx) when /api/info reports
// that fieldtheory-cli isn't on PATH. Replaces the entire UI — no sidebar,
// no top bar — because nothing in the rest of the app works without ft.

import { useState } from "react";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

const INSTALL_CMD = "npm install -g fieldtheory";

export function FtNotInstalled() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-svh items-center justify-center p-8">
      <div className="flex max-w-md flex-col gap-3 text-sm">
        <h1 className="text-base font-semibold">fieldtheory-cli not found</h1>
        <p className="text-muted-foreground">
          index-n2 is a viewer for fieldtheory-cli's bookmark database.
          Install fieldtheory-cli first, then reload this page.
        </p>
        <div className="bg-muted flex items-center gap-2 rounded-lg py-1 pl-3 pr-1 font-mono text-xs">
          <code className="flex-1">{INSTALL_CMD}</code>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy install command"}
          >
            {copied ? <RiCheckLine /> : <RiFileCopyLine />}
          </Button>
        </div>
        <a
          href="https://github.com/afar1/fieldtheory-cli"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:underline"
        >
          github.com/afar1/fieldtheory-cli
        </a>
      </div>
    </div>
  );
}
