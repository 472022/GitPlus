import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const Badge = ({ children, variant = "default", className }) => {
  const variants = {
    default: "bg-gray-100 dark:bg-gray-800 text-github-light-text-secondary dark:text-github-dark-text-secondary border border-github-light-border dark:border-github-dark-border",
    outline: "border border-github-light-border dark:border-github-dark-border text-github-light-text-secondary dark:text-github-dark-text-secondary",
    public: "border border-github-light-border dark:border-github-dark-border text-github-light-text-secondary dark:text-github-dark-text-secondary rounded-full px-2 py-0.5 text-xs font-medium",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          variants[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
