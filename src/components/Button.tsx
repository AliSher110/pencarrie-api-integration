import { FC, ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Button: FC<ButtonProps> = ({ children, onClick, disabled, className, ...props }) => {
  const baseClasses = "rounded-md px-3.5 py-2.5 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition duration-200";
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;
  
  const buttonStyle = {
    backgroundColor: disabled ? '#E5E7EB' : '#7C3AED',
    color: '#FFFFFF',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    outlineColor: '#7C3AED'
  };
  
  return (
    <button
      type="button"
      className={combinedClasses}
      style={buttonStyle}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#6D28D9';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#7C3AED';
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
};
