import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const Input = ({ className, ...props }) => {
  return (
    <input
      className={twMerge(
        clsx(
          "w-full rounded-md border border-github-light-border dark:border-github-dark-border bg-github-light-bg dark:bg-github-dark-bg px-3 py-1.5 text-sm text-github-light-text dark:text-github-dark-text placeholder-github-light-text-secondary dark:placeholder-github-dark-text-secondary focus:border-github-light-accent dark:focus:border-github-dark-accent focus:outline-none focus:ring-1 focus:ring-github-light-accent dark:focus:ring-github-dark-accent transition-all",
          className
        )
      )}
      {...props}
    />
  );
};

export default Input;
