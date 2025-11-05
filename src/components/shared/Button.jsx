import React from 'react';

/**
 * A reusable button component.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The content inside the button.
 * @param {Function} props.onClick - The function to call when the button is clicked.
 * @param {string} [props.type='button'] - The button's type attribute.
 * @param {string} [props.variant='primary'] - The visual style ('primary' or 'secondary').
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 */
function Button({ children, onClick, type = 'button', variant = 'primary', disabled = false }) {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;

  return (
    <button
      className={`${baseClass} ${variantClass}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;