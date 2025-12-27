# Scripts de Criação do Banco de Dados MySQL - CRM Polo

Este documento contém todos os scripts SQL necessários para criar o banco de dados completo do sistema CRM com **todos os nomes de colunas em português**.

## 📋 Índice

1. [Instruções de Uso](#instruções-de-uso)
2. [Criação do Banco de Dados](#1-criação-do-banco-de-dados)
3. [Tabelas de Autenticação](#2-tabelas-de-autenticação)
4. [Tabelas de Clientes](#3-tabelas-de-clientes)
5. [Tabelas de Formulários](#4-tabelas-de-formulários)
6. [Tabelas de Projetos](#5-tabelas-de-projetos)
7. [Tabelas de Polo Projetos](#6-tabelas-de-polo-projetos)
8. [Tabelas de Funil de Vendas](#7-tabelas-de-funil-de-vendas)
9. [Script Completo](#script-completo-para-copiar-e-colar)
10. [Resumo das Tabelas](#resumo-das-tabelas)

---

## Instruções de Uso

### Passo 1: Conectar ao MySQL
```bash
mysql -u seu_usuario -p
```

### Passo 2: Executar os Scripts
Você pode copiar e colar cada script SQL individualmente na ordem apresentada, ou executar o [Script Completo](#script-completo-para-copiar-e-colar) de uma vez.

### Passo 3: Verificar a Criação
```sql
USE crm_polo;
SHOW TABLES;
```

---

## 1. Criação do Banco de Dados

```sql
-- Criar o banco de dados
CREATE DATABASE IF NOT EXISTS crm_polo
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Selecionar o banco de dados
USE crm_polo;
```

---

## 2. Tabelas de Autenticação

### 2.1. Tabela: `sessoes`
Armazena as sessões dos usuários logados no sistema.

```sql
CREATE TABLE sessoes (
    sid VARCHAR(255) NOT NULL,
    sess JSON NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    PRIMARY KEY (sid),
    INDEX IDX_sessoes_expiracao (expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Armazena sessões de usuários autenticados';
```

**Colunas:**
- `sid`: ID único da sessão
- `sess`: Dados da sessão em formato JSON
- `expira_em`: Data/hora de expiração da sessão

---

### 2.2. Tabela: `usuarios`
Armazena informações dos usuários do sistema.

```sql
CREATE TABLE usuarios (
    id VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    primeiro_nome VARCHAR(255),
    ultimo_nome VARCHAR(255),
    senha VARCHAR(255) COMMENT 'Senha criptografada com bcrypt',
    url_imagem_perfil VARCHAR(500),
    funcao VARCHAR(255) NOT NULL DEFAULT 'Técnico' COMMENT 'Possíveis valores: Admin, Gerente Comercial, Gerente Supervisor, Técnico',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Usuários do sistema com autenticação';
```

**Colunas:**
- `id`: ID único do usuário (UUID)
- `email`: Email do usuário (único)
- `primeiro_nome`: Primeiro nome
- `ultimo_nome`: Último nome
- `senha`: Senha criptografada com bcrypt
- `url_imagem_perfil`: URL da foto de perfil
- `funcao`: Função do usuário (Admin, Gerente Comercial, Gerente Supervisor, Técnico)
- `ativo`: Se o usuário está ativo
- `criado_em`: Data de criação
- `atualizado_em`: Data da última atualização

---

## 3. Tabelas de Clientes

### 3.1. Tabela: `clientes`
Armazena informações completas dos clientes.

```sql
CREATE TABLE clientes (
    id INT AUTO_INCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT,
    contato TEXT,
    telefone TEXT,
    email TEXT,
    observacoes TEXT,
    
    -- Descrição do Cliente
    descricao TEXT,
    
    -- Detalhes do Contrato
    produtos_contratados JSON COMMENT 'Array de produtos contratados',
    automacoes_contratadas JSON COMMENT 'Array de automações contratadas',
    limite_usuarios INT COMMENT 'Limite de usuários no contrato',
    limite_agentes INT COMMENT 'Limite de agentes no contrato',
    limite_supervisores INT COMMENT 'Limite de supervisores no contrato',
    data_inicio_contrato DATE,
    
    -- Informações Técnicas
    url_acesso TEXT COMMENT 'URL de acesso ao sistema do cliente',
    api_utilizada TEXT COMMENT 'API utilizada',
    credenciais TEXT COMMENT 'Credenciais de acesso (campo sensível)',
    escopo_definido TEXT COMMENT 'Escopo do projeto',
    fora_escopo TEXT COMMENT 'O que está fora do escopo',
    gestores_internos JSON COMMENT 'Array de IDs dos gestores internos',
    base_conhecimento TEXT COMMENT 'Base de conhecimento geral',
    caminho_especificacao_tecnica TEXT COMMENT 'Caminho para especificações técnicas',
    
    -- Histórico Rápido e Observações
    riscos TEXT COMMENT 'Riscos e pontos de atenção',
    pendencias_atuais TEXT COMMENT 'Pendências atuais',
    incidentes_relevantes TEXT COMMENT 'Resumo de incidentes importantes',
    decisoes_tecnicas TEXT COMMENT 'Decisões técnicas importantes',
    
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Informações completas dos clientes';
```

---

### 3.2. Tabela: `documentos_clientes`
Armazena documentos e informações sensíveis dos clientes.

```sql
CREATE TABLE documentos_clientes (
    id INT AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    tipo TEXT NOT NULL COMMENT 'Senha, URL, Acesso, Observação',
    titulo TEXT NOT NULL,
    url TEXT,
    login TEXT,
    senha TEXT COMMENT 'Campo sensível',
    observacoes TEXT,
    visibilidade VARCHAR(50) DEFAULT 'Admin' COMMENT 'Admin, Gestor, Atribuídos',
    usuarios_permitidos JSON COMMENT 'Array de IDs de usuários com permissão',
    anexos JSON COMMENT 'Array de caminhos de arquivos anexados',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id) ON DELETE CASCADE,
    INDEX idx_documentos_cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Documentos e informações sensíveis dos clientes';
```

---

## 4. Tabelas de Formulários

### 4.1. Tabela: `modelos_formularios`
Armazena os templates/modelos de formulários.

```sql
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
```

---

### 4.2. Tabela: `campos_formularios`
Armazena os campos de cada modelo de formulário.

```sql
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
```

---

## 5. Tabelas de Projetos

### 5.1. Tabela: `projetos`
Armazena os projetos do sistema.

```sql
CREATE TABLE projetos (
    id INT AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    status VARCHAR(100) NOT NULL DEFAULT 'Ativo' COMMENT 'Ativo, Concluído, Pausado, Cancelado',
    id_lider_tecnico VARCHAR(255) NOT NULL,
    equipe JSON COMMENT 'Array de IDs dos membros da equipe',
    data_inicio TIMESTAMP,
    data_prazo TIMESTAMP COMMENT 'Data limite/prazo',
    data_conclusao TIMESTAMP,
    prioridade VARCHAR(50) DEFAULT 'Média' COMMENT 'Baixa, Média, Alta',
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
```

---

### 5.2. Tabela: `colunas_projetos`
Armazena as colunas do quadro Kanban de cada projeto.

```sql
CREATE TABLE colunas_projetos (
    id INT AUTO_INCREMENT,
    id_projeto INT NOT NULL,
    nome TEXT NOT NULL,
    ordem INT NOT NULL,
    cor VARCHAR(50) DEFAULT '#6b7280',
    status VARCHAR(100) NOT NULL DEFAULT 'Em aberto' COMMENT 'Em aberto, Pausado, Concluído',
    PRIMARY KEY (id),
    FOREIGN KEY (id_projeto) REFERENCES projetos(id) ON DELETE CASCADE,
    INDEX idx_colunas_projeto (id_projeto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Colunas do quadro Kanban dos projetos';
```

---

### 5.3. Tabela: `cartoes`
Armazena os cards/tarefas dos projetos.

```sql
CREATE TABLE cartoes (
    id INT AUTO_INCREMENT,
    id_projeto INT NOT NULL,
    id_coluna INT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    id_tecnico_atribuido VARCHAR(255),
    prioridade VARCHAR(50) DEFAULT 'Média' COMMENT 'Baixa, Média, Alta',
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
```

---

### 5.4. Tabela: `respostas_formularios_cartoes`
Armazena as respostas dos formulários associados aos cards.

```sql
CREATE TABLE respostas_formularios_cartoes (
    id INT AUTO_INCREMENT,
    id_cartao INT NOT NULL,
    id_modelo INT NOT NULL,
    status VARCHAR(100) DEFAULT 'Não iniciado' COMMENT 'Não iniciado, Em preenchimento, Completo',
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cartao) REFERENCES cartoes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_modelo) REFERENCES modelos_formularios(id) ON DELETE CASCADE,
    INDEX idx_respostas_cartao (id_cartao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Respostas de formulários vinculados aos cards';
```

---

### 5.5. Tabela: `respostas_campos_formularios`
Armazena as respostas individuais de cada campo do formulário.

```sql
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
```

---

### 5.6. Tabela: `alertas`
Armazena alertas do sistema relacionados a projetos e cards.

```sql
CREATE TABLE alertas (
    id INT AUTO_INCREMENT,
    tipo TEXT NOT NULL COMMENT 'Tipo de alerta',
    id_projeto INT NOT NULL,
    id_cartao INT,
    mensagem TEXT NOT NULL,
    severidade VARCHAR(50) DEFAULT 'Info' COMMENT 'Info, Aviso, Crítico',
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
```

---

## 6. Tabelas de Polo Project

### 6.1. Tabela: `polo_project`
Armazena os projetos Polo com Gantt.

```sql
CREATE TABLE polo_project (
    id INT AUTO_INCREMENT,
    id_cartao INT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    status VARCHAR(100) NOT NULL DEFAULT 'Ativo' COMMENT 'Ativo, Concluído, Pausado, Cancelado',
    progresso_geral INT DEFAULT 0 COMMENT 'Percentual de 0 a 100',
    criado_por VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cartao) REFERENCES cartoes(id) ON DELETE CASCADE,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_polo_project_cartao (id_cartao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Projetos Polo com gestão de etapas e Gantt';
```

---

### 6.2. Tabela: `etapas_polo_project`
Armazena as etapas dos projetos Polo (com hierarquia).

```sql
CREATE TABLE etapas_polo_project (
    id INT AUTO_INCREMENT,
    id_polo_project INT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ordem INT NOT NULL,
    nivel INT NOT NULL DEFAULT 1 COMMENT '1 = Etapa Principal, 2 = Sub-Etapa',
    id_etapa_pai INT COMMENT 'Referência à etapa principal (apenas para nível 2)',
    cor VARCHAR(50) DEFAULT '#3b82f6',
    concluida BOOLEAN DEFAULT FALSE,
    id_tecnico_atribuido VARCHAR(255),
    descricao_atividade TEXT COMMENT 'Descrição da atividade realizada pelo responsável',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_polo_project) REFERENCES polo_project(id) ON DELETE CASCADE,
    FOREIGN KEY (id_etapa_pai) REFERENCES etapas_polo_project(id) ON DELETE CASCADE,
    FOREIGN KEY (id_tecnico_atribuido) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_etapas_polo_project (id_polo_project),
    INDEX idx_etapas_pai (id_etapa_pai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etapas dos projetos Polo com hierarquia (principais e sub-etapas)';
```

---

## 7. Tabelas de Funil de Vendas

### 7.1. Tabela: `colunas_funil_vendas`
Armazena as colunas do funil de vendas.

```sql
CREATE TABLE colunas_funil_vendas (
    id INT AUTO_INCREMENT,
    nome TEXT NOT NULL,
    ordem INT NOT NULL,
    cor VARCHAR(50) DEFAULT '#3b82f6',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Colunas do funil de vendas (estágios da venda)';
```

---

### 7.2. Tabela: `cartoes_funil_vendas`
Armazena os cards do funil de vendas (oportunidades).

```sql
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
```

---

## Script Completo para Copiar e Colar

```sql
-- ==========================================
-- CRM POLO - SCRIPT COMPLETO DE CRIAÇÃO DO BANCO DE DADOS
-- Todas as colunas em português
-- ==========================================

-- 1. Criar o banco de dados
CREATE DATABASE IF NOT EXISTS crm_polo
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE crm_polo;

-- ==========================================
-- 2. TABELAS DE AUTENTICAÇÃO
-- ==========================================

-- 2.1. Tabela: sessoes
CREATE TABLE sessoes (
    sid VARCHAR(255) NOT NULL,
    sess JSON NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    PRIMARY KEY (sid),
    INDEX IDX_sessoes_expiracao (expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Armazena sessões de usuários autenticados';

-- 2.2. Tabela: usuarios
CREATE TABLE usuarios (
    id VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    primeiro_nome VARCHAR(255),
    ultimo_nome VARCHAR(255),
    senha VARCHAR(255) COMMENT 'Senha criptografada com bcrypt',
    url_imagem_perfil VARCHAR(500),
    funcao VARCHAR(255) NOT NULL DEFAULT 'Técnico' COMMENT 'Possíveis valores: Admin, Gerente Comercial, Gerente Supervisor, Técnico',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Usuários do sistema com autenticação';

-- ==========================================
-- 3. TABELAS DE CLIENTES
-- ==========================================

-- 3.1. Tabela: clientes
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

-- 3.2. Tabela: documentos_clientes
CREATE TABLE documentos_clientes (
    id INT AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    tipo TEXT NOT NULL COMMENT 'Senha, URL, Acesso, Observação',
    titulo TEXT NOT NULL,
    url TEXT,
    login TEXT,
    senha TEXT COMMENT 'Campo sensível',
    observacoes TEXT,
    visibilidade VARCHAR(50) DEFAULT 'Admin' COMMENT 'Admin, Gestor, Atribuídos',
    usuarios_permitidos JSON COMMENT 'Array de IDs de usuários com permissão',
    anexos JSON COMMENT 'Array de caminhos de arquivos anexados',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id) ON DELETE CASCADE,
    INDEX idx_documentos_cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Documentos e informações sensíveis dos clientes';

-- ==========================================
-- 4. TABELAS DE FORMULÁRIOS
-- ==========================================

-- 4.1. Tabela: modelos_formularios
CREATE TABLE modelos_formularios (
    id INT AUTO_INCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por VARCHAR(255),
    versao VARCHAR(50) DEFAULT '1.0',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Templates de formulários personalizados';

-- 4.2. Tabela: campos_formularios
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

-- ==========================================
-- 5. TABELAS DE PROJETOS
-- ==========================================

-- 5.1. Tabela: projetos
CREATE TABLE projetos (
    id INT AUTO_INCREMENT,
    id_cliente INT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    status VARCHAR(100) NOT NULL DEFAULT 'Ativo' COMMENT 'Ativo, Concluído, Pausado, Cancelado',
    id_lider_tecnico VARCHAR(255) NOT NULL,
    equipe JSON COMMENT 'Array de IDs dos membros da equipe',
    data_inicio TIMESTAMP,
    data_prazo TIMESTAMP COMMENT 'Data limite/prazo',
    data_conclusao TIMESTAMP,
    prioridade VARCHAR(50) DEFAULT 'Média' COMMENT 'Baixa, Média, Alta',
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

-- 5.2. Tabela: colunas_projetos
CREATE TABLE colunas_projetos (
    id INT AUTO_INCREMENT,
    id_projeto INT NOT NULL,
    nome TEXT NOT NULL,
    ordem INT NOT NULL,
    cor VARCHAR(50) DEFAULT '#6b7280',
    status VARCHAR(100) NOT NULL DEFAULT 'Em aberto' COMMENT 'Em aberto, Pausado, Concluído',
    PRIMARY KEY (id),
    FOREIGN KEY (id_projeto) REFERENCES projetos(id) ON DELETE CASCADE,
    INDEX idx_colunas_projeto (id_projeto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Colunas do quadro Kanban dos projetos';

-- 5.3. Tabela: cartoes
CREATE TABLE cartoes (
    id INT AUTO_INCREMENT,
    id_projeto INT NOT NULL,
    id_coluna INT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    id_tecnico_atribuido VARCHAR(255),
    prioridade VARCHAR(50) DEFAULT 'Média' COMMENT 'Baixa, Média, Alta',
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

-- 5.4. Tabela: respostas_formularios_cartoes
CREATE TABLE respostas_formularios_cartoes (
    id INT AUTO_INCREMENT,
    id_cartao INT NOT NULL,
    id_modelo INT NOT NULL,
    status VARCHAR(100) DEFAULT 'Não iniciado' COMMENT 'Não iniciado, Em preenchimento, Completo',
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cartao) REFERENCES cartoes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_modelo) REFERENCES modelos_formularios(id) ON DELETE CASCADE,
    INDEX idx_respostas_cartao (id_cartao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Respostas de formulários vinculados aos cards';

-- 5.5. Tabela: respostas_campos_formularios
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

-- 5.6. Tabela: alertas
CREATE TABLE alertas (
    id INT AUTO_INCREMENT,
    tipo TEXT NOT NULL COMMENT 'Tipo de alerta',
    id_projeto INT NOT NULL,
    id_cartao INT,
    mensagem TEXT NOT NULL,
    severidade VARCHAR(50) DEFAULT 'Info' COMMENT 'Info, Aviso, Crítico',
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

-- ==========================================
-- 6. TABELAS DE POLO PROJETOS
-- ==========================================

-- 6.1. Tabela: polo_projetos
CREATE TABLE polo_projetos (
    id INT AUTO_INCREMENT,
    id_cartao INT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    status VARCHAR(100) NOT NULL DEFAULT 'Ativo' COMMENT 'Ativo, Concluído, Pausado, Cancelado',
    progresso_geral INT DEFAULT 0 COMMENT 'Percentual de 0 a 100',
    criado_por VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_cartao) REFERENCES cartoes(id) ON DELETE CASCADE,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_polo_projetos_cartao (id_cartao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Projetos Polo com gestão de etapas e Gantt';

-- 6.2. Tabela: etapas_polo_projetos
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
    cor VARCHAR(50) DEFAULT '#3b82f6',
    concluida BOOLEAN DEFAULT FALSE,
    id_tecnico_atribuido VARCHAR(255),
    descricao_atividade TEXT COMMENT 'Descrição da atividade realizada pelo responsável',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (id_polo_projeto) REFERENCES polo_projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_etapa_pai) REFERENCES etapas_polo_projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_tecnico_atribuido) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_etapas_polo_projeto (id_polo_projeto),
    INDEX idx_etapas_pai (id_etapa_pai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etapas dos projetos Polo com hierarquia (principais e sub-etapas)';

-- ==========================================
-- 7. TABELAS DE FUNIL DE VENDAS
-- ==========================================

-- 7.1. Tabela: colunas_funil_vendas
CREATE TABLE colunas_funil_vendas (
    id INT AUTO_INCREMENT,
    nome TEXT NOT NULL,
    ordem INT NOT NULL,
    cor VARCHAR(50) DEFAULT '#3b82f6',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Colunas do funil de vendas (estágios da venda)';

-- 7.2. Tabela: cartoes_funil_vendas
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

-- ==========================================
-- FIM DO SCRIPT
-- ==========================================
```

---

## Resumo das Tabelas

Total de **16 tabelas** criadas com **todos os nomes de colunas em português**:

### Autenticação (2 tabelas)
1. ✅ `sessoes` - Sessões de usuários
2. ✅ `usuarios` - Usuários do sistema

### Clientes (2 tabelas)
3. ✅ `clientes` - Dados completos dos clientes
4. ✅ `documentos_clientes` - Documentos e informações sensíveis

### Formulários (2 tabelas)
5. ✅ `modelos_formularios` - Templates de formulários
6. ✅ `campos_formularios` - Campos dos formulários

### Projetos (6 tabelas)
7. ✅ `projetos` - Projetos principais
8. ✅ `colunas_projetos` - Colunas Kanban
9. ✅ `cartoes` - Cards/tarefas
10. ✅ `respostas_formularios_cartoes` - Respostas de formulários
11. ✅ `respostas_campos_formularios` - Respostas de campos
12. ✅ `alertas` - Alertas do sistema

### Polo Projetos (2 tabelas)
13. ✅ `polo_projetos` - Projetos Polo com Gantt
14. ✅ `etapas_polo_projetos` - Etapas dos projetos Polo

### Funil de Vendas (2 tabelas)
15. ✅ `colunas_funil_vendas` - Colunas do funil
16. ✅ `cartoes_funil_vendas` - Oportunidades de vendas

---


## Verificação Final

Após executar todos os scripts, verifique se todas as tabelas foram criadas:

```sql
USE crm_polo;

SELECT 
    TABLE_NAME as 'Tabela',
    TABLE_COMMENT as 'Descrição'
FROM 
    INFORMATION_SCHEMA.TABLES
WHERE 
    TABLE_SCHEMA = 'crm_polo'
ORDER BY 
    TABLE_NAME;
```

Você deve ver as 16 tabelas listadas acima.

---

## Próximos Passos

1. **Configurar a conexão no .env:**
   ```env
   DATABASE_URL=mysql://seu_usuario:sua_senha@localhost:3306/crm_polo
   ```

2. **Executar o Drizzle para sincronizar (OPCIONAL):**
   Se você preferir usar o Drizzle Kit em vez dos scripts SQL manuais:
   ```bash
   npm run db:push
   ```
   
   > **⚠️ IMPORTANTE:** O Drizzle usará os nomes em inglês definidos no código TypeScript. Os scripts SQL deste documento usam nomes em português. Se você executar `npm run db:push`, as tabelas serão criadas com nomes em inglês, substituindo as que você criou com este script.

3. **Iniciar o servidor:**
   ```bash
   npm run dev
   ```

---

**Documento atualizado em:** 26 de Dezembro de 2024  
**Sistema:** CRM Polo - Gestão de Projetos e Clientes  
**Banco de Dados:** MySQL 8.0+  
**Charset:** utf8mb4_unicode_ci  
**Idioma:** Português (BR) - Todos os nomes de colunas traduzidos
