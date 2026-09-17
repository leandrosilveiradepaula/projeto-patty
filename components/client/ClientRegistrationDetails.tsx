import type { HTMLAttributes } from "react";
import { Card } from "@/components/ui/Card";
import styles from "./ClientRegistrationDetails.module.css";

export type ClientRegistrationDetailsProps = HTMLAttributes<HTMLElement> & {
  city?: string;
  contactEmail?: string;
  instagram?: string;
  phone?: string;
};

const registrationFields = [
  { key: "city", label: "Cidade" },
  { key: "phone", label: "Telefone" },
  { key: "contactEmail", label: "Email de contato" },
  { key: "instagram", label: "Instagram" },
] as const;

export function ClientRegistrationDetails({
  city,
  className,
  contactEmail,
  instagram,
  phone,
  ...props
}: ClientRegistrationDetailsProps) {
  const classNames = [styles.details, className ?? ""]
    .filter(Boolean)
    .join(" ");
  const values = { city, contactEmail, instagram, phone };

  return (
    <Card {...props} className={classNames}>
      <dl className={styles.list}>
        {registrationFields.map((field) => (
          <div className={styles.item} key={field.key}>
            <dt>{field.label}</dt>
            <dd>{values[field.key] ?? "Não informado"}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
