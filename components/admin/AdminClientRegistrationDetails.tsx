import type { HTMLAttributes } from "react";
import { Card } from "@/components/ui/Card";
import styles from "./AdminClientRegistrationDetails.module.css";

export type AdminClientRegistrationDetailsProps = HTMLAttributes<HTMLElement> & {
  city?: string;
  contactEmail?: string;
  instagram?: string;
  loginEmail?: string;
  phone?: string;
};

const registrationFields = [
  { key: "city", label: "Cidade" },
  { key: "phone", label: "Telefone" },
  { key: "contactEmail", label: "Email de contato" },
  { key: "instagram", label: "Instagram" },
] as const;

export function AdminClientRegistrationDetails({
  city,
  className,
  contactEmail,
  instagram,
  loginEmail,
  phone,
  ...props
}: AdminClientRegistrationDetailsProps) {
  const classNames = [styles.details, className ?? ""]
    .filter(Boolean)
    .join(" ");
  const values = { city, contactEmail, instagram, phone };

  return (
    <Card {...props} className={classNames}>
      <div className={styles.group}>
        <h3>Dados de contato</h3>
        <dl className={styles.list}>
          {registrationFields.map((field) => (
            <div className={styles.item} key={field.key}>
              <dt>{field.label}</dt>
              <dd>{values[field.key] ?? "Não informado"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={styles.group}>
        <h3>Acesso à conta</h3>
        <dl className={styles.list}>
          <div className={styles.item}>
            <dt>Email de acesso</dt>
            <dd>{loginEmail ?? "Não informado"}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
