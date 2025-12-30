-- ============================================================================
-- MIGRATION: Add Product, Contract Type, and Contract Signature Date fields
-- to Sales Funnel Cards
-- ============================================================================
-- Created: 2025-12-30
-- Description: Adds three new columns to cartoes_funil_vendas table:
--   - produto: Product name (dropdown selection)
--   - tipo_contrato: Contract type (Novo, UPSELL, CROSSELL)
--   - data_assinatura_contrato: Contract signature date
-- ============================================================================

USE crm_polo;

-- Add new columns to cartoes_funil_vendas table
ALTER TABLE cartoes_funil_vendas
  ADD COLUMN produto TEXT COMMENT 'Produto contratado',
  ADD COLUMN tipo_contrato TEXT COMMENT 'Tipo de contrato: Novo, UPSELL, CROSSELL',
  ADD COLUMN data_assinatura_contrato DATE COMMENT 'Data da assinatura do contrato';

-- Verify columns were added
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'crm_polo'
    AND TABLE_NAME = 'cartoes_funil_vendas'
    AND COLUMN_NAME IN ('produto', 'tipo_contrato', 'data_assinatura_contrato')
ORDER BY 
    ORDINAL_POSITION;
