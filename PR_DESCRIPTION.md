# Pull Request: feat/absences-associate-20260811

Resumo
- Adiciona modal para associar/cadastrar alunos a ausências não vinculadas.
- Adiciona colunas de cache em student_absences (cached_full_name, cached_enrollment_id, cached_grade) e migração.
- Popula cached_* ao criar uma ausência.

Como testar
1. Rode migration no Supabase (arquivo: migrations/20260811_add_cached_fields.sql).
2. Abra a aplicação e acesse Gestão de Faltas.
3. Tente criar uma ausência e associe uma ausência sem aluno via modal.

Observações
- Backfill sugerido: `UPDATE student_absences ...` (arquivo docs/ASSOCIATION_README.md)
