-- Migration: Adicionar tabela de pausas para Polo Projetos
-- Data: 2026-01-02
-- Descrição: Criar tabela para rastrear histórico de pausas e retomadas dos projetos Polo

-- Criar tabela de pausas
CREATE TABLE IF NOT EXISTS `pausas_polo_projeto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_polo_projeto` int NOT NULL,
  `motivo` text NOT NULL,
  `data_pausa` date NOT NULL,
  `data_retomada` date DEFAULT NULL,
  `criado_por` varchar(255) NOT NULL,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_polo_projeto` (`id_polo_projeto`),
  KEY `idx_data_pausa` (`data_pausa`),
  CONSTRAINT `fk_pausas_polo_projeto` FOREIGN KEY (`id_polo_projeto`) REFERENCES `polo_projetos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar índices para melhorar performance nas consultas
CREATE INDEX `idx_criado_por` ON `pausas_polo_projeto` (`criado_por`);
CREATE INDEX `idx_data_retomada` ON `pausas_polo_projeto` (`data_retomada`);
