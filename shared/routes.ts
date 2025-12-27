import { z } from 'zod';
import {
  insertClienteSchema,
  insertDocumentoClienteSchema,
  insertModeloFormularioSchema,
  insertCampoFormularioSchema,
  insertProjetoSchema,
  insertColunaProjetoSchema,
  insertCartaoSchema,
  insertRespostaFormularioCartaoSchema,
  insertRespostaCampoFormularioSchema,
  insertAlertaSchema,
  insertPoloProjetoSchema,
  insertEtapaPoloProjetoSchema,
  insertColunaFunilVendasSchema,
  insertCartaoFunilVendasSchema,
  clientes,
  documentos_clientes,
  modelos_formularios,
  campos_formularios,
  projetos,
  colunas_projetos,
  cartoes,
  respostas_formularios_cartoes,
  respostas_campos_formularios,
  alertas,
  polo_projetos,
  etapas_polo_projetos,
  colunas_funil_vendas,
  cartoes_funil_vendas,
  users
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/users/:id',
      input: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        role: z.string().optional(),
        isActive: z.boolean().optional()
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
  },
  clientes: {
    list: {
      method: 'GET' as const,
      path: '/api/clientes',
      responses: {
        200: z.array(z.custom<typeof clientes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clientes',
      input: insertClienteSchema,
      responses: {
        201: z.custom<typeof clientes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/clientes/:id',
      input: insertClienteSchema.partial(),
      responses: {
        200: z.custom<typeof clientes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/clientes/:id',
      responses: {
        200: z.custom<typeof clientes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  documentos_clientes: {
    list: {
      method: 'GET' as const,
      path: '/api/clientes/:clientId/docs',
      responses: {
        200: z.array(z.custom<typeof documentos_clientes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clientes/:clientId/docs',
      input: insertDocumentoClienteSchema,
      responses: {
        201: z.custom<typeof documentos_clientes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  modelos_formularios: {
    list: {
      method: 'GET' as const,
      path: '/api/form-templates',
      responses: {
        200: z.array(z.custom<typeof modelos_formularios.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/form-templates',
      input: insertModeloFormularioSchema.extend({
        fields: z.array(insertCampoFormularioSchema).optional(),
      }),
      responses: {
        201: z.custom<typeof modelos_formularios.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/form-templates/:id',
      responses: {
        200: z.custom<typeof modelos_formularios.$inferSelect & { fields: typeof campos_formularios.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/form-templates/:id',
      input: insertModeloFormularioSchema.extend({
        fields: z.array(insertCampoFormularioSchema).optional(),
      }),
      responses: {
        200: z.custom<typeof modelos_formularios.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/form-templates/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  projetos: {
    list: {
      method: 'GET' as const,
      path: '/api/projetos',
      responses: {
        200: z.array(z.custom<typeof projetos.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projetos',
      input: insertProjetoSchema,
      responses: {
        201: z.custom<typeof projetos.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projetos/:id',
      responses: {
        200: z.custom<typeof projetos.$inferSelect & { columns: typeof colunas_projetos.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/projetos/:id',
      input: insertProjetoSchema.partial(),
      responses: {
        200: z.custom<typeof projetos.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projetos/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        403: errorSchemas.validation, // For permission denied
      },
    },
  },
  cartoes: {
    list: {
      method: 'GET' as const,
      path: '/api/projetos/:projectId/cartoes',
      responses: {
        200: z.array(z.custom<typeof cartoes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projetos/:projectId/cartoes',
      input: insertCartaoSchema,
      responses: {
        201: z.custom<typeof cartoes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/cartoes/:id',
      input: insertCartaoSchema.partial(),
      responses: {
        200: z.custom<typeof cartoes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    move: {
      method: 'PATCH' as const,
      path: '/api/cartoes/:id/move',
      input: z.object({ columnId: z.number() }),
      responses: {
        200: z.custom<typeof cartoes.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/cartoes/:id',
      responses: {
        200: z.custom<typeof cartoes.$inferSelect & { formResponse?: typeof respostas_formularios_cartoes.$inferSelect, formAnswers?: typeof respostas_campos_formularios.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  cardForms: {
    submit: {
      method: 'POST' as const,
      path: '/api/cartoes/:cardId/form',
      input: z.object({
        status: z.string(),
        answers: z.array(insertRespostaCampoFormularioSchema),
      }),
      responses: {
        200: z.custom<typeof respostas_formularios_cartoes.$inferSelect>(),
      },
    },
  },
  alertas: {
    list: {
      method: 'GET' as const,
      path: '/api/alertas',
      responses: {
        200: z.array(z.custom<typeof alertas.$inferSelect>()),
      },
    },
  },
  polo_projetos: {
    list: {
      method: 'GET' as const,
      path: '/api/polo-projetos',
      responses: {
        200: z.array(z.custom<typeof polo_projetos.$inferSelect & { stages?: typeof etapas_polo_projetos.$inferSelect[] }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/polo-projetos',
      input: insertPoloProjetoSchema.extend({
        stages: z.array(insertEtapaPoloProjetoSchema).optional(),
      }),
      responses: {
        201: z.custom<typeof polo_projetos.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/polo-projetos/:id',
      responses: {
        200: z.custom<typeof polo_projetos.$inferSelect & { stages: typeof etapas_polo_projetos.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/polo-projetos/:id',
      input: insertPoloProjetoSchema.partial(),
      responses: {
        200: z.custom<typeof polo_projetos.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    dashboard: {
      method: 'GET' as const,
      path: '/api/polo-projetos/dashboard',
      responses: {
        200: z.object({
          activeProjects: z.number(),
          upcomingDeadlines: z.array(z.object({
            stageName: z.string(),
            projectName: z.string(),
            endDate: z.string(),
            daysUntil: z.number(),
          })),
          overallProgress: z.number(),
        }),
      },
    },
    gantt: {
      method: 'GET' as const,
      path: '/api/polo-projetos/:id/gantt',
      responses: {
        200: z.object({
          project: z.custom<typeof polo_projetos.$inferSelect>(),
          stages: z.array(z.custom<typeof etapas_polo_projetos.$inferSelect>()),
          timelineStart: z.string(),
          timelineEnd: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  etapas_polo_projetos: {
    create: {
      method: 'POST' as const,
      path: '/api/polo-projetos/:projectId/stages',
      input: insertEtapaPoloProjetoSchema,
      responses: {
        201: z.custom<typeof etapas_polo_projetos.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/polo-projetos/:projectId/stages/:stageId',
      input: insertEtapaPoloProjetoSchema.partial(),
      responses: {
        200: z.custom<typeof etapas_polo_projetos.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/polo-projetos/:projectId/stages/:stageId',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  salesFunnel: {
    columns: {
      list: {
        method: 'GET' as const,
        path: '/api/sales-funnel/columns',
        responses: {
          200: z.array(z.custom<typeof colunas_funil_vendas.$inferSelect>()),
        },
      },
    },
    cartoes: {
      list: {
        method: 'GET' as const,
        path: '/api/sales-funnel/cartoes',
        responses: {
          200: z.array(z.custom<typeof cartoes_funil_vendas.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/sales-funnel/cartoes',
        input: insertCartaoFunilVendasSchema,
        responses: {
          201: z.custom<typeof cartoes_funil_vendas.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: 'PUT' as const,
        path: '/api/sales-funnel/cartoes/:id',
        input: insertCartaoFunilVendasSchema.partial(),
        responses: {
          200: z.custom<typeof cartoes_funil_vendas.$inferSelect>(),
          404: errorSchemas.notFound,
        },
      },
      move: {
        method: 'PATCH' as const,
        path: '/api/sales-funnel/cartoes/:id/move',
        input: z.object({ columnId: z.number() }),
        responses: {
          200: z.custom<typeof cartoes_funil_vendas.$inferSelect>(),
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/sales-funnel/cartoes/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
      get: {
        method: 'GET' as const,
        path: '/api/sales-funnel/cartoes/:id',
        responses: {
          200: z.custom<typeof cartoes_funil_vendas.$inferSelect>(),
          404: errorSchemas.notFound,
        },
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

