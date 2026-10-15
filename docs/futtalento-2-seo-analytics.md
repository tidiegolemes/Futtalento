# FutTalento 2.0 — Guia de conteúdo, SEO/GEO, E-E-A-T e mensuração

## Posicionamento
**Promessa central:** Seu talento merece apoio.
**O que fazemos:** reunir famílias, atletas, escolinhas e patrocinadores em uma proposta de histórico esportivo, patrocínio/permuta responsável e mensuração comercial.
**O que não prometemos:** indexação garantida, destaque em buscadores/IA, contratação por clubes, participação em direitos de transferência, lucro a patrocinadores ou sistemas que ainda não foram lançados.

## Personas e intenção de busca
- **Pais/responsáveis:** custos do futebol de base, como conseguir patrocínio esportivo para filho, registrar conquistas, criar portfólio de atleta menor.
- **Comércio local:** como patrocinar atleta de base, patrocínio por permuta, cupom para patrocinador, medir resultados de patrocínio.
- **Escolinhas:** histórico esportivo de atletas, controle de elenco, registro de campeonatos de base.
- **Profissionais:** currículo esportivo verificável, avaliações com fontes e autorização familiar.

## SEO técnico implementado na nova homepage
- Português brasileiro, title e meta description específicos, 1 H1, hierarquia semântica e FAQ visível.
- Metadados OG e Twitter Card; canonical para https://www.futtalento.com.br/.
- JSON-LD: Organization, WebSite, WebPage e FAQPage, sem dados inventados de prêmios, rankings ou reviews.
- CSS sem fontes externas, responsivo, links acessíveis, navegação por teclado e preferências de movimento reduzido.
- Banner opt-in para métricas; não carregar GTM antes da autorização.
- Ambiente de preview marcado `noindex,nofollow`: **remover antes de mergear em main**.

## Eventos de mensuração (implementados apenas no front-end)
- `futtalento_cta_click`: disparado em cliques de WhatsApp após aceitação de métricas, com `cta_persona`, `cta_position` e `cta_destination`.
- **Pendente no GTM/GA4:** criar trigger para o evento, mapear parâmetros, testar com Tag Assistant/DebugView, definir se clique é microconversão.
- Não chamar clique de lead, conversa iniciada, venda ou patrocinador convertido.
- **Futuro Sponsor Analytics:** validar cupons em PDV/checkout, transação única, faturamento, margem, consentimento e conciliação. Dados da Meta somente com acesso autorizado.
- Não armazenar nomes, imagens, localização detalhada ou IDs de crianças em eventos de marketing.

## E-E-A-T / credibilidade
- Informar empresa operadora, canal oficial de contato e documentos legais revisados.
- Só publicar conquistas de atletas com comprovação, atribuição e aprovação do responsável.
- Diferenciar dados autorrelatados, confirmados por escolinhas e verificados por organizadores.
- Publicar metodologia de cálculo de resultados de patrocínio, critérios de atribuição e prazo de atualização dos relatórios.
- Ter revisão de advogado especializado antes de operações financeiras e campanhas envolvendo menores.

## Critérios de aceite pré-lançamento
1. Teste real em mobile e desktop: contraste, layout, navegação e CTAs.
2. Confirmar links, contato, marca/logotipo, datas e informações da organização.
3. Revisar páginas de privacidade e termos com especialista.
4. Ajustar páginas antigas de checkout, atletas, notícias e planos que contradigam o novo posicionamento.
5. Confirmar canonical e sitemap/robots do domínio efetivo; remover noindex da versão aprovada.
6. Auditar Core Web Vitals e Search Console após publicação.
7. Criar documentação comercial dos patrocinadores, permutas e hipóteses de métricas.

A landing foi implementada em HTML/CSS estáticos. Dashboards são protótipos ilustrativos; autenticação, validação de resultados, pagamentos, automação de cupons e cadastro de atletas não fazem parte desta entrega.
