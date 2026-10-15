# FutTalento — Vitrine de atletas, parceiros e analytics (15/10/2026)

## Perfis públicos apresentados
- Lucas Azambuja — site `lucasazambuja.com.br`, Instagram `@lucasazambujaoficial`; quatro referências públicas no site: `guimaraes.brasil`, `bolos_da_didi`, `barbeariadooze`, `realgauchofutsal`. A última é formação esportiva. Não presumir patrocínio comercial ativo nem contrapartida sem confirmação.
- Ryan Coelho — acervo interno `/atletas/ryan/`, Instagram `@ryanzinho_8`. Nome público confirmado em 15/10/2026 como **Ryan Coelho**; divergências antigas no acervo foram corrigidas. Sem patrocinadores ou números sociais verificados.
- Thalles Silvino — site `thallessilvino.com.br`, Instagram `@thalles_silvino`. Sem patrocinadores ou números sociais verificados.

## Produto futuro: sponsor analytics (não implementado no backend)
1. **Campanha**: ID pseudonimizado, responsável contratual, empresa, tipo de apoio (serviço/produto/financeiro), prazo, valores e contrapartidas.
2. **Entrega**: comprovante de produto ou serviço fornecido, custo pactuado, conteúdo publicitário autorizado, responsável revisor.
3. **Aquisição**: links/QR exclusivos; eventos próprios de origem/visita/clique por campanha sem PII de menor em ferramentas de marketing.
4. **Engajamento**: métricas Meta por período via conta profissional autorizada; distinguir seguidores totais, novos seguidores e crescimento potencialmente associado.
5. **Conversões**: cupons únicos, check-ins/agendamentos confirmados, vendas do PDV/checkout com transaction_id deduplicado, valores e cancelamentos.
6. **Relatório**: funil, data de atualização, grau de verificação por indicador, faturamento atribuído vs. lucro incremental estimado, valor do apoio e taxa de renovação do patrocinador.
7. **Governança**: cadastro e publicação controlados pelos responsáveis, proteção de menores, revisões jurídicas, anonimização, retenção limitada.

## Eventos do frontend implementados (sujeitos à configuração GTM)
- `futtalento_vitrine_click` com `interaction_type` e `interaction_context` em /atletas/, somente se houver consentimento de métricas no navegador.
- Não envia nome do atleta ou outro identificador de menor ao GTM.
- Configurar trigger de Custom Event no GTM e mapear no GA4 antes de classificar cliques como conversões. Evento de clique **não comprova abertura do WhatsApp ou venda**.

## SEO / acessibilidade
- Diretório em HTML estático indexável, único H1, breadcrumb contextual, metadados, canonical e ItemList no JSON-LD.
- Componentes móveis sem bibliotecas pesadas: imagens locais menores, lazy loading, CSS enxuto, links com nomes e alvo acessível, carrossel com botões e rolagem nativa, detalhes progressivos.
- Blog sem buscar posts da API GitHub no navegador. Artigos antigos preservados como acervo.
- Linkage interno de Home → Atletas → Perfil → Notícias → Metodologia/Patrocinadores.
- Não afirmar rankings no Google, retorno em vendas ou dados de Instagram não verificados.

## Itens a aprovar para a operação real
- Autorizações por atleta e por parceria; utilizar sempre Ryan Coelho como nome público.
- Lista contratual de patrocinadores, natureza do apoio e permutas.
- Contas Instagram profissionais e permissões Meta para Insights.
- IDs GA4/GTM corretos, consentimento e sinais de conversão.
- Integração de PDV, cupons validados, orçamento familiar e painel por empresa.
- Teste real de Lighthouse / PageSpeed Insights mobile e desktop (não há medição oficial anexada a esta revisão).
