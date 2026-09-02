import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-6 lg:px-12", className)} {...props} />
  );
}
