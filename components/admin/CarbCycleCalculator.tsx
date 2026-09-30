"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  calculateCarbCycle,
  type CarbCyclePhase,
} from "@/lib/protocol/carb-cycle";

import styles from "./CarbCycleCalculator.module.css";

function formatGrams(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value) + " g";
}

export function CarbCycleCalculator() {
  const [weightInput, setWeightInput] = useState("60");
  const [phase, setPhase] = useState<CarbCyclePhase>(1);
  const weightKg = Number(weightInput.replace(",", "."));

  const result = useMemo(() => {
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return null;
    }

    return calculateCarbCycle(weightKg, phase);
  }, [phase, weightKg]);

  return (
    <div className={styles.layout}>
      <Card className={styles.formCard}>
        <label className={styles.field}>
          <span>Peso da cliente (kg)</span>
          <input
            inputMode="decimal"
            onChange={(event) => setWeightInput(event.target.value)}
            value={weightInput}
          />
        </label>

        <label className={styles.field}>
          <span>Fase numérica da Planilha Carb Cycle</span>
          <select
            onChange={(event) =>
              setPhase(Number(event.target.value) as CarbCyclePhase)
            }
            value={phase}
          >
            <option value={1}>Fase 1</option>
            <option value={2}>Fase 2</option>
            <option value={3}>Fase 3</option>
            <option value={4}>Fase 4</option>
          </select>
        </label>

        <p className={styles.note}>
          A fase é escolhida explicitamente. O sistema não decide qual Cutting
          deve ser usado e não muda a cliente de fase automaticamente.
        </p>
      </Card>

      <Card className={styles.resultCard}>
        <div className={styles.header}>
          <h3 className={styles.title}>Resultado da planilha</h3>
          <Badge variant="neutral">Fase {phase}</Badge>
        </div>

        {result ? (
          <dl className={styles.results}>
            <div>
              <dt>Proteína</dt>
              <dd>{formatGrams(result.proteinGrams)}</dd>
            </div>
            <div>
              <dt>Linear · coluna Média</dt>
              <dd>{formatGrams(result.carbLinearGrams)}</dd>
            </div>
            <div>
              <dt>Low · dia 1</dt>
              <dd>{formatGrams(result.carbLowDay1Grams)}</dd>
            </div>
            <div>
              <dt>Low · dia 2</dt>
              <dd>{formatGrams(result.carbLowDay2Grams)}</dd>
            </div>
            <div>
              <dt>High · dia 3</dt>
              <dd>{formatGrams(result.carbHighDayGrams)}</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.note}>Informe um peso válido maior que zero.</p>
        )}

        <p className={styles.note}>
          Estes valores são gramas de macronutrientes conforme a planilha. O
          bloco antigo de conversão em porções/doses não é usado porque sua
          semântica ainda não foi confirmada.
        </p>
      </Card>
    </div>
  );
}
