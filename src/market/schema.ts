export type MarketEntrySourceType =
  | "local_doc"
  | "external_github"
  | "external_tool";

export type MarketCategory = {
  id: string;
  title: string;
  summary: string;
};

export type MarketEntry = {
  id: string;
  title: string;
  summary: string;
  sourceType: MarketEntrySourceType;
  sourceUrl: string;
  docPath?: string;
  tags: string[];
};

export type MarketTopLevelIndex = {
  categories: MarketCategory[];
};

export type MarketCategoryIndex = {
  category: MarketCategory;
  entries: MarketEntry[];
};

export function parseTopLevelIndex(value: unknown): MarketTopLevelIndex {
  const record = asRecord(value);
  const categories = asArray(record.categories).map(parseCategory);
  return { categories };
}

export function parseCategoryIndex(value: unknown): MarketCategoryIndex {
  const record = asRecord(value);
  return {
    category: parseCategory(record.category),
    entries: asArray(record.entries).map(parseEntry)
  };
}

function parseCategory(value: unknown): MarketCategory {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    title: asString(record.title),
    summary: typeof record.summary === "string" ? record.summary : ""
  };
}

function parseEntry(value: unknown): MarketEntry {
  const record = asRecord(value);
  const sourceType = asString(record.sourceType) as MarketEntrySourceType;
  if (
    sourceType !== "local_doc" &&
    sourceType !== "external_github" &&
    sourceType !== "external_tool"
  ) {
    throw new Error(`Unsupported market source type: ${sourceType}`);
  }

  return {
    id: asString(record.id),
    title: asString(record.title),
    summary: asString(record.summary),
    sourceType,
    sourceUrl: asString(record.sourceUrl),
    docPath: typeof record.docPath === "string" ? record.docPath : undefined,
    tags: asArray(record.tags).map(asString)
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error("Expected object");
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected array");
  }
  return value;
}

function asString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Expected string");
  }
  return value;
}
