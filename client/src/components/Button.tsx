import React from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'small';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'default', className = '', ...props }: ButtonProps) {
  const variantClass = variant === 'default' ? '' : `btn--${variant}`;
  return (
    <button className={`btn ${variantClass} ${className}`.trim()} {...props} />
  );
}
