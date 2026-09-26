# Novo gerenciamento de assinatura

## Objetivo
Criar um fluxo próprio para assinantes gerenciarem a assinatura, com uma etapa de retenção antes de abrir o portal oficial do Stripe, sem alterar contas, planos ou cobranças existentes.

## Alterações
- Adicionar no perfil um link destacado **Manage subscription** para usuários com assinatura ativa ou expirada.
- Criar uma página interna de gerenciamento de assinatura com:
  - resumo do plano atual quando o usuário estiver conectado;
  - benefícios que serão perdidos ao cancelar;
  - ação principal para continuar apoiando e voltar ao catálogo;
  - ação secundária, menos destacada, para continuar até o portal oficial do Stripe;
  - confirmação final antes de abrir `https://billing.stripe.com/p/login/aFaaEY4o4gKC1MXf2xg3600`.
- Manter o portal do Stripe fora do site como destino final para cancelamento, troca de cartão e consulta de cobrança.
- Atualizar o FAQ **How do I cancel?** com um passo a passo claro: Profile → Manage subscription → revisar benefícios → abrir o portal → usar o e-mail da assinatura → cancelar no Stripe.
- Simplificar o modal Support para perguntas e dúvidas sobre assinatura, removendo dele a opção e a tela de retenção de cancelamento.

## Experiência e segurança
- Preservar o estilo escuro/neon atual e garantir boa leitura no celular.
- Não criar, cancelar ou modificar assinaturas diretamente no site; o portal oficial continuará sendo responsável por essas ações.
- Não alterar dados, senhas, permissões ou datas dos assinantes.
- Se a página for aberta sem login, mostrar orientação para entrar antes de consultar o plano, mantendo o acesso ao portal disponível.

## Verificação
- Confirmar no perfil que o novo link abre a página correta.
- Confirmar que a etapa de retenção aparece antes do link externo.
- Confirmar que Support aceita perguntas sem oferecer cancelamento por e-mail.
- Confirmar o novo texto do FAQ e testar o fluxo em desktop e celular.
