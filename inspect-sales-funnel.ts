
import "dotenv/config";
import { db, pool } from "./server/db";
import { colunas_funil_vendas, cartoes_funil_vendas } from "./shared/schema";

async function inspect() {
    try {
        const columns = await db.select().from(colunas_funil_vendas);
        console.log(`\nSales Funnel Columns (${columns.length}):`);
        columns.forEach(c => {
            console.log(`  - [${c.id}] "${c.nome}" (Order: ${c.ordem}, Color: ${c.cor})`);
        });

        const cards = await db.select().from(cartoes_funil_vendas);
        console.log(`\nSales Funnel Cards (${cards.length}):`);
        cards.forEach(c => {
            console.log(`  - [${c.id}] Cliente: "${c.nome_cliente}", ColumnId: ${c.id_coluna}, Value: ${c.valor}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

inspect();
