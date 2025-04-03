import React from 'react';

export const Checkbox = React.forwardRef(({ 
  checked, 
  onChange, 
  className = '', 
  disabled = false, 
  ...props 
}, ref) => {
  const baseStyle = 'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  const classes = `${baseStyle} ${disabledStyle} ${className}`;
  
  return (
    <input
      ref={ref}
      type="checkbox"
      className={classes}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      {...props}
    />
  );
});

Checkbox.displayName = "Checkbox";

export default Checkbox;
