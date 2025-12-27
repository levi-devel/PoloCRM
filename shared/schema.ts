export * from "./models/auth";
import { mysqlTable, text, int, boolean, timestamp, json, date, varchar, foreignKey } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const clientes = mysqlTable("clientes", {
  id: int("id").primaryKey().autoincrement(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  contato: text("contato"),
  telefone: text("telefone"),
  email: text("email"),
  observacoes: text("observacoes"),
  notas_milvus: text("milvus_notes"), // Observação do Milvus

  // Descrição do Cliente
  descricao: text("descricao"),

  // Detalhes do Contrato
  produtos_contratados: json("produtos_contratados").$type<string[]>(),
  automacoes_contratadas: json("automacoes_contratadas").$type<string[]>(),
  limite_usuarios: int("limite_usuarios"),
  limite_agentes: int("limite_agentes"),
  limite_supervisores: int("limite_supervisores"),
  data_inicio_contrato: date("data_inicio_contrato"),

  // Informações Técnicas
  url_acesso: text("url_acesso"),
  api_utilizada: text("api_utilizada"),
  credenciais: text("credenciais"), // Campo sensível
  escopo_definido: text("escopo_definido"),
  fora_escopo: text("fora_escopo"),
  gestores_internos: json("gestores_internos").$type<string[]>(),
  base_conhecimento: text("base_conhecimento"),
  caminho_especificacao_tecnica: text("caminho_especificacao_tecnica"),

  // Histórico Rápido e Observações
  riscos: text("riscos"),
  pendencias_atuais: text("pendencias_atuais"),
  incidentes_relevantes: text("incidentes_relevantes"),
  decisoes_tecnicas: text("decisoes_tecnicas"),

  criado_em: timestamp("criado_em").defaultNow(),
});

export const documentos_clientes = mysqlTable("documentos_clientes", {
  id: int("id").primaryKey().autoincrement(),
  id_cliente: int("id_cliente").references(() => clientes.id).notNull(),
  tipo: text("tipo").notNull(), // Senha, URL, Acesso, Observação
  titulo: text("titulo").notNull(),
  url: text("url"),
  login: text("login"),
  senha: text("senha"), // Sensitive
  observacoes: text("observacoes"),
  visibilidade: varchar("visibilidade", { length: 50 }).default("Admin"), // Admin, Gestor, Atribuídos
  usuarios_permitidos: json("usuarios_permitidos").$type<string[]>(), // Array of user IDs
  anexos: json("anexos").$type<string[]>(),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const modelos_formularios = mysqlTable("modelos_formularios", {
  id: int("id").primaryKey().autoincrement(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  criado_por: varchar("criado_por", { length: 255 }).references(() => users.id),
  versao: varchar("versao", { length: 50 }).default("1.0"),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const campos_formularios = mysqlTable("campos_formularios", {
  id: int("id").primaryKey().autoincrement(),
  id_modelo: int("id_modelo").references(() => modelos_formularios.id).notNull(),
  ordem: int("ordem").notNull(),
  rotulo: text("rotulo").notNull(),
  tipo: text("tipo").notNull(), // text, long_text, number, date, list, checkbox, file
  obrigatorio: boolean("obrigatorio").default(false).notNull(),
  opcoes: json("opcoes").$type<string[]>(), // For lists
  placeholder: text("placeholder"),
});

export const projetos = mysqlTable("projetos", {
  id: int("id").primaryKey().autoincrement(),
  id_cliente: int("id_cliente").references(() => clientes.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  status: varchar("status", { length: 100 }).default("Ativo").notNull(), // Ativo, Concluído, Pausado, Cancelado
  id_lider_tecnico: varchar("id_lider_tecnico", { length: 255 }).references(() => users.id).notNull(),
  equipe: json("equipe").$type<string[]>(), // Array of user IDs
  data_inicio: timestamp("data_inicio"),
  data_prazo: timestamp("data_prazo"), // Prazo
  data_conclusao: timestamp("data_conclusao"),
  prioridade: varchar("prioridade", { length: 50 }).default("Média"), // Baixa, Média, Alta
  id_modelo_padrao: int("id_modelo_padrao").references(() => modelos_formularios.id).notNull(),
  alerta_atraso_ativo: boolean("alerta_atraso_ativo").default(false),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const colunas_projetos = mysqlTable("colunas_projetos", {
  id: int("id").primaryKey().autoincrement(),
  id_projeto: int("id_projeto").references(() => projetos.id).notNull(),
  nome: text("nome").notNull(),
  ordem: int("ordem").notNull(),
  cor: varchar("cor", { length: 50 }).default("#6b7280"), // Default gray
  status: varchar("status", { length: 100 }).default("Em aberto").notNull(), // Em aberto, Pausado, Concluído
});

export const cartoes = mysqlTable("cartoes", {
  id: int("id").primaryKey().autoincrement(),
  id_projeto: int("id_projeto").references(() => projetos.id).notNull(),
  id_coluna: int("id_coluna").references(() => colunas_projetos.id).notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  id_tecnico_atribuido: varchar("id_tecnico_atribuido", { length: 255 }).references(() => users.id),
  prioridade: varchar("prioridade", { length: 50 }).default("Média"),
  data_inicio: timestamp("data_inicio"),
  data_prazo: timestamp("data_prazo"),
  data_conclusao: timestamp("data_conclusao"),
  tags: json("tags").$type<string[]>(),
  criado_por: varchar("criado_por", { length: 255 }).references(() => users.id),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const respostas_formularios_cartoes = mysqlTable("respostas_formularios_cartoes", {
  id: int("id").primaryKey().autoincrement(),
  id_cartao: int("id_cartao").notNull(),
  id_modelo: int("id_modelo").notNull(),
  status: varchar("status", { length: 100 }).default("Não iniciado"), // Não iniciado, Em preenchimento, Completo
  atualizado_em: timestamp("atualizado_em").defaultNow(),
}, (table) => ({
  cartaoFk: foreignKey({
    columns: [table.id_cartao],
    foreignColumns: [cartoes.id],
    name: "resp_form_cartao_fk"
  }).onDelete("cascade"),
  modeloFk: foreignKey({
    columns: [table.id_modelo],
    foreignColumns: [modelos_formularios.id],
    name: "resp_form_modelo_fk"
  }),
}));

export const respostas_campos_formularios = mysqlTable("respostas_campos_formularios", {
  id: int("id").primaryKey().autoincrement(),
  id_resposta: int("id_resposta").notNull(),
  id_campo: int("id_campo").notNull(),
  valor_texto: text("valor_texto"),
  valor_numero: int("valor_numero"),
  valor_data: timestamp("valor_data"),
  valor_booleano: boolean("valor_booleano"),
  valor_lista: text("valor_lista"),
  anexos: json("anexos").$type<string[]>(),
}, (table) => ({
  respostaFk: foreignKey({
    columns: [table.id_resposta],
    foreignColumns: [respostas_formularios_cartoes.id],
    name: "resp_campo_resposta_fk"
  }).onDelete("cascade"),
  campoFk: foreignKey({
    columns: [table.id_campo],
    foreignColumns: [campos_formularios.id],
    name: "resp_campo_campo_fk"
  }).onDelete("cascade"),
}));

export const alertas = mysqlTable("alertas", {
  id: int("id").primaryKey().autoincrement(),
  tipo: text("tipo").notNull(),
  id_projeto: int("id_projeto").references(() => projetos.id).notNull(),
  id_cartao: int("id_cartao").references(() => cartoes.id),
  mensagem: text("mensagem").notNull(),
  severidade: varchar("severidade", { length: 50 }).default("Info"), // Info, Aviso, Crítico
  resolvido: boolean("resolvido").default(false),
  criado_em: timestamp("criado_em").defaultNow(),
  resolvido_em: timestamp("resolvido_em"),
  destinatarios: json("destinatarios").$type<string[]>(), // User IDs
});

// Polo Project Tables
export const polo_projetos = mysqlTable("polo_projetos", {
  id: int("id").primaryKey().autoincrement(),
  id_cartao: int("id_cartao").references(() => cartoes.id).notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  status: varchar("status", { length: 100 }).default("Ativo").notNull(), // Ativo, Concluído, Pausado, Cancelado
  progresso_geral: int("progresso_geral").default(0), // 0-100
  criado_por: varchar("criado_por", { length: 255 }).references(() => users.id),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const etapas_polo_projetos = mysqlTable("etapas_polo_projetos", {
  id: int("id").primaryKey().autoincrement(),
  id_polo_projeto: int("id_polo_projeto").references(() => polo_projetos.id).notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  data_inicio: date("data_inicio").notNull(),
  data_fim: date("data_fim").notNull(),
  ordem: int("ordem").notNull(),
  nivel: int("nivel").notNull().default(1), // 1 = Etapa Principal, 2 = Sub-Etapa
  id_etapa_pai: int("id_etapa_pai"), // Referência à etapa principal (apenas para level 2)
  cor: varchar("cor", { length: 50 }).default("#3b82f6"), // Default blue
  concluida: boolean("concluida").default(false),
  id_tecnico_atribuido: varchar("id_tecnico_atribuido", { length: 255 }).references(() => users.id),
  descricao_atividade: text("descricao_atividade"), // Descrição da atividade realizada
  criado_em: timestamp("criado_em").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projetos: many(projetos, { relationName: "techLead" }),
  cartoes: many(cartoes, { relationName: "assignedTech" }),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  projetos: many(projetos),
  documentos: many(documentos_clientes),
}));

export const documentosClientesRelations = relations(documentos_clientes, ({ one }) => ({
  cliente: one(clientes, {
    fields: [documentos_clientes.id_cliente],
    references: [clientes.id],
  }),
}));

export const projetosRelations = relations(projetos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [projetos.id_cliente],
    references: [clientes.id],
  }),
  lider_tecnico: one(users, {
    fields: [projetos.id_lider_tecnico],
    references: [users.id],
    relationName: "techLead",
  }),
  modelo: one(modelos_formularios, {
    fields: [projetos.id_modelo_padrao],
    references: [modelos_formularios.id],
  }),
  colunas: many(colunas_projetos),
  cartoes: many(cartoes),
  alertas: many(alertas),
}));

export const colunasProjetosRelations = relations(colunas_projetos, ({ one, many }) => ({
  projeto: one(projetos, {
    fields: [colunas_projetos.id_projeto],
    references: [projetos.id],
  }),
  cartoes: many(cartoes),
}));

export const cartoesRelations = relations(cartoes, ({ one, many }) => ({
  projeto: one(projetos, {
    fields: [cartoes.id_projeto],
    references: [projetos.id],
  }),
  coluna: one(colunas_projetos, {
    fields: [cartoes.id_coluna],
    references: [colunas_projetos.id],
  }),
  tecnico_atribuido: one(users, {
    fields: [cartoes.id_tecnico_atribuido],
    references: [users.id],
    relationName: "assignedTech",
  }),
  criado_por_usuario: one(users, {
    fields: [cartoes.criado_por],
    references: [users.id],
  }),
  resposta_formulario: one(respostas_formularios_cartoes),
}));

export const respostasFormulariosCartoesRelations = relations(respostas_formularios_cartoes, ({ one, many }) => ({
  cartao: one(cartoes, {
    fields: [respostas_formularios_cartoes.id_cartao],
    references: [cartoes.id],
  }),
  modelo: one(modelos_formularios, {
    fields: [respostas_formularios_cartoes.id_modelo],
    references: [modelos_formularios.id],
  }),
  respostas: many(respostas_campos_formularios),
}));

export const respostasCamposFormulariosRelations = relations(respostas_campos_formularios, ({ one }) => ({
  resposta: one(respostas_formularios_cartoes, {
    fields: [respostas_campos_formularios.id_resposta],
    references: [respostas_formularios_cartoes.id],
  }),
  campo: one(campos_formularios, {
    fields: [respostas_campos_formularios.id_campo],
    references: [campos_formularios.id],
  }),
}));

export const poloProjetosRelations = relations(polo_projetos, ({ one, many }) => ({
  cartao: one(cartoes, {
    fields: [polo_projetos.id_cartao],
    references: [cartoes.id],
  }),
  criado_por_usuario: one(users, {
    fields: [polo_projetos.criado_por],
    references: [users.id],
  }),
  etapas: many(etapas_polo_projetos),
}));

export const etapasPoloProjetosRelations = relations(etapas_polo_projetos, ({ one, many }) => ({
  polo_projeto: one(polo_projetos, {
    fields: [etapas_polo_projetos.id_polo_projeto],
    references: [polo_projetos.id],
  }),
  tecnico_atribuido: one(users, {
    fields: [etapas_polo_projetos.id_tecnico_atribuido],
    references: [users.id],
  }),
  etapa_pai: one(etapas_polo_projetos, {
    fields: [etapas_polo_projetos.id_etapa_pai],
    references: [etapas_polo_projetos.id],
    relationName: "subEtapas",
  }),
  sub_etapas: many(etapas_polo_projetos, {
    relationName: "subEtapas",
  }),
}));

export const modelosFormulariosRelations = relations(modelos_formularios, ({ many }) => ({
  campos: many(campos_formularios),
}));

export const camposFormulariosRelations = relations(campos_formularios, ({ one }) => ({
  modelo: one(modelos_formularios, {
    fields: [campos_formularios.id_modelo],
    references: [modelos_formularios.id],
  }),
}));

export const insertClienteSchema = createInsertSchema(clientes).omit({ id: true, criado_em: true });
export const insertDocumentoClienteSchema = createInsertSchema(documentos_clientes).omit({ id: true, criado_em: true });
export const insertModeloFormularioSchema = createInsertSchema(modelos_formularios).omit({ id: true, criado_em: true });
export const insertCampoFormularioSchema = createInsertSchema(campos_formularios).omit({ id: true });
export const insertProjetoSchema = createInsertSchema(projetos).omit({ id: true, criado_em: true });
export const insertColunaProjetoSchema = createInsertSchema(colunas_projetos).omit({ id: true });
export const insertCartaoSchema = createInsertSchema(cartoes).omit({ id: true, criado_em: true });
export const insertRespostaFormularioCartaoSchema = createInsertSchema(respostas_formularios_cartoes).omit({ id: true, atualizado_em: true });
export const insertRespostaCampoFormularioSchema = createInsertSchema(respostas_campos_formularios).omit({ id: true });
export const insertAlertaSchema = createInsertSchema(alertas).omit({ id: true, criado_em: true, resolvido_em: true });
export const insertPoloProjetoSchema = createInsertSchema(polo_projetos).omit({ id: true, criado_em: true });
export const insertEtapaPoloProjetoSchema = createInsertSchema(etapas_polo_projetos).omit({ id: true, criado_em: true });

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type DocumentoCliente = typeof documentos_clientes.$inferSelect;
export type InsertDocumentoCliente = z.infer<typeof insertDocumentoClienteSchema>;
export type ModeloFormulario = typeof modelos_formularios.$inferSelect;
export type InsertModeloFormulario = z.infer<typeof insertModeloFormularioSchema>;
export type CampoFormulario = typeof campos_formularios.$inferSelect;
export type InsertCampoFormulario = z.infer<typeof insertCampoFormularioSchema>;
export type Projeto = typeof projetos.$inferSelect;
export type InsertProjeto = z.infer<typeof insertProjetoSchema>;
export type ColunaProjeto = typeof colunas_projetos.$inferSelect;
export type InsertColunaProjeto = z.infer<typeof insertColunaProjetoSchema>;
export type Cartao = typeof cartoes.$inferSelect;
export type InsertCartao = z.infer<typeof insertCartaoSchema>;
export type RespostaFormularioCartao = typeof respostas_formularios_cartoes.$inferSelect;
export type InsertRespostaFormularioCartao = z.infer<typeof insertRespostaFormularioCartaoSchema>;
export type RespostaCampoFormulario = typeof respostas_campos_formularios.$inferSelect;
export type InsertRespostaCampoFormulario = z.infer<typeof insertRespostaCampoFormularioSchema>;
export type Alerta = typeof alertas.$inferSelect;
export type InsertAlerta = z.infer<typeof insertAlertaSchema>;
export type PoloProjeto = typeof polo_projetos.$inferSelect;
export type InsertPoloProjeto = z.infer<typeof insertPoloProjetoSchema>;
export type EtapaPoloProjeto = typeof etapas_polo_projetos.$inferSelect;
export type InsertEtapaPoloProjeto = z.infer<typeof insertEtapaPoloProjetoSchema>;

// Sales Funnel Tables
export const colunas_funil_vendas = mysqlTable("colunas_funil_vendas", {
  id: int("id").primaryKey().autoincrement(),
  nome: text("nome").notNull(),
  ordem: int("ordem").notNull(),
  cor: varchar("cor", { length: 50 }).default("#3b82f6"), // Default blue
});

export const cartoes_funil_vendas = mysqlTable("cartoes_funil_vendas", {
  id: int("id").primaryKey().autoincrement(),
  id_coluna: int("id_coluna").references(() => colunas_funil_vendas.id).notNull(),
  nome_cliente: text("nome_cliente").notNull(),
  cnpj: text("cnpj"),
  nome_contato: text("nome_contato"),
  telefone: text("telefone"),
  numero_proposta: text("numero_proposta"),
  data_envio: date("data_envio"),
  valor: int("valor"), // Valor em centavos
  observacoes: text("observacoes"),
  criado_por: varchar("criado_por", { length: 255 }).references(() => users.id),
  criado_em: timestamp("criado_em").defaultNow(),
});

// Sales Funnel Relations
export const colunasFunilVendasRelations = relations(colunas_funil_vendas, ({ many }) => ({
  cartoes: many(cartoes_funil_vendas),
}));

export const cartoesFunilVendasRelations = relations(cartoes_funil_vendas, ({ one }) => ({
  coluna: one(colunas_funil_vendas, {
    fields: [cartoes_funil_vendas.id_coluna],
    references: [colunas_funil_vendas.id],
  }),
  criado_por_usuario: one(users, {
    fields: [cartoes_funil_vendas.criado_por],
    references: [users.id],
  }),
}));

export const insertColunaFunilVendasSchema = createInsertSchema(colunas_funil_vendas).omit({ id: true });
export const insertCartaoFunilVendasSchema = createInsertSchema(cartoes_funil_vendas).omit({ id: true, criado_em: true });

export type ColunaFunilVendas = typeof colunas_funil_vendas.$inferSelect;
export type InsertColunaFunilVendas = z.infer<typeof insertColunaFunilVendasSchema>;
export type CartaoFunilVendas = typeof cartoes_funil_vendas.$inferSelect;
export type InsertCartaoFunilVendas = z.infer<typeof insertCartaoFunilVendasSchema>;
