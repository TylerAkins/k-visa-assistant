type LocalEmailDevNoticeProps = {
  className?: string;
};

export function LocalEmailDevNotice({ className }: LocalEmailDevNoticeProps) {
  return (
    <p
      className={`rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground ${className ?? ""}`}
    >
      <span className="font-medium text-foreground">Local development:</span>{" "}
      verification and reset links are printed in the terminal running{" "}
      <code className="rounded bg-muted px-1 py-0.5 text-xs">pnpm dev</code>,
      not sent to your inbox.
    </p>
  );
}
