import { cn } from '../../lib/utils';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary-foreground',
        className
      )}
      {...props}
    />
  );
}
