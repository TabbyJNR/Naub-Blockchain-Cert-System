import Image from "next/image";
import naubLogo from "@/logo.png";

interface NaubBrandProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function NaubBrand({
  title = "Nigerian Army University Biu",
  subtitle = "Blockchain Certificate System",
  className = "",
}: NaubBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-12 w-12 rounded-full border border-primary/30 bg-white p-1 shadow-sm">
        <Image
          src={naubLogo}
          alt="Nigerian Army University Biu logo"
          className="h-full w-full object-contain"
          priority
        />
      </div>
      <div className="leading-tight">
        <h1 className="font-bold text-xl text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
