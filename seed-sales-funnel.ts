
import "dotenv/config";
import { db, pool } from "./server/db";
import { colunas_funil_vendas } from "./shared/schema";

async function seed() {
    try {
        const existing = await db.select().from(colunas_funil_vendas);
        if (existing.length > 0) {
            console.log("Sales funnel columns already exist. Skipping seed.");
            return;
        }

        console.log("Seeding default sales funnel columns...");
        const defaultColumns = [
            { nome: "Envio de Proposta", ordem: 0, cor: "#3b82f6" },
            { nome: "Contrato Fechado", ordem: 1, cor: "#10b981" },
            { nome: "Contrato Recusado", ordem: 2, cor: "#f59e0b" },
            { nome: "Cancelamento", ordem: 3, cor: "#ef4444" },
        ];

        await db.insert(colunas_funil_vendas).values(defaultColumns);
        console.log("Seeded 4 default columns.");

    } catch (e) {
        console.error("Error seeding sales funnel:", e);
    } finally {
        await pool.end();
    }
}

seed();
