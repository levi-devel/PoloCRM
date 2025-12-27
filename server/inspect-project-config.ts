
import "dotenv/config";
import { db } from "./db";
import { projetos, colunas_projetos, cartoes, respostas_formularios_cartoes, modelos_formularios, campos_formularios } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from 'fs';

async function inspect() {
    const log = (msg: string) => fs.appendFileSync('inspection_log.txt', msg + '\n');

    // Clear log
    if (fs.existsSync('inspection_log.txt')) fs.unlinkSync('inspection_log.txt');

    log("Inspecting Project Configuration...");

    // 1. Get Project 1
    const project = await db.select().from(projetos).where(eq(projetos.id, 1)).limit(1);
    if (!project[0]) {
        log("Project 1 not found!");
        return;
    }
    log("Project: " + JSON.stringify(project[0], null, 2));

    // 2. Check Default Form Template
    const templateId = project[0].id_modelo_padrao;
    if (!templateId) {
        log("Project has no default form template (id_modelo_padrao is null).");
    } else {
        const template = await db.select().from(modelos_formularios).where(eq(modelos_formularios.id, templateId)).limit(1);
        log("Template: " + JSON.stringify(template[0], null, 2));

        const fields = await db.select().from(campos_formularios).where(eq(campos_formularios.id_modelo, templateId));
        log(`Template has ${fields.length} fields: ` + JSON.stringify(fields, null, 2));
    }

    // 3. Check Cards for Project 1
    const cards = await db.select().from(cartoes).where(eq(cartoes.id_projeto, 1)).limit(5);
    log(`Found ${cards.length} cards.`);

    for (const card of cards) {
        log(`Card ${card.id} (${card.titulo}):`);
        const formResponse = await db.select().from(respostas_formularios_cartoes).where(eq(respostas_formularios_cartoes.id_cartao, card.id)).limit(1);
        if (formResponse[0]) {
            log("  - Form Response found: " + JSON.stringify(formResponse[0], null, 2));
            if (formResponse[0].id_modelo !== templateId) {
                log(`  - CRITICAL: Card template ID (${formResponse[0].id_modelo}) does not match project default (${templateId})`);
            }
        } else {
            log("  - CRITICAL: No Form Response found for this card.");
        }
    }
}

inspect().catch(err => {
    fs.appendFileSync('inspection_log.txt', 'Error: ' + err);
}).finally(() => process.exit());
