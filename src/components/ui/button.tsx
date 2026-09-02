import Link from "next/link";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-wide transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-gold-500 text-navy-950 hover:bg-gold-400",
        secondary:
          "border border-gold-500/60 text-ivory-100 hover:border-gold-400 hover:text-gold-300",
        ghost: "text-ivory-200 hover:text-gold-400",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & { className?: string };

type ButtonAsButton = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.ComponentProps<typeof Link>, "href"> & { href: React.ComponentProps<typeof Link>["href"] };

export function Button({ className, variant, ...props }: ButtonAsButton | ButtonAsLink) {
  if ("href" in props && props.href !== undefined) {
    const { href, ...linkProps } = props as ButtonAsLink;
    return <Link href={href} className={cn(buttonVariants({ variant }), className)} {...linkProps} />;
  }

  return <button className={cn(buttonVariants({ variant }), className)} {...(props as ButtonAsButton)} />;
}
