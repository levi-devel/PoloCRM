
import 'dotenv/config';
import { db } from "./server/db";
import { modelos_formularios, campos_formularios } from "./shared/schema";
import { inArray } from "drizzle-orm";

async function main() {
    try {
        console.log("Finding templates to delete...");

        // Get the IDs of the templates we want to delete
        const templatesToDelete = await db.select({ id: modelos_formularios.id })
            .from(modelos_formularios)
            .where(inArray(modelos_formularios.nome, [
                "Formulário Padrão",
                "Formulário de Contratos",
                "Padrão Projetos"
            ]));

        const templateIds = templatesToDelete.map(t => t.id);
        console.log(`Found ${templateIds.length} templates. IDs:`, templateIds);

        if (templateIds.length > 0) {
            console.log("Deleting associated fields...");
            await db.delete(campos_formularios)
                .where(inArray(campos_formularios.id_modelo, templateIds));

            console.log("Fields deleted. Now deleting templates...");

            await db.delete(modelos_formularios)
                .where(inArray(modelos_formularios.id, templateIds));

            console.log("Templates deleted successfully.");
        } else {
            console.log("No templates found to delete.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error deleting templates:", error);
        process.exit(1);
    }
}

main();
