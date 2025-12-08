import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl ${
          hover ? 'hover:border-[var(--border-light)] hover:bg-[var(--bg-tertiary)] transition-fast cursor-pointer' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
