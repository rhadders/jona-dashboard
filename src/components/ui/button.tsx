import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Knoppen zijn altijd volledig rond: bedieningselementen zijn pillen, alleen
 * containers zijn zacht afgerond. Ingedrukt zakt de knop 1px, nooit een
 * schaalsprong. `accent` is de teal variant: hooguit één per scherm (in de
 * editor de AI-knop).
 */
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform] active:translate-y-px",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        accent: "bg-brand text-brand-foreground hover:bg-brand-hover hover:text-ink-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-transparent hover:border-primary hover:bg-secondary-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline decoration-brand/70 underline-offset-[3px] hover:text-brand-strong hover:decoration-brand",
      },
      // Op een touchscreen minstens 40px hoog: goed te raken met een duim.
      size: {
        default: "h-9 px-5 py-2 pointer-coarse:h-10",
        sm: "h-8 px-4 text-xs pointer-coarse:h-10",
        lg: "h-11 px-8 text-base",
        icon: "size-9 pointer-coarse:size-10",
        // De kleine icoonknop in kaarten en panelen (34px), met een icoon van 18px.
        "icon-sm": "size-[34px] pointer-coarse:size-10 [&_svg]:size-[18px]",
      },
    },
    // Een losse icoonknop in een kaart is gedempt tot je erop wijst.
    compoundVariants: [{ variant: "ghost", size: "icon-sm", className: "text-muted-foreground" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
