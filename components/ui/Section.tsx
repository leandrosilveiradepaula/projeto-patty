import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Section.module.css";

type SectionHeadingLevel = 2 | 3 | 4;

export type SectionProps = HTMLAttributes<HTMLElement> & {
  action?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  headingLevel?: SectionHeadingLevel;
  title?: ReactNode;
};

export function Section({
  action,
  children,
  className,
  description,
  headingLevel = 2,
  title,
  ...props
}: SectionProps) {
  const Heading = `h${headingLevel}` as const;
  const classNames = [styles.section, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section {...props} className={classNames}>
      {title || description || action ? (
        <div className={styles.header}>
          <div className={styles.headingGroup}>
            {title ? <Heading className={styles.title}>{title}</Heading> : null}
            {description ? (
              <p className={styles.description}>{description}</p>
            ) : null}
          </div>
          {action ? <div className={styles.action}>{action}</div> : null}
        </div>
      ) : null}
      <div className={styles.content}>{children}</div>
    </section>
  );
}
