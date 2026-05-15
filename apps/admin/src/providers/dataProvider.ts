/* eslint-disable @typescript-eslint/no-explicit-any */
import { dataProvider as supabaseDataProvider } from '@refinedev/supabase';
import { supabaseClient } from './supabaseClient';

// ─── snake_case ↔ camelCase helpers ───────────────────────────────────────────

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformKeys(obj: unknown, transform: (key: string) => string): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, transform));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>).reduce(
      (acc, key) => {
        acc[transform(key)] = transformKeys((obj as Record<string, unknown>)[key], transform);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }
  return obj;
}

const snakeToCamel = (obj: unknown) => transformKeys(obj, toCamelCase);
const camelToSnake = (obj: unknown) => transformKeys(obj, toSnakeCase);

function mapSortersToSnake(sorters: unknown): unknown {
  if (!Array.isArray(sorters)) return sorters;
  return sorters.map((sorter) => {
    if (!sorter || typeof sorter !== 'object') return sorter;
    const record = sorter as Record<string, unknown>;
    if (typeof record.field !== 'string') return sorter;
    return { ...record, field: toSnakeCase(record.field) };
  });
}

function mapFiltersToSnake(filters: unknown): unknown {
  if (!Array.isArray(filters)) return filters;
  return filters.map((filter) => {
    if (!filter || typeof filter !== 'object') return filter;
    const record = filter as Record<string, unknown>;
    const mapped: Record<string, unknown> = { ...record };
    if (typeof record.field === 'string') {
      mapped.field = toSnakeCase(record.field);
    }
    if (Array.isArray(record.value)) {
      mapped.value = record.value;
    }
    return mapped;
  });
}

// ─── Wrapped dataProvider ──────────────────────────────────────────────────────

const base = supabaseDataProvider(supabaseClient);

export const dataProvider: typeof base = {
  ...base,

  getList: async (params) => {
    const paramsRecord = params as unknown as Record<string, unknown>;
    const normalizedParams = {
      ...params,
      sorters: mapSortersToSnake(paramsRecord.sorters) as any,
      filters: mapFiltersToSnake(paramsRecord.filters) as any,
    };
    const result = await base.getList(normalizedParams);
    return { ...result, data: snakeToCamel(result.data) as any };
  },

  getMany: base.getMany
    ? async (params) => {
        const result = await base.getMany!(params);
        return { ...result, data: snakeToCamel(result.data) as any };
      }
    : (undefined as any),

  getOne: async (params) => {
    const result = await base.getOne(params);
    return { ...result, data: snakeToCamel(result.data) as any };
  },

  create: async (params) => {
    const snakeVariables = camelToSnake(params.variables);
    const result = await base.create({ ...params, variables: snakeVariables });
    return { ...result, data: snakeToCamel(result.data) as any };
  },

  update: async (params) => {
    const snakeVariables = camelToSnake(params.variables);
    const result = await base.update({ ...params, variables: snakeVariables });
    return { ...result, data: snakeToCamel(result.data) as any };
  },

  deleteOne: async (params) => {
    const result = await base.deleteOne(params);
    return { ...result, data: snakeToCamel(result.data) as any };
  },

  getApiUrl: () => base.getApiUrl(),

  custom: base.custom
    ? async (params) => {
        const result = await base.custom!(params);
        return { ...result, data: snakeToCamel(result.data) as any };
      }
    : (undefined as any),
};
