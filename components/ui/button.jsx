import React from 'react';

export const Button = React.forwardRef(({ 
  children, 
  className = '', 
  variant = 'default', 
  size = 'default', 
  onClick, 
  disabled = false,
  type = 'button', 
  ...props 
}, ref) => {
  const baseStyle = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'underline-offset-4 hover:underline text-primary',
  };
  
  const sizes = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
    lg: 'h-11 px-8 rounded-md',
    icon: 'h-10 w-10',
  };
  
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  const classes = `
    ${baseStyle} 
    ${variants[variant] || variants.default} 
    ${sizes[size] || sizes.default} 
    ${disabledStyle} 
    ${className}
  `;
  
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
