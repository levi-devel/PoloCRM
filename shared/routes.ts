import { z } from 'zod';
import {
  insertClientSchema,
  insertClientDocSchema,
  insertFormTemplateSchema,
  insertFormFieldSchema,
  insertProjectSchema,
  insertProjectColumnSchema,
  insertCardSchema,
  insertCardFormResponseSchema,
  insertCardFormAnswerSchema,
  insertAlertSchema,
  clients,
  clientDocs,
  formTemplates,
  formFields,
  projects,
  projectColumns,
  cards,
  cardFormResponses,
  cardFormAnswers,
  alerts,
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
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients',
      responses: {
        200: z.array(z.custom<typeof clients.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients',
      input: insertClientSchema,
      responses: {
        201: z.custom<typeof clients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/clients/:id',
      input: insertClientSchema.partial(),
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/clients/:id',
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  clientDocs: {
    list: {
      method: 'GET' as const,
      path: '/api/clients/:clientId/docs',
      responses: {
        200: z.array(z.custom<typeof clientDocs.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients/:clientId/docs',
      input: insertClientDocSchema,
      responses: {
        201: z.custom<typeof clientDocs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  formTemplates: {
    list: {
      method: 'GET' as const,
      path: '/api/form-templates',
      responses: {
        200: z.array(z.custom<typeof formTemplates.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/form-templates',
      input: insertFormTemplateSchema.extend({
        fields: z.array(insertFormFieldSchema).optional(),
      }),
      responses: {
        201: z.custom<typeof formTemplates.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/form-templates/:id',
      responses: {
        200: z.custom<typeof formTemplates.$inferSelect & { fields: typeof formFields.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/form-templates/:id',
      input: insertFormTemplateSchema.extend({
        fields: z.array(insertFormFieldSchema).optional(),
      }),
      responses: {
        200: z.custom<typeof formTemplates.$inferSelect>(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
  },
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects',
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: z.custom<typeof projects.$inferSelect & { columns: typeof projectColumns.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/projects/:id',
      input: insertProjectSchema.partial(),
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  cards: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/cards',
      responses: {
        200: z.array(z.custom<typeof cards.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/cards',
      input: insertCardSchema,
      responses: {
        201: z.custom<typeof cards.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/cards/:id',
      input: insertCardSchema.partial(),
      responses: {
        200: z.custom<typeof cards.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    move: {
      method: 'PATCH' as const,
      path: '/api/cards/:id/move',
      input: z.object({ columnId: z.number() }),
      responses: {
        200: z.custom<typeof cards.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/cards/:id',
      responses: {
        200: z.custom<typeof cards.$inferSelect & { formResponse?: typeof cardFormResponses.$inferSelect, formAnswers?: typeof cardFormAnswers.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  cardForms: {
    submit: {
      method: 'POST' as const,
      path: '/api/cards/:cardId/form',
      input: z.object({
        status: z.string(),
        answers: z.array(insertCardFormAnswerSchema),
      }),
      responses: {
        200: z.custom<typeof cardFormResponses.$inferSelect>(),
      },
    },
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts',
      responses: {
        200: z.array(z.custom<typeof alerts.$inferSelect>()),
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
