-- Migration: Add data_inicial and data_final to polo_projetos table
-- Date: 2025-12-30
-- Description: Adds start and end date fields to Polo Projects

-- Add data_inicial column
ALTER TABLE `polo_projetos` 
ADD COLUMN `data_inicial` DATE NULL AFTER `progresso_geral`;

-- Add data_final column
ALTER TABLE `polo_projetos` 
ADD COLUMN `data_final` DATE NULL AFTER `data_inicial`;

-- Add atualizado_em column if it doesn't exist
-- This column is used to track when the project was last updated
ALTER TABLE `polo_projetos` 
ADD COLUMN `atualizado_em` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `criado_em`;
