import Image from "next/image";
import Link from "next/link";

export function SiteLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md outline-none ring-ring focus-visible:ring-2"
    >
      <Image
        src="/android-chrome-192x192.png"
        alt=""
        aria-hidden
        width={32}
        height={32}
        className="rounded-lg"
        priority
      />
      <span className="text-sm font-semibold tracking-tight text-foreground">
        KVisaAssistant
      </span>
    </Link>
  );
}
