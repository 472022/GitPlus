import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const Avatar = ({ src, alt, size = "md", className }) => {
  const sizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-24 h-24",
    xxl: "w-64 h-64",
  };

  return (
    <img
      src={src}
      alt={alt}
      className={twMerge(
        clsx("rounded-full border border-github-light-border dark:border-github-dark-border bg-gray-100 dark:bg-gray-800 object-cover", sizes[size], className)
      )}
    />
  );
};

export default Avatar;
