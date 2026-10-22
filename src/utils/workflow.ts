import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';

const activeWorkflowStatuses = ['RECEBIDO', 'EM_ANALISE', 'PENDENTE', 'DECISAO'];

export interface WorkflowStaleCandidate {
  status: string;
  priority: string;
  updated_at: string;
}

export const isWorkflowProcessStale = (process: WorkflowStaleCandidate, today = new Date()) => {
  if (!activeWorkflowStatuses.includes(process.status)) return false;

  const updatedAt = parseISO(process.updated_at);
  if (!isValid(updatedAt)) return false;

  const staleAfterDays = process.priority === 'URGENTE' ? 2 : 7;
  return differenceInCalendarDays(today, updatedAt) >= staleAfterDays;
};
