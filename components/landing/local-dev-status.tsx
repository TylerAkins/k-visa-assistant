type LocalDevStatusProps = {
  connected: boolean;
};

export function LocalDevStatus({ connected }: LocalDevStatusProps) {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={`size-1.5 shrink-0 rounded-full ${connected ? "bg-emerald-500" : "bg-destructive"}`}
        aria-hidden
      />
      <span>
        {connected
          ? "Local dev: database connected"
          : "Local dev: database offline (run docker-compose up -d --wait)"}
      </span>
    </p>
  );
}
