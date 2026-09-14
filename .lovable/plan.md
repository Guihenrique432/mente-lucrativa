# Corrigir valor da simulação financeira

## O que será feito
- Corrigir a leitura de valores digitados com vírgula ou ponto decimal, evitando multiplicações acidentais por 100.
- Validar o limite antes do envio e mostrar uma mensagem clara na própria tela.
- Manter uma validação segura no servidor e verificar a simulação com diferentes formatos monetários.

## Detalhes técnicos
- Centralizar o limite e a conversão monetária na lógica compartilhada da Visão Financeira.
- Aceitar formatos como `4600,00`, `4600.00` e `4.600,00` sem alterar o valor pretendido.
- Evitar que uma falha de validação esperada resulte em tela em branco.
