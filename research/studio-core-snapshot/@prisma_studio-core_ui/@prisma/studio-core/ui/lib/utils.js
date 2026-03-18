// shadcn utils
import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
export const twMerge = extendTailwindMerge({});
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
