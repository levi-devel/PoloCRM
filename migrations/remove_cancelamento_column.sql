-- ============================================================================
-- MIGRATION: Remove "Cancelamento" column from Sales Funnel
-- ============================================================================
-- Created: 2025-12-30
-- Description: Removes the "Cancelamento" column as cancellations will be
--              managed in a separate menu. No cards exist in this column.
-- ============================================================================

USE crm_polo;

-- Disable safe mode temporarily to allow DELETE without WHERE clause using primary key
SET SQL_SAFE_UPDATES = 0;

-- Delete the "Cancelamento" column from the funnel
DELETE FROM colunas_funil_vendas 
WHERE nome = 'Cancelamento';

-- Re-enable safe mode
SET SQL_SAFE_UPDATES = 1;

-- Verify the column was removed
SELECT 
    id,
    nome,
    ordem,
    cor
FROM 
    colunas_funil_vendas
ORDER BY 
    ordem;
