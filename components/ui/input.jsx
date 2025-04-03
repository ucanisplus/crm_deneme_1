import React from 'react';

export const Input = React.forwardRef(({ 
  className = '', 
  type = 'text', 
  disabled = false, 
  ...props 
}, ref) => {
  const baseStyle = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  const classes = `${baseStyle} ${disabledStyle} ${className}`;
  
  return (
    <input
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      {...props}
    />
  );
});

Input.displayName = "Input";

export default Input;
