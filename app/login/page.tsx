import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import styles from "./page.module.css";

export default function LoginPage() {
  return <main className={styles.shell}><section aria-labelledby="login-title" className={styles.content}><PageHeader description="Acesse sua área na Consultoria Corpo & Mente." eyebrow="Corpo & Mente" title="Entrar" titleId="login-title" /><Card><LoginForm /></Card></section></main>;
}
