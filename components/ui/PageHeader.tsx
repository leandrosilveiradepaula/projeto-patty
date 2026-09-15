import type { HTMLAttributes, ReactNode } from "react";
import styles from "./PageHeader.module.css";

type PageHeaderHeadingLevel = 1 | 2 | 3;

export type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  headingLevel?: PageHeaderHeadingLevel;
  primaryAction?: ReactNode;
  title: ReactNode;
  titleId?: string;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  headingLevel = 1,
  primaryAction,
  title,
  titleId,
  ...props
}: PageHeaderProps) {
  const classNames = [styles.pageHeader, className ?? ""]
    .filter(Boolean)
    .join(" ");
  const Heading = `h${headingLevel}` as const;

  return (
    <header {...props} className={classNames}>
      <div className={styles.content}>
        {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
        <Heading className={styles.title} id={titleId}>
          {title}
        </Heading>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions || primaryAction ? (
        <div className={styles.actions}>
          {actions}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}
