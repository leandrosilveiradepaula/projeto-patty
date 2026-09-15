import type { CSSProperties, HTMLAttributes } from "react";
import styles from "./LoadingSkeleton.module.css";

type LoadingSkeletonVariant = "line" | "block" | "avatar" | "card";

export type LoadingSkeletonProps = HTMLAttributes<HTMLSpanElement> & {
  height?: CSSProperties["height"];
  variant?: LoadingSkeletonVariant;
  width?: CSSProperties["width"];
};

export function LoadingSkeleton({
  className,
  height,
  style,
  variant = "line",
  width,
  ...props
}: LoadingSkeletonProps) {
  const classNames = [styles.skeleton, styles[variant], className ?? ""]
    .filter(Boolean)
    .join(" ");
  const customStyle = {
    ...style,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <span
      {...props}
      aria-hidden="true"
      className={classNames}
      style={customStyle}
    />
  );
}
