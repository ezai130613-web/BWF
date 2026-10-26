"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** A password `<input>` with a show/hide toggle so people can check what they're typing. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <span className="relative flex">
      <input {...props} type={visible ? "text" : "password"} className={cn("w-full pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 hover:text-neutral-800"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </span>
  );
}
