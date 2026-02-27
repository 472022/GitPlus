import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const Card = ({ children, className }) => {
  return (
    <div
      className={twMerge(
        clsx(
          "rounded-md border border-github-light-border dark:border-github-dark-border bg-white dark:bg-github-dark-bg",
          className
        )
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }) => (
  <div className={twMerge(clsx("p-4 border-b border-github-light-border dark:border-github-dark-border bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary rounded-t-md", className))}>
    {children}
  </div>
);

export const CardBody = ({ children, className }) => (
  <div className={twMerge(clsx("p-4", className))}>{children}</div>
);

export default Card;
