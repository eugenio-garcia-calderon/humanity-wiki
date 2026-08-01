import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white border border-slate-100 rounded-2xl overflow-hidden", className)} {...props}>
    {children}
  </div>
);

export const Badge = ({ className, variant = 'default', children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    default: "bg-slate-50 text-slate-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    info: "bg-blue-50 text-blue-600"
  };
  return (
    <span className={cn("px-2 py-1 text-[9px] font-bold rounded uppercase tracking-tighter", variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }>(({ className, variant = 'primary', ...props }, ref) => {
  const variants = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-600",
    outline: "bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };
  return (
    <button ref={ref} className={cn("inline-flex items-center justify-center px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors focus:outline-none", variants[variant], className)} {...props} />
  );
});
Button.displayName = "Button";
