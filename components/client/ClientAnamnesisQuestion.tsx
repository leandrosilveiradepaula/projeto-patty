import type { AnamnesisQuestion } from "@/lib/anamnesis/catalog";
import styles from "./ClientAnamnesisQuestion.module.css";

type ClientAnamnesisQuestionProps = {
  question: AnamnesisQuestion;
};

export function ClientAnamnesisQuestion({
  question,
}: ClientAnamnesisQuestionProps) {
  if (question.representationKind === "single-choice") {
    return (
      <fieldset className={styles.choiceQuestion}>
        <legend>{question.label}</legend>
        <div className={styles.options}>
          {question.options?.map((option) => (
            <label key={option.value}>
              <input name={question.id} type="radio" value={option.value} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div className={styles.genericQuestion}>
      <p>{question.label}</p>
      <span>Resposta em estruturação</span>
    </div>
  );
}
