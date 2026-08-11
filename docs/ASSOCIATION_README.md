# Associação de ausências e migração

Este PR adiciona suporte para associar ausências a alunos não-cadastrados e mantém um cache dos dados do aluno ao registrar uma ausência.

Passos para aplicar a migração no Supabase:

1. Acesse o console do Supabase do projeto usado pela aplicação.
2. Abra a seção SQL.
3. Rode o arquivo `migrations/20260811_add_cached_fields.sql` (cole o SQL e execute).

Comandos SQL contidos no arquivo:

ALTER TABLE student_absences
  ADD COLUMN IF NOT EXISTS cached_full_name text,
  ADD COLUMN IF NOT EXISTS cached_enrollment_id text,
  ADD COLUMN IF NOT EXISTS cached_grade text;

O que foi modificado no front-end:
- `src/pages/AbsencesReportPage.tsx`:
  - Ao inserir uma ausência, agora salvamos `cached_full_name`, `cached_enrollment_id` e `cached_grade`.
  - A lista exibe claramente quando uma ausência não tem aluno associado e permite abrir um modal para associar ou cadastrar.
- `src/components/students/StudentAssociateModal.tsx`:
  - Modal para pesquisar alunos, associar um existente ou criar um novo e associar.

Testes sugeridos:
- Rode a aplicação localmente e verifique a tela de Gestão de Faltas.
- Crie uma ausência normalmente e verifique se os campos cached_* estão populados na tabela `student_absences`.
- Encontre uma ausência que não tenha aluno (`student_id` nulo) e use o modal para associar um aluno existente.

Se quiser, eu abro um Pull Request com essas mudanças e adiciono screenshots e descrição passo-a-passo. Também posso criar um script para backfill (caso queira popular cached_* para ausências existentes a partir da tabela students).
