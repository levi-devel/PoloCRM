import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Carrega as variáveis de ambiente
dotenv.config();

async function testConnection() {
    console.log("🔍 Testando conexão com o banco MySQL...\n");

    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL não está definida no arquivo .env");
        process.exit(1);
    }

    console.log("📋 URL de conexão encontrada (senha oculta)");
    console.log("   " + process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@") + "\n");

    try {
        // Tenta criar uma conexão
        const connection = await mysql.createConnection(process.env.DATABASE_URL);

        console.log("✅ Conexão estabelecida com sucesso!\n");

        // Testa uma query simples
        const [rows] = await connection.query("SELECT 1 + 1 AS result");
        console.log("✅ Query de teste executada:", rows);

        // Verifica a versão do MySQL
        const [version] = await connection.query("SELECT VERSION() as version");
        console.log("✅ Versão do MySQL:", (version as any)[0].version);

        // Lista os bancos de dados disponíveis
        const [databases] = await connection.query("SHOW DATABASES");
        console.log("\n📊 Bancos de dados disponíveis:");
        (databases as any[]).forEach((db: any) => {
            console.log("   -", db.Database);
        });

        // Verifica qual banco está sendo usado
        const [currentDb] = await connection.query("SELECT DATABASE() as db");
        const dbName = (currentDb as any)[0].db;
        console.log("\n🎯 Banco de dados atual:", dbName || "(nenhum selecionado)");

        // Se houver um banco selecionado, lista as tabelas
        if (dbName) {
            const [tables] = await connection.query("SHOW TABLES");
            console.log("\n📋 Tabelas no banco '" + dbName + "':");
            if ((tables as any[]).length === 0) {
                console.log("   (nenhuma tabela encontrada - banco vazio)");
            } else {
                (tables as any[]).forEach((table: any) => {
                    console.log("   -", Object.values(table)[0]);
                });
            }
        }

        await connection.end();
        console.log("\n✅ Teste concluído com sucesso! A conexão está funcionando perfeitamente.\n");

    } catch (error: any) {
        console.error("\n❌ Erro ao conectar ao banco de dados:\n");
        console.error("Tipo:", error.code || "UNKNOWN");
        console.error("Mensagem:", error.message);
        console.error("\n📝 Dicas para resolver:");

        if (error.code === "ECONNREFUSED") {
            console.error("   - Verifique se o servidor MySQL está rodando");
            console.error("   - Confirme o host e a porta (padrão: localhost:3306)");
        } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
            console.error("   - Verifique o usuário e senha no arquivo .env");
            console.error("   - Lembre-se de codificar caracteres especiais na senha");
            console.error("   - Exemplo: $ = %24, # = %23, @ = %40, ! = %21");
        } else if (error.code === "ER_BAD_DB_ERROR") {
            console.error("   - O banco de dados especificado não existe");
            console.error("   - Crie o banco ou remova o nome do banco da URL");
        }

        console.error("\n");
        process.exit(1);
    }
}

testConnection();
