-- ============================================================================
-- SISTEMA CRM POLO - CRIAÇÃO DO BANCO DE DADOS MYSQL
-- ============================================================================
-- Todas as tabelas e colunas em Português
-- Total de 16 tabelas
-- Charset: utf8mb4_unicode_ci
-- ============================================================================

-- ============================================================================
-- 1. CRIAÇÃO DO BANCO DE DADOS
-- ============================================================================
CREATE DATABASE IF NOT EXISTS crm_polo
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE crm_polo;

-- ============================================================================
-- 2. TABELAS DE AUTENTICAÇÃO
-- ============================================================================

-- Tabela: sessoes
CREATE TABLE sessoes (
    sid VARCHAR(255) NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL,
    PRIMARY KEY (sid),
    INDEX idx_sessoes_expire (expire)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Armazena sessões de usuários autenticados';

-- Tabela: usuarios
CREATE TABLE usuarios (
    id VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    primeiro_nome VARCHAR(255),
    ultimo_nome VARCHAR(255),
    senha VARCHAR(255) COMMENT 'Senha criptografada com bcrypt',
    url_imagem_perfil VARCHAR(500),
    role TEXT NOT NULL DEFAULT 'Técnico' COMMENT 'Possíveis valores: Admin, Gerente Comercial, Gerente Supervisor, Técnico',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Usuários do sistema com autenticação';

-- ============================================================================
-- 3. TABELAS DE CLIENTES
-- ============================================================================

-- Tabela: clientes
CREATE TABLE clientes (
    id INT AUTO_INCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT,
    contato TEXT,
    telefone TEXT,
    email TEXT,
    observacoes TEXT,
    descricao TEXT,
    produtos_contratados JSON COMMENT 'Array de produtos contratados',
    automacoes_contratadas JSON COMMENT 'Array de automações contratadas',
    limite_usuarios INT COMMENT 'Limite de usuários no contrato',
    limite_agentes INT COMMENT 'Limite de agentes no contrato',
    limite_supervisores INT COMMENT 'Limite de supervisores no contrato',
    data_inicio_contrato DATE,
    url_acesso TEXT COMMENT 'URL de acesso ao sistema do cliente',
    api_utilizada TEXT COMMENT 'API utilizada',
    credenciais TEXT COMMENT 'Credenciais de acesso (campo sensível)',
    escopo_definido TEXT COMMENT 'Escopo do projeto',
    fora_escopo TEXT COMMENT 'O que está fora do escopo',
    gestores_internos JSON COMMENT 'Array de IDs dos gestores internos',
    base_conhecimento TEXT COMMENT 'Base de conhecimento geral',
    caminho_especificacao_tecnica TEXT COMMENT 'Caminho para especificações técnicas',
    riscos TEXT COMMENT 'Riscos e pontos de atenção',
    pendencias_atuais TEXT COMMENT 'Pendências atuais',
    incidentes_relevantes TEXT COMMENT 'Resumo de incidentes importantes',
    decisoes_tecnicas TEXT COMMENT 'Decisões técnicas importantes',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Informações completas dos clientes';

-- Tabela: documentos_clientes
CREATE TABLE documentos_clientes (
    id INT AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    tipo TEXT NOT NULL COMMENT 'Senha, URL, Acesso, Observação',
    titulo TEXT NOT NULL,
    url TEXT,
    login TEXT,
    senha TEXT COMMENT 'Campo sensível',
    observacoes TEXT,
    visibilidade TEXT DEFAULT 'Admin' COMMENT 'Admin, Gestor, Atribuídos',
    usuarios_permitidos JSON COMMENT 'Array de IDs de usuários com permissão',
    anexos JSON COMMENT 'Array de caminhos de arquivos anexados',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id) ON DELETE CASCADE,
    INDEX idx_documentos_cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Documentos e informações sensíveis dos clientes';

-- ============================================================================
-- 4. TABELAS DE FORMULÁRIOS
-- ============================================================================

-- Tabela: modelos_formularios
CREATE TABLE modelos_formularios (
    id INT AUTO_INCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por VARCHAR(255),
    versao TEXT DEFAULT '1.0',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Templates de formulários personalizados';

-- Tabela: campos_formularios
CREATE TABLE campos_formularios (
    id INT AUTO_INCREMENT,
    id_modelo INT NOT NULL,
    ordem INT NOT NULL,
    rotulo TEXT NOT NULL,
    tipo TEXT NOT NULL COMMENT 'text, long_text, number, date, list, checkbox, file',
    obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
    opcoes JSON COMMENT 'Opções para campos tipo lista',
    placeholder TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (id_modelo) REFERENCES modelos_formularios(id) ON DELETE CASCADE,
    INDEX idx_campos_modelo (id_modelo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Campos dos modelos de formulários';

-- ============================================================================
-- 5. TABELAS DE PROJETOS
-- ============================================================================

-- Tabela: projetos
CREATE TABLE projetos (
    id INT AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' COMMENT 'Ativo, Concluído, Pausado, Cancelado',
    id_lider_tecnico VARCHAR(255) NOT NULL,
    equipe JSON COMMENT 'Array de IDs dos membros da equipe',
    data_inicio TIMESTAMP,
    data_prazo TIMESTAMP COMMENT 'Data limite/prazo',
    data_conclusao TIMESTAMP,
    prioridade TEXT DEFAULT 'Média' COMMENT 'Baixa, Média, Alta',
    id_modelo_padrao INT NOT NULL COMMENT 'ID do formulário padrão do projeto',
    alerta_atraso_ativo BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_lider_tecnico) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_modelo_padrao) REFERENCES modelos_formularios(id) ON DELETE RESTRICT,
    INDEX idx_projetos_cliente (id_cliente),
    INDEX idx_projetos_lider (id_lider_tecnico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Projetos gerenciados no sistema';

-- Tabela: colunas_projetos
CREATE TABLE colunas_projetos (
    id INT AUTO_INCREMENT,
    id_projeto INT NOT NULL,
    nome TEXT NOT NULL,
    ordem INT NOT NULL,
    cor TEXT DEFAULT '#6b7280',
    status TEXT NOT NULL DEFAULT 'Em aberto' COMMENT 'Em aberto, Pausado, Concluído',
    PRIMARY KEY (id),
    FOREIGN KEY (id_projeto) REFERENCES projetos(id) ON DELETE CASCADE,
    INDEX idx_colunas_projeto (id_projeto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Colunas do quadro Kanban dos projetos';

-- Tabela: cartoes
CREATE TABLE cartoes (
    id INT AUTO_INCREMENT,
    id_projeto INT NOT NULL,
    id_coluna INT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    id_tecnico_atribuido VARCHAR(255),
    prioridade TEXT DEFAULT 'Média' COMMENT 'Baixa, Média, Alta',
    data_inicio TIMESTAMP,
    data_prazo TIMESTAMP,
    data_conclusao TIMESTAMP,
    tags JSON COMMENT 'Array de tags',
    criado_por VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_projeto) REFERENCES projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_coluna) REFERENCES colunas_projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_tecnico_atribuido) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_cartoes_projeto (id_projeto),
    INDEX idx_cartoes_coluna (id_coluna),
    INDEX idx_cartoes_tecnico (id_tecnico_atribuido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cards/tarefas dos projetos no quadro Kanban';

-- Tabela: respostas_formularios_cartoes
CREATE TABLE respostas_formularios_cartoes (
    id INT AUTO_INCREMENT,
    id_cartao INT NOT NULL,
    id_modelo INT NOT NULL,
    status TEXT DEFAULT 'Não iniciado' COMMENT 'Não iniciado, Em preenchimento, Completo',
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cartao) REFERENCES cartoes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_modelo) REFERENCES modelos_formularios(id) ON DELETE CASCADE,
    INDEX idx_respostas_cartao (id_cartao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Respostas de formulários vinculados aos cards';

-- Tabela: respostas_campos_formularios
CREATE TABLE respostas_campos_formularios (
    id INT AUTO_INCREMENT,
    id_resposta INT NOT NULL,
    id_campo INT NOT NULL,
    valor_texto TEXT,
    valor_numero INT,
    valor_data TIMESTAMP,
    valor_booleano BOOLEAN,
    valor_lista TEXT,
    anexos JSON COMMENT 'Array de arquivos anexados',
    PRIMARY KEY (id),
    FOREIGN KEY (id_resposta) REFERENCES respostas_formularios_cartoes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_campo) REFERENCES campos_formularios(id) ON DELETE CASCADE,
    INDEX idx_respostas_campo (id_resposta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Respostas individuais dos campos de formulários';

-- Tabela: alertas
CREATE TABLE alertas (
    id INT AUTO_INCREMENT,
    tipo TEXT NOT NULL COMMENT 'Tipo de alerta',
    id_projeto INT NOT NULL,
    id_cartao INT,
    mensagem TEXT NOT NULL,
    severidade TEXT DEFAULT 'Info' COMMENT 'Info, Aviso, Crítico',
    resolvido BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolvido_em TIMESTAMP,
    destinatarios JSON COMMENT 'Array de IDs de usuários destinatários',
    PRIMARY KEY (id),
    FOREIGN KEY (id_projeto) REFERENCES projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_cartao) REFERENCES cartoes(id) ON DELETE CASCADE,
    INDEX idx_alertas_projeto (id_projeto),
    INDEX idx_alertas_resolvido (resolvido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Alertas e notificações do sistema';

-- ============================================================================
-- 6. TABELAS DE POLO PROJETOS
-- ============================================================================

-- Tabela: polo_projetos
CREATE TABLE polo_projetos (
    id INT AUTO_INCREMENT,
    id_cartao INT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' COMMENT 'Ativo, Concluído, Pausado, Cancelado',
    progresso_geral INT DEFAULT 0 COMMENT 'Percentual de 0 a 100',
    criado_por VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cartao) REFERENCES cartoes(id) ON DELETE CASCADE,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_polo_projetos_cartao (id_cartao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Projetos Polo com gestão de etapas e Gantt';

-- Tabela: etapas_polo_projetos
CREATE TABLE etapas_polo_projetos (
    id INT AUTO_INCREMENT,
    id_polo_projeto INT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ordem INT NOT NULL,
    nivel INT NOT NULL DEFAULT 1 COMMENT '1 = Etapa Principal, 2 = Sub-Etapa',
    id_etapa_pai INT COMMENT 'Referência à etapa principal (apenas para nível 2)',
    cor TEXT DEFAULT '#3b82f6',
    concluida BOOLEAN DEFAULT FALSE,
    id_tecnico_atribuido VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_polo_projeto) REFERENCES polo_projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_etapa_pai) REFERENCES etapas_polo_projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_tecnico_atribuido) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_etapas_polo_projeto (id_polo_projeto),
    INDEX idx_etapas_pai (id_etapa_pai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etapas dos projetos Polo com hierarquia (principais e sub-etapas)';

-- ============================================================================
-- 7. TABELAS DE FUNIL DE VENDAS
-- ============================================================================

-- Tabela: colunas_funil_vendas
CREATE TABLE colunas_funil_vendas (
    id INT AUTO_INCREMENT,
    nome TEXT NOT NULL,
    ordem INT NOT NULL,
    cor TEXT DEFAULT '#3b82f6',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Colunas do funil de vendas (estágios da venda)';

-- Tabela: cartoes_funil_vendas
CREATE TABLE cartoes_funil_vendas (
    id INT AUTO_INCREMENT,
    id_coluna INT NOT NULL,
    nome_cliente TEXT NOT NULL,
    cnpj TEXT,
    nome_contato TEXT,
    telefone TEXT,
    numero_proposta TEXT,
    data_envio DATE,
    valor INT COMMENT 'Valor em centavos',
    observacoes TEXT,
    criado_por VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_coluna) REFERENCES colunas_funil_vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_cartoes_funil_coluna (id_coluna)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Oportunidades de vendas no funil comercial';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
SELECT 
    '✓ Banco de dados criado com sucesso!' as STATUS,
    COUNT(*) as TOTAL_TABELAS
FROM 
    INFORMATION_SCHEMA.TABLES
WHERE 
    TABLE_SCHEMA = 'crm_polo';

-- Listar todas as tabelas criadas
SELECT 
    TABLE_NAME as TABELA,
    TABLE_COMMENT as DESCRIÇÃO
FROM 
    INFORMATION_SCHEMA.TABLES
WHERE 
    TABLE_SCHEMA = 'crm_polo'
ORDER BY 
    TABLE_NAME;
