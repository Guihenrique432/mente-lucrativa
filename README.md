# Lucro Certo App

Crie um aplicativo mobile moderno chamado "Lucro Real" focado em autônomos, lojistas e pequenos empreendedores brasileiros.

Objetivo do aplicativo:

Ajudar o usuário a entender seu lucro real, controlar estoque, acompanhar metas financeiras e receber alertas inteligentes sobre a saúde do negócio.

O aplicativo deve possuir design simples, intuitivo e linguagem humana, evitando termos financeiros complexos.

### Dashboard Principal

Exibir:

* Faturamento do mês

* Despesas do mês

* Lucro do mês

* Meta do mês

* Estoque total

Adicionar um indicador visual de saúde do negócio:

* Verde = Saudável

* Amarelo = Atenção

* Vermelho = Risco

Criar uma área chamada "Radar do Negócio" mostrando automaticamente:

* Alertas financeiros

* Oportunidades de lucro

* Metas em andamento

* Avisos de estoque

Exemplos:

"Seu lucro caiu 12% este mês."

"Seu estoque de Camiseta Básica acaba em 5 dias."

"Você está próximo de atingir sua meta mensal."

"Seu aluguel representa 18% do faturamento." 

"Seu estoque representa 30% do faturamento."

### Tela de Receitas

Permitir cadastro de:

* Vendas

* Serviços

* Receitas extras

Campos:

* Data

* Categoria

* Valor

* Observação

### Tela de Despesas

Permitir cadastro de:

* Aluguel

* Água

* Luz

* Internet

* Funcionários

* Impostos

* Transporte

* Outros

Campos:

* Data

* Categoria

* Valor

* Observação

### Tela de Estoque

Permitir cadastro de produtos:

* Nomes

* Quantidades

* Custo unitários

* Preço de vendas

Calcular automaticamente:

* Margem de lucro

* Lucro unitário

* Valor total em estoque

* Dias estimados para reposição

Gerar alertas automáticos de estoque baixo ou se estiver muito alto.

### Tela de Metas

Permitir que o usuário informe:

"Quanto deseja ganhar por mês."

O sistema deve calcular automaticamente:

* Meta mensal

* Meta semanal

* Meta diária

* Valor necessário para atingir a meta

### Tela de Relatórios

Exibir gráficos simples de:

* Lucro

* Despesas

* Receitas

* Evolução mensal

* Produtos mais lucrativos

### Assistente Financeiro Inteligente

Criar um sistema de diagnósticos automáticos baseado nos dados do usuário.

O sistema deve gerar insights como:

* Seu lucro caiu em relação ao mês anterior.

* Seu maior gasto é estoque.

* Você pode aumentar seu lucro reajustando determinados produtos.

* Seu caixa está saudável.

* Você está abaixo da meta.

As respostas devem ser simples e objetivas.

Estrutura obrigatória:

1. Diagnóstico

2. Problema principal

3. Solução prática

4. Próxima ação recomendada

### Banco de Dados

Criar tabelas:

Usuarios

* id

* nome

* email

* plano

Receitas

* id

* usuario_id

* valor

* categoria

* data

Despesas

* id

* usuario_id

* valor

* categoria

* data

Produtos

* id

* usuario_id

* nome

* quantidade

* custo

* preco_venda

Metas

* id

* usuario_id

* meta_lucro

### Cálculos

Lucro:

Receitas - Despesas

Margem:

(Lucro ÷ Receita) × 100

Meta diária:

Meta mensal ÷ 30

Faturamento necessário:

Meta de lucro + custos fixos + reposição de estoque

### Notificações Inteligentes

Criar sistema de notificações automáticas para:

* Estoque baixo

* Meta próxima de ser atingida

* Meta atrasada

* Lucro em queda

* Gastos acima da média

* Melhor resultado do mês

O usuário deve poder ativar ou desativar cada tipo de notificação.

### Monetização

Plano Gratuito:

* Até 20 produtos

* Controle financeiro básico

Plano Profissional:

* Produtos ilimitados

* IA financeira

* Relatórios

Plano Premium:

* Múltiplas lojas

* Relatórios avançados

* Exportação PDF

* IA ilimitada

### Tecnologias

Frontend:

Flutter

Backend:

Supabase

Autenticação:

Email e Google Login

Aplicativo preparado para Android e iOS.

Crie uma interface moderna, profissional, semelhante aos melhores aplicativos financeiros do mercado, porém extremamente simples para pessoas sem conhecimento financeiro.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mente-lucrativa.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/86d7d361-e355-4945-ab23-49fb62a04293).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
