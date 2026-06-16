import { Alert, AlertDescription } from "@/components/ui/alert";

type FormMessageProps = {
  message?: string;
  variant?: "success" | "error";
};

export function FormMessage({ message, variant = "error" }: FormMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <Alert
      variant={variant === "success" ? "default" : "destructive"}
      className="mb-4"
    >
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
