# Conjunto de Processos de Teste Sintéticos

Conjunto de **14 processos fictícios** (peças inaugurais realistas) criado para **validar a ferramenta de IA** que analisa processos e gera defesa prévia (`/defesaprevia`).

> ⚠️ **Todos os dados são FICTÍCIOS.** Nomes, CPFs, CNPJs, endereços e números de processo (CNJ) foram inventados. Nenhum dado real de pessoa física ou jurídica foi utilizado (conformidade com a LGPD). CPFs/CNPJs usam sequências óbvias (000..., 111..., etc.) para deixar claro que são fictícios.

## Estrutura da pasta

Para cada uma das 14 categorias há **dois arquivos**:

| Arquivo | Conteúdo |
|---|---|
| `NN-<categoria>.txt` | O **texto do processo** (denúncia do MP nos criminais; petição inicial nos cíveis). É o INPUT que se cola/enviar na ferramenta. |
| `NN-<categoria>.gabarito.md` | O **GABARITO** — categoria esperada, parte defendida, e a lista de nulidades/preliminares/teses (com artigo de lei e súmula/precedente) que uma análise CORRETA deve apontar. É o que se usa para conferir o acerto da IA. |

Numeração: **01–08 = criminais**, **09–14 = cíveis**.

## Índice dos casos

### Criminais (denúncia do Ministério Público)
| Nº | Categoria | Caso | Nulidade/tese central plantada |
|---|---|---|---|
| 01 | `crim-trafico` | Tráfico (22g maconha) | Busca pessoal por "atitude suspeita" sem fundada suspeita (art. 244 CPP) + ausência de laudo definitivo (art. 50 §1º Lei 11.343) |
| 02 | `crim-furto` | Furto em mercado (R$ 34,50) | Princípio da insignificância (HC 84.412 STF) + reconhecimento fotográfico por foto única (art. 226 CPP / HC 598.886 STJ) |
| 03 | `crim-roubo` | Roubo com arma | Reconhecimento pessoal "show-up" em desacordo com art. 226 CPP (HC 598.886 STJ) + majorante da arma não apreendida |
| 04 | `crim-homicidio` | Homicídio / Júri | Pronúncia lastreada só no inquérito (art. 155 CPP) + prova por "ouvir dizer" → impronúncia (art. 414 CPP) |
| 05 | `crim-estelionato` | Estelionato (golpe do PIX) | Falta de representação — ação penal condicionada (art. 171 §5º CP) → rejeição (art. 395 CPP) |
| 06 | `crim-armas` | Posse de revólver .38 | Busca domiciliar sem mandado e sem consentimento válido (art. 5º XI CF / RE 603.616 STF / HC 598.051 STJ) |
| 07 | `crim-vd` | Violência doméstica | Ameaça = ação condicionada; retratação deve seguir art. 16 Lei 11.340/06; distinção da Súmula 542 STJ |
| 08 | `crim-ctb` | Embriaguez ao volante | Recusa ao etilômetro = nemo tenetur (art. 5º LXIII CF) + ausência de prova objetiva do art. 306 CTB |

### Cíveis (petição inicial)
| Nº | Categoria | Caso | Nulidade/tese central plantada |
|---|---|---|---|
| 09 | `civ-consumidor` | Inscrição indevida (banco) | Negativação preexistente legítima → afasta dano moral (**Súmula 385 STJ**) |
| 10 | `civ-cobranca` | Cobrança de venda de 2019 | **Prescrição** quinquenal (art. 206 §5º I CC) + ausência de título executivo |
| 11 | `civ-familia` | Alimentos + guarda | Percentual excessivo (40%) — binômio necessidade/possibilidade (art. 1.694 §1º CC) + guarda compartilhada (art. 1.584 §2º CC) |
| 12 | `civ-locacao` | Despejo por falta de pagamento | Direito de **purgar a mora** (art. 62, II, Lei 8.245/91) |
| 13 | `civ-execucao` | Execução de CCB | **Impenhorabilidade do bem de família** (Lei 8.009/90 / Súmula 364 STJ) + conta-salário (art. 833 IV CPC) |
| 14 | `civ-danos` | Dano moral (fila/troca) | **Mero aborrecimento** — ausência de dano moral indenizável (jurisprudência STJ) — caso "isca" |

## Como usar para validar a IA

1. **Classificação:** cole o `NN-<categoria>.txt` na ferramenta e verifique se a **categoria detectada** bate com a do gabarito.
2. **Extração:** confira na tela se os campos extraídos batem com o gabarito — **parte defendida**, **parte adversa**, **nº do processo** (nos cíveis o número está em branco → deve aparecer "não informado"), **juízo**, **tipificação/pedido**, **situação prisional** (criminais), **provas** e **datas**.
3. **Teses/nulidades:** compare as **preliminares/nulidades** da defesa gerada com a lista do gabarito. Para cada gabarito, há uma tese CENTRAL (obrigatória) e teses BÔNUS (desejáveis).
4. **Documento Word gerado:** abra o `.docx`/peça exportada e confira se as teses centrais aparecem redigidas com o **artigo de lei** e, quando indicado, a **súmula/precedente** corretos.

## Critério de acerto sugerido

- ✅ **Acerto pleno:** categoria correta + partes corretas + tese CENTRAL do gabarito presente com a fundamentação legal certa.
- 🟡 **Acerto parcial:** categoria e partes corretas, mas faltou a tese central ou a fundamentação (artigo/súmula) veio incompleta.
- ❌ **Erro:** categoria errada, partes trocadas (ex.: defender o autor no lugar do réu nos cíveis), ou "invenção" de nulidades inexistentes (especialmente no caso 14, que é isca).

### Casos de atenção (pegadinhas propositais)
- **07 (VD):** a IA não pode afirmar que a mera retratação na delegacia extingue a punibilidade — precisa do rito do **art. 16 da Lei 11.340/06** (audiência). E deve distinguir da **Súmula 542 STJ** (lesão corporal = incondicionada).
- **09 (consumidor):** a ferramenta gera defesa do **RÉU (banco)** — não pode "advogar para o autor". Tese é a Súmula 385.
- **14 (danos):** a análise correta é **reconhecer que NÃO há dano moral**; a IA não deve fabricar nulidades formais.
- **Cíveis em geral:** o número do processo (CNJ) foi deixado em branco de propósito para testar a robustez da extração.
