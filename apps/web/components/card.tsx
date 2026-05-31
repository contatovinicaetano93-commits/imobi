import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${
        hover ? "hover:shadow-md transition-shadow" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  children,
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between p-6 border-b border-gray-100">
      <div className="flex-1">
        {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        {children}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
