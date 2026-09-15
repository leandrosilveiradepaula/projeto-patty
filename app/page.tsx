import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormField } from "@/components/ui/FormField";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Textarea } from "@/components/ui/Textarea";
import { TextInput } from "@/components/ui/TextInput";
import type { CSSProperties } from "react";

const demoStackStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
  marginTop: "var(--space-8)",
};

const demoRowStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-3)",
};

const formDemoStyle: CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
};

const skeletonDemoStyle: CSSProperties = {
  alignItems: "center",
  display: "grid",
  gap: "var(--space-3)",
  gridTemplateColumns: "auto minmax(0, 1fr)",
};

const introStyle: CSSProperties = {
  maxWidth: "680px",
  minWidth: 0,
  width: "100%",
};

export default function Home() {
  return (
    <main className="page-shell">
      <section className="intro" aria-labelledby="home-title" style={introStyle}>
        <PageHeader
          actions={<Button variant="outline">Acao secundaria</Button>}
          description="Esta aplicacao Next.js minima prepara o repositorio para a fundacao visual do Corpo & Mente sem adicionar regras de negocio, autenticacao, Supabase ou dados reais."
          eyebrow="Projeto Patty"
          primaryAction={<Button>Acao principal</Button>}
          title="Fundacao frontend inicializada"
          titleId="home-title"
        />
        <p className="token-note">Tokens, canvas, surface e fontes ativos</p>
        <div aria-label="Demonstracao de componentes base" style={demoStackStyle}>
          <PageHeader
            description="Exemplo de cabecalho longo para validar quebra de texto, acoes compostas e empilhamento responsivo sem assumir largura de aplicacao."
            headingLevel={2}
            title="Cabecalho estrutural com titulo longo para demonstracao"
          />
          <Section
            action={<Button size="compact" variant="outline">Acao da secao</Button>}
            description="Sections agrupam conteudo de pagina com espacamento e hierarquia consistentes."
            headingLevel={2}
            title="Componentes estruturais"
          >
            <Card>
              <p>
                Exemplo de conteudo dentro de Card. Este texto e propositalmente
                mais longo para validar quebra de linha, padding responsivo e
                ausencia de overflow horizontal em telas estreitas.
              </p>
            </Card>
          </Section>
          <Section>
            <Card variant="subtle">
              <p>
                Section tambem funciona sem titulo, descricao ou acao. Card e um
                container visual generico baseado em surface, border e radius.
              </p>
            </Card>
          </Section>
          <div aria-label="Variantes de Button" style={demoRowStyle}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div aria-label="Estados de Button" style={demoRowStyle}>
            <Button size="compact">Compact</Button>
            <Button disabled variant="outline">
              Disabled
            </Button>
            <Button loading>Loading</Button>
          </div>
          <div aria-label="IconButton" style={demoRowStyle}>
            <IconButton aria-label="Abrir demonstracao" variant="outline">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path
                  d="M5 12h14M12 5v14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </IconButton>
            <IconButton aria-label="Fechar demonstracao" variant="ghost">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path
                  d="m6 6 12 12M18 6 6 18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </IconButton>
            <IconButton aria-label="Carregando demonstracao" loading variant="secondary">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 5v14M5 12h14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </IconButton>
          </div>
          <div aria-label="Variantes de Badge" style={demoRowStyle}>
            <Badge variant="positive">Concluido</Badge>
            <Badge variant="warning">Pendente</Badge>
            <Badge variant="info">Em analise</Badge>
            <Badge variant="critical">Atencao</Badge>
            <Badge variant="neutral">Arquivado</Badge>
          </div>
          <div aria-label="Variantes de Alert" style={demoStackStyle}>
            <Alert title="Informacao disponivel" variant="info">
              Ha uma atualizacao de interface disponivel para revisao.
            </Alert>
            <Alert live="polite" title="Campos pendentes" variant="warning">
              Alguns campos tecnicos ainda precisam ser revisados.
            </Alert>
            <Alert
              action={<Button size="compact" variant="outline">Tentar novamente</Button>}
              live="assertive"
              title="Nao foi possivel concluir"
              variant="critical"
            >
              A acao solicitada nao foi finalizada. Revise e tente novamente.
            </Alert>
            <Alert title="Alteracao salva" variant="success">
              A demonstracao foi atualizada com sucesso.
            </Alert>
          </div>
          <div aria-label="Campos de formulario" style={formDemoStyle}>
            <FormField id="display-name" label="Nome de exibicao">
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  autoComplete="name"
                  name="displayName"
                  placeholder="Digite um nome"
                />
              )}
            </FormField>
            <FormField
              description="Use um titulo curto para identificar este item."
              id="title"
              label="Titulo"
            >
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  name="title"
                  placeholder="Digite um titulo"
                />
              )}
            </FormField>
            <FormField id="required-title" label="Campo obrigatorio" required>
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  name="requiredTitle"
                  placeholder="Preencha este campo"
                  required
                />
              )}
            </FormField>
            <FormField id="disabled-field" label="Campo desabilitado">
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  disabled
                  name="disabledField"
                  placeholder="Indisponivel no momento"
                />
              )}
            </FormField>
            <FormField
              description="Este exemplo combina descricao e erro."
              error="Preencha este campo."
              id="invalid-title"
              label="Campo com erro"
              required
            >
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  name="invalidTitle"
                  placeholder="Digite uma informacao"
                  required
                />
              )}
            </FormField>
            <FormField id="observation" label="Observacao">
              {(fieldProps) => (
                <Textarea
                  {...fieldProps}
                  name="observation"
                  placeholder="Escreva uma observacao"
                />
              )}
            </FormField>
            <FormField
              description="Texto livre para demonstrar conteudo longo."
              id="description"
              label="Descricao"
            >
              {(fieldProps) => (
                <Textarea
                  {...fieldProps}
                  name="description"
                  placeholder="Descreva os detalhes principais"
                />
              )}
            </FormField>
            <FormField
              error="Revise esta descricao."
              id="invalid-description"
              label="Descricao com erro"
            >
              {(fieldProps) => (
                <Textarea
                  {...fieldProps}
                  name="invalidDescription"
                  placeholder="Inclua uma descricao"
                />
              )}
            </FormField>
          </div>
          <div aria-label="Estados vazios e de erro" style={demoStackStyle}>
            <EmptyState
              description="Quando houver itens, eles aparecerao aqui."
              title="Nenhum item disponivel"
            />
            <EmptyState
              action={<Button variant="secondary">Adicionar item</Button>}
              description="Use uma acao quando houver um proximo passo claro."
              title="Lista sem conteudo"
              visual={
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M6 8h12M6 12h8M6 16h10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              }
            />
            <ErrorState
              description="Tente novamente."
              title="Nao foi possivel carregar"
            />
            <ErrorState
              action={<Button variant="outline">Tentar novamente</Button>}
              description="A operacao nao foi concluida. A acao abaixo e apenas demonstrativa."
              title="Falha temporaria"
              visual={
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 8v5M12 17h.01M5 20h14L12 4 5 20Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              }
            />
          </div>
          <div aria-label="LoadingSkeleton" style={demoStackStyle}>
            <div style={skeletonDemoStyle}>
              <LoadingSkeleton variant="avatar" />
              <div aria-hidden="true" style={demoStackStyle}>
                <LoadingSkeleton variant="line" width="72%" />
                <LoadingSkeleton variant="line" width="48%" />
              </div>
            </div>
            <LoadingSkeleton variant="block" />
            <LoadingSkeleton variant="card" />
          </div>
        </div>
      </section>
    </main>
  );
}
