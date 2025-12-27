# Script para atualizar nomes de propriedades de inglês para português
$content = Get-Content 'server\storage.ts' -Raw

# Substituir propriedades com ponto (acessos a objetos)
$content = $content -replace '\.clientId\b', '.id_cliente'
$content = $content -replace '\.templateId\b', '.id_modelo'
$content = $content -replace '\.projectId\b', '.id_projeto'
$content = $content -replace '\.columnId\b', '.id_coluna'
$content = $content -replace '\.cardId\b', '.id_cartao'
$content = $content -replace '\.responseId\b', '.id_resposta'
$content = $content -replace '\.fieldId\b', '.id_campo'
$content = $content -replace '\.poloProjectId\b', '.id_polo_projeto'
$content = $content -replace '\.parentStageId\b', '.id_etapa_pai'
$content = $content -replace '\.assignedTechId\b', '.id_tecnico_atribuido'
$content = $content -replace '\.defaultTemplateId\b', '.id_modelo_padrao'
$content = $content -replace '\.createdAt\b', '.criado_em'
$content = $content -replace '\.createdBy\b', '.criado_por'
$content = $content -replace '\.updatedAt\b', '.atualizado_em'
$content = $content -replace '\.isActive\b', '.ativo'
$content = $content -replace '\.isCompleted\b', '.concluida'
$content = $content -replace '\.overallProgress\b', '.progresso_geral'
$content = $content -replace '\.order\b', '.ordem'
$content = $content -replace '\.name\b', '.nome'
$content = $content -replace '\.startDate\b', '.data_inicio'
$content = $content -replace '\.dueDate\b', '.data_prazo'
$content = $content -replace '\.completionDate\b', '.data_conclusao'

# Substituir nomes de variáveis e parâmetros
$content = $content -replace '\bstartDate:', 'data_inicio:'
$content = $content -replace '\bdueDate:', 'data_prazo:'
$content = $content -replace '\bcompletionDate:', 'data_conclusao:'
$content = $content -replace '\bassignedTechId:', 'id_tecnico_atribuido:'
$content = $content -replace '\bcreatedBy:', 'criado_por:'
$content = $content -replace '\bcreatedAt:', 'criado_em:'
$content = $content -replace '\bupdatedAt:', 'atualizado_em:'
$content = $content -replace '\bprojectId:', 'id_projeto:'
$content = $content -replace '\bcolumnId:', 'id_coluna:'
$content = $content -replace '\bclientId:', 'id_cliente:'
$content = $content -replace '\bcardId:', 'id_cartao:'
$content = $content -replace '\btemplateId:', 'id_modelo:'
$content = $content -replace '\bresponseId:', 'id_resposta:'
$content = $content -replace '\bfieldId:', 'id_campo:'
$content = $content -replace '\bpoloProjectId:', 'id_polo_projeto:'
$content = $content -replace '\bparentStageId:', 'id_etapa_pai:'
$content = $content -replace '\bdefaultTemplateId:', 'id_modelo_padrao:'
$content = $content -replace '\bisActive:', 'ativo:'
$content = $content -replace '\bisCompleted:', 'concluida:'
$content = $content -replace '\boverallProgress:', 'progresso_geral:'

# Corrigir erro de digitação
$content = $content -replace 'typeof etapas_polo_projetostages', 'typeof etapas_polo_projetos'

Set-Content 'server\storage.ts' $content
Write-Host "Substituições concluídas com sucesso!"
