export type AbsenceType = 'FALTA_JUSTIFICADA' | 'ABONO';
export type RiskLevel = 'Baixa' | 'Média' | 'Alta';

export interface AiSuggestionInput {
  reason?: string;
  type?: AbsenceType;
  authorizedBy?: string;
  studentName?: string;
  recentAbsences?: number;
}

export interface AiSuggestion {
  type: AbsenceType;
  risk: RiskLevel;
  summary: string;
  suggestion: string;
}

const normalizeText = (value?: string) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function buildAiSuggestion(input: AiSuggestionInput): AiSuggestion {
  const reason = input.reason || '';
  const normalized = normalizeText(reason);
  const hasAuthor = !!(input.authorizedBy && input.authorizedBy.trim());

  let type: AbsenceType = input.type || 'FALTA_JUSTIFICADA';
  let risk: RiskLevel = 'Baixa';
  let suggestion = reason.trim();

  if (!normalized) {
    type = input.type || 'FALTA_JUSTIFICADA';
    risk = 'Alta';
    suggestion = 'Motivo não informado. Revise a justificativa antes de confirmar o registro.';
  } else if (
    normalized.includes('atestado') ||
    normalized.includes('medico') ||
    normalized.includes('medica') ||
    normalized.includes('médico') ||
    normalized.includes('odont') ||
    normalized.includes('consulta') ||
    normalized.includes('saude') ||
    normalized.includes('saúde') ||
    normalized.includes('internacao') ||
    normalized.includes('internação')
  ) {
    type = 'ABONO';
    risk = 'Baixa';
    suggestion = suggestion || 'Ausência por motivo de saúde, com documentação apresentada.';
  } else if (
    normalized.includes('viagem') ||
    normalized.includes('festa') ||
    normalized.includes('evento') ||
    normalized.includes('familiar') ||
    normalized.includes('trabalho') ||
    normalized.includes('outros') ||
    normalized.includes('afastamento')
  ) {
    type = 'FALTA_JUSTIFICADA';
    risk = 'Média';
    suggestion = suggestion || 'Ausência por motivo familiar ou de agenda externa, com justificativa apresentada.';
  } else if (
    normalized.includes('sem justificativa') ||
    normalized.includes('nao informado') ||
    normalized.includes('não informado') ||
    normalized.includes('motivo vazio')
  ) {
    type = input.type || 'FALTA_JUSTIFICADA';
    risk = 'Alta';
    suggestion = 'Justificativa incompleta ou ausente. Diligenciar a documentação antes de validar o registro.';
  } else if (input.recentAbsences && input.recentAbsences >= 3) {
    risk = 'Alta';
    suggestion = suggestion || 'Aluno com recorrência recente. Recomenda-se revisão do acompanhamento e comunicação com a família.';
  }

  if (hasAuthor && suggestion && !suggestion.includes('Autorizado por')) {
    suggestion = `[Autorizado por: ${input.authorizedBy!.trim()}] ${suggestion}`.trim();
  }

  const summary =
    type === 'ABONO'
      ? 'Classificação sugerida: abono por condição documental ou de saúde, com justificativa compatível com o registro.'
      : 'Classificação sugerida: falta justificada, com revisão do motivo antes do fechamento do lançamento.';

  return {
    type,
    risk,
    summary,
    suggestion,
  };
}

export function buildStudentAiSummary(input: {
  studentName?: string;
  recentAbsences?: number;
  riskLevel?: RiskLevel;
  termStatus?: string;
  authorizationStatus?: string;
}) {
  const studentName = input.studentName || 'Aluno';
  const recentAbsences = input.recentAbsences || 0;
  const riskLevel = input.riskLevel || 'Baixa';
  const summary = `${studentName} está em risco ${riskLevel.toLowerCase()}, com ${recentAbsences} registros recentes. ${input.termStatus || 'Termo em revisão.'} ${input.authorizationStatus || 'Autorização sem pendência registrada.'}`;

  return summary;
}

export async function fetchAiAssistIfAvailable<T>(endpoint: string, payload: Record<string, unknown>): Promise<T | null> {
  try {
    const baseUrl = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
    if (!baseUrl) return null;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn('AI proxy unavailable, using local assistance rules.', error);
    return null;
  }
}
