const normalizeQuery = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const getAutomationSearchTarget = (query: string) => {
  const normalized = normalizeQuery(query);

  if (!normalized) return '/dashboard';
  if (/^(todos os )?(alunos|estudantes|cadastro)$/.test(normalized)) return '/students';
  if (/(sigeduc|sincroniz|baixa pendente)/.test(normalized)) {
    return '/absences?aba=historico&filtro=sigeduc-pending';
  }
  if (/(sem justificativa|justificativa pendente|motivo ausente)/.test(normalized)) {
    return '/absences?aba=historico&filtro=sem-justificativa';
  }
  if (/(reincidente|recorrencia|recorrente|faltas repetidas)/.test(normalized)) {
    return '/absences?aba=historico&filtro=reincidentes';
  }
  if (/(processo parado|processos parados|processo atrasado|processos atrasados)/.test(normalized)) {
    return '/workflow?atencao=parados';
  }
  if (/(processo|processos|tramitacao|workflow)/.test(normalized)) {
    return '/workflow';
  }
  if (/(abono|abonos)/.test(normalized) && /(hoje|diario|diarios)/.test(normalized)) {
    return '/absences?aba=historico&filtro=hoje-abonos';
  }
  if (/(falta|faltas|ausencia|ausencias)/.test(normalized) && /(hoje|diario|diarios)/.test(normalized)) {
    return '/absences?aba=historico&filtro=hoje-faltas';
  }
  if (/(ocorrencia|ocorrencias|portaria|carteira)/.test(normalized)) {
    return '/occurrences';
  }
  if (/(termo|termos|devolutiva|documento|documentos)/.test(normalized)) {
    return '/devolutiva';
  }
  if (/(falta|faltas|abono|abonos|ausencia|ausencias)/.test(normalized)) {
    return '/absences';
  }
  if (/(aluno|alunos|estudante|estudantes|matricula|buscar|pesquisar|encontrar)/.test(normalized)) {
    const studentSearch = normalized
      .replace(/\b(alunos?|estudantes?|matricula|rm|buscar|pesquisar|encontrar|por nome|nome|da|do|de|com)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return studentSearch ? `/students?busca=${encodeURIComponent(studentSearch)}` : '/students';
  }

  return `/students?busca=${encodeURIComponent(query.trim())}`;
};
