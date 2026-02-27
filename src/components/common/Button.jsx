import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const Button = ({ children, variant = "secondary", size = "md", className, ...props }) => {
  const variants = {
    primary: "bg-[#238636] text-white hover:bg-[#2ea043] border-[#238636] border",
    secondary: "bg-github-light-btn-bg dark:bg-github-dark-btn-bg text-github-light-text dark:text-github-dark-text border-github-light-border dark:border-github-dark-border border hover:bg-github-light-btn-hover dark:hover:bg-github-dark-btn-hover",
    danger: "bg-red-600 text-white hover:bg-red-700 border-red-600 border",
    outline: "bg-transparent text-github-light-accent dark:text-github-dark-accent border border-github-light-border dark:border-github-dark-border hover:bg-github-light-btn-hover dark:hover:bg-github-dark-btn-hover",
    invisible: "bg-transparent text-github-light-text dark:text-github-dark-text hover:bg-github-light-btn-hover dark:hover:bg-github-dark-btn-hover",
    link: "bg-transparent text-github-light-accent dark:text-github-dark-accent hover:underline p-0 h-auto",
  };

  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <button
      className={twMerge(
        clsx(
          "rounded-md font-medium transition-colors flex items-center justify-center gap-2",
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
