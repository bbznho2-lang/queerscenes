# Remover plano vitalício

## Objetivo
Eliminar o plano vitalício do site e do painel, sem alterar assinaturas mensais, trimestrais ou anuais existentes.

## Alterações
- Remover “Lifetime” das telas de gerenciamento e dos rótulos de assinatura.
- Exigir plano e data de validade ao conceder acesso manualmente; usar mensal como padrão.
- Atualizar as funções administrativas do banco para aceitar somente `monthly`, `quarterly` e `annual` e nunca criar acesso sem validade.
- Remover registros históricos inativos marcados como `lifetime`; a verificação confirmou que não há perfil, cancelamento ou conta excluída com acesso vitalício ativo.
- Manter o webhook de cancelamento removendo o acesso somente quando não houver outra assinatura comum ainda ativa.

## Verificação
- Conferir que não restou opção ou regra de plano vitalício.
- Validar painel, compilação e função de cancelamento.
