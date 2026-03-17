import { cn } from "@/ui/lib/utils";
function Skeleton({ className, ...props }) {
    return (<div className={cn("animate-pulse rounded-md bg-foreground/10", className)} {...props}/>);
}
export { Skeleton };
