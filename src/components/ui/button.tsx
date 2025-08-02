import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-terminal-green/50 focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive font-mono",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 shadow-sm',
        terminal:
          'bg-terminal-green text-terminal-green-foreground rounded-lg hover:bg-terminal-green/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 shadow-sm border-glow',
        destructive:
          'bg-destructive text-white rounded-lg hover:bg-destructive/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 shadow-sm',
        outline:
          'border border-border bg-background rounded-lg hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 shadow-sm',
        secondary:
          'bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 shadow-sm',
        ghost:
          'rounded-lg hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs',
        lg: 'h-12 rounded-lg px-6 has-[>svg]:px-4 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
