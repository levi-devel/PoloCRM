
import "dotenv/config";
import { db, pool } from "./db";
import { projetos, colunas_projetos } from "../shared/schema";
import { eq, asc } from "drizzle-orm";

async function inspect() {
    try {
        const allProjects = await db.select().from(projetos);

        for (const p of allProjects) {
            console.log(`\nProject ${p.id} (${p.nome}) Columns:`);
            const cols = await db
                .select()
                .from(colunas_projetos)
                .where(eq(colunas_projetos.id_projeto, p.id))
                .orderBy(asc(colunas_projetos.ordem));

            if (cols.length === 0) {
                console.log("  No columns found.");
            } else {
                cols.forEach(c => {
                    console.log(`  - [${c.id}] "${c.nome}" (Order: ${c.ordem}, Status: ${c.status})`);
                });
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

inspect();
