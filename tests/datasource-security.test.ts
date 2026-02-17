import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

import { setAppPrismaClientForTesting } from "@/lib/db";
import * as authServer from "@/lib/auth-server";
import { ensureUserAndOrg, findAccessibleDataSource } from "@/lib/userOrg";
import { POST as saveRoute } from "@/app/api/datasources/save/route";
import { DELETE as deleteRoute } from "@/app/api/datasources/[id]/route";

process.env.DATASOURCE_SECRET_KEY = process.env.DATASOURCE_SECRET_KEY || "01234567890123456789012345678901";

const userOne = { uid: "user-1", email: "user1@example.com" };
const userTwo = { uid: "user-2", email: "user2@example.com" };

let mockContext = createMockContext();
let currentAuth = userOne;

describe("data source access control", () => {
  beforeEach(() => {
    mockContext = createMockContext();
    currentAuth = userOne;
    setAppPrismaClientForTesting(mockContext.prisma as any);
    vi.restoreAllMocks();
    vi.spyOn(authServer, "getUserFromRequest").mockImplementation(async () => currentAuth);
  });

  afterEach(() => {
    setAppPrismaClientForTesting(null);
    vi.restoreAllMocks();
  });

  it("prevents a second user from overwriting an existing data source", async () => {
    const baseBody = {
      name: "Primary",
      host: "localhost",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: "secret",
    };

    const firstRes = await saveRoute(makeJsonRequest(baseBody) as any);
    expect(firstRes.status).toBe(200);
    const firstPayload = await firstRes.json();
    expect(firstPayload.id).toBeTruthy();
    expect(firstPayload.orgId).toBeTruthy();

    const storedFirst = mockContext.store.dataSources.get(firstPayload.id);
    expect(storedFirst?.ownerId).toBe(userOne.uid);

    currentAuth = userTwo;
    const secondRes = await saveRoute(makeJsonRequest(baseBody) as any);
    expect(secondRes.status).toBe(200);
    const secondPayload = await secondRes.json();
    expect(secondPayload.id).toBeTruthy();
    expect(secondPayload.id).not.toBe(firstPayload.id);
    expect(mockContext.store.dataSources.size).toBe(2);
  });

  it("prevents a second user from reading another user's data source", async () => {
    await ensureUserAndOrg(userOne, mockContext.prisma as any);
    currentAuth = userOne;
    const createRes = await saveRoute(makeJsonRequest({
      name: "Analytics",
      host: "analytics.local",
      port: 5432,
      database: "analytics",
      user: "reader",
      password: "secret",
    }) as any);
    const created = await createRes.json();

    const lookupForOwner = await findAccessibleDataSource(
      { userId: userOne.uid, datasourceId: created.id, orgId: created.orgId },
      mockContext.prisma as any
    );
    expect(lookupForOwner).toBeTruthy();

    const lookupForSecond = await findAccessibleDataSource(
      { userId: userTwo.uid, datasourceId: created.id, orgId: created.orgId },
      mockContext.prisma as any
    );
    expect(lookupForSecond).toBeNull();
  });

  it("accepts sqlite saves without host/user/port", async () => {
    const res = await saveRoute(makeJsonRequest({
      name: "Local SQLite",
      type: "sqlite",
      database: ":memory:",
    }) as any);

    expect(res.status).toBe(200);
    const payload = await res.json();
    const stored = mockContext.store.dataSources.get(payload.id);
    expect(stored).toBeTruthy();
    expect(stored?.type).toBe("sqlite");
    expect(stored?.database).toBe(":memory:");
    expect(stored?.host ?? null).toBeNull();
    expect(stored?.user ?? null).toBeNull();
    expect(stored?.port ?? null).toBeNull();
  });

  it("rejects csv save calls and requires upload flow", async () => {
    const res = await saveRoute(makeJsonRequest({
      name: "Spreadsheet",
      type: "csv",
    }) as any);

    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(String(payload.error)).toContain("Upload & Connect");
  });

  it("prevents a second user from deleting another user's data source", async () => {
    currentAuth = userOne;
    const createRes = await saveRoute(makeJsonRequest({
      name: "Protected DS",
      host: "localhost",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: "secret",
    }) as any);
    const created = await createRes.json();
    expect(created.id).toBeTruthy();

    currentAuth = userTwo;
    const res = await deleteRoute(
      makeDeleteRequest(created.id) as any,
      { params: Promise.resolve({ id: created.id }) } as any,
    );
    expect(res.status).toBe(404);
    expect(mockContext.store.dataSources.has(created.id)).toBe(true);
  });

  it("deletes filesystem-backed csv file when data source is removed", async () => {
    const { user, org } = await ensureUserAndOrg(userOne, mockContext.prisma as any);
    currentAuth = userOne;

    const uploadsDir = join(process.cwd(), "uploads");
    mkdirSync(uploadsDir, { recursive: true });
    const fileName = `security_test_${Date.now()}_${Math.random().toString(16).slice(2)}.csv`;
    const relativePath = join("uploads", fileName);
    const fullPath = join(process.cwd(), relativePath);
    writeFileSync(fullPath, "a,b\n1,2", "utf-8");
    expect(existsSync(fullPath)).toBe(true);

    const ds = await mockContext.prisma.dataSource.create({
      data: {
        name: "Spreadsheet Upload",
        type: "csv",
        orgId: org.id,
        ownerId: user.id,
        metadata: { storage: "filesystem", filePath: relativePath, tableName: "data" },
      },
    });

    const res = await deleteRoute(
      makeDeleteRequest(ds.id) as any,
      { params: Promise.resolve({ id: ds.id }) } as any,
    );
    expect(res.status).toBe(200);
    expect(mockContext.store.dataSources.has(ds.id)).toBe(false);
    expect(existsSync(fullPath)).toBe(false);

    rmSync(fullPath, { force: true });
  });
});

function makeJsonRequest(body: any, init: RequestInit = {}): Request {
  return new Request("http://localhost/api/datasources/save", {
    method: "POST",
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });
}

function makeDeleteRequest(id: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost/api/datasources/${id}`, {
    method: "DELETE",
    headers: { ...(init.headers || {}) },
    ...init,
  });
}

type MembershipMap = Map<string, Set<string>>;

type DataSourceRecord = {
  id: string;
  ownerId: string | null;
  orgId: string | null;
  name: string;
  type?: string;
  host?: string | null;
  port?: number | null;
  database?: string | null;
  user?: string | null;
  passwordCiphertext?: string | null;
  passwordIv?: string | null;
  passwordTag?: string | null;
  urlCiphertext?: string | null;
  urlIv?: string | null;
  urlTag?: string | null;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
};

type Store = {
  users: Map<string, any>;
  orgs: Map<string, any>;
  dataSources: Map<string, DataSourceRecord>;
  auditLogs: any[];
  memberships: MembershipMap;
};

type PrismaStub = {
  org: { upsert(args: any): Promise<any> };
  user: { upsert(args: any): Promise<any> };
  orgMembership: { upsert(args: any): Promise<any>; findUnique(args: any): Promise<any> };
  dataSource: {
    findFirst(args: any): Promise<DataSourceRecord | null>;
    create(args: any): Promise<DataSourceRecord>;
    update(args: any): Promise<DataSourceRecord>;
    delete(args: any): Promise<DataSourceRecord>;
  };
  auditLog: { create(args: any): Promise<any> };
};

function createMockContext(): { store: Store; prisma: PrismaStub } {
  let dsCounter = 1;
  const store: Store = {
    users: new Map(),
    orgs: new Map(),
    dataSources: new Map(),
    auditLogs: [],
    memberships: new Map(),
  };

  function ensureMembership(orgId: string | null | undefined, userId: string) {
    if (!orgId) return;
    if (!store.memberships.has(orgId)) {
      store.memberships.set(orgId, new Set());
    }
    store.memberships.get(orgId)!.add(userId);
  }

  return {
    store,
    prisma: {
      org: {
        async upsert({ where, create, update }: any) {
          const existing = store.orgs.get(where.id);
          if (existing) {
            if (update && Object.keys(update).length > 0) {
              const next = { ...existing, ...cleanObject(update) };
              store.orgs.set(where.id, next);
              return next;
            }
            return existing;
          }
          const record = { id: create.id, name: create.name ?? null };
          store.orgs.set(record.id, record);
          return record;
        },
      },
      user: {
        async upsert({ where, create, update }: any) {
          const existing = store.users.get(where.id);
          if (existing) {
            const next = { ...existing, ...cleanObject(update) };
            if (update?.orgId && update.orgId !== existing.orgId) {
              if (existing.orgId) {
                store.memberships.get(existing.orgId)?.delete(where.id);
              }
              ensureMembership(update.orgId, where.id);
            }
            store.users.set(where.id, next);
            return next;
          }
          const record = { ...create };
          store.users.set(where.id, record);
          ensureMembership(record.orgId, where.id);
          return record;
        },
      },
      orgMembership: {
        async upsert({ where, create }: any) {
          const orgId = where?.orgId_userId?.orgId ?? create.orgId;
          const userId = where?.orgId_userId?.userId ?? create.userId;
          ensureMembership(orgId, userId);
          return { orgId, userId, role: create.role ?? "viewer" };
        },
        async findUnique({ where }: any) {
          const orgId = where?.orgId_userId?.orgId;
          const userId = where?.orgId_userId?.userId;
          const members = store.memberships.get(orgId ?? "") ?? new Set();
          if (!orgId || !userId || !members.has(userId)) return null;
          return { orgId, userId, role: orgId === `org_${userId}` ? "owner" : "viewer" };
        },
      },
      dataSource: {
        async findFirst({ where }: any) {
          for (const ds of store.dataSources.values()) {
            if (matchesDataSource(ds, where, store.memberships)) {
              return ds;
            }
          }
          return null;
        },
        async create({ data }: any) {
          const id = data.id ?? `ds_${dsCounter++}`;
          const record: DataSourceRecord = {
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          store.dataSources.set(id, record);
          return record;
        },
        async update({ where, data }: any) {
          const existing = store.dataSources.get(where.id);
          if (!existing) throw new Error("DataSource not found");
          const updated = {
            ...existing,
            ...cleanObject(data),
            updatedAt: new Date(),
          };
          store.dataSources.set(where.id, updated);
          return updated;
        },
        async delete({ where }: any) {
          const existing = store.dataSources.get(where.id);
          if (!existing) throw new Error("DataSource not found");
          store.dataSources.delete(where.id);
          return existing;
        },
      },
      auditLog: {
        async create({ data }: any) {
          const entry = { id: `log_${store.auditLogs.length + 1}`, ...data };
          store.auditLogs.push(entry);
          return entry;
        },
      },
    },
  };
}

function cleanObject<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined) cleaned[key] = value;
  }
  return cleaned as T;
}

function matchesDataSource(ds: DataSourceRecord, where: any, memberships: MembershipMap): boolean {
  if (!where) return true;
  if (where.id && ds.id !== where.id) return false;
  if (where.orgId && ds.orgId !== where.orgId) return false;
  if (where.ownerId && ds.ownerId !== where.ownerId) return false;
  if (where.name && ds.name !== where.name) return false;
  if (where.host && ds.host !== where.host) return false;
  if (where.database && ds.database !== where.database) return false;
  if (where.user && ds.user !== where.user) return false;

  if (where.AND) {
    const conditions = Array.isArray(where.AND) ? where.AND : [where.AND];
    if (!conditions.every((cond: any) => matchesDataSource(ds, cond, memberships))) {
      return false;
    }
  }

  if (where.OR) {
    const conditions = Array.isArray(where.OR) ? where.OR : [where.OR];
    if (
      conditions.filter(Boolean).length > 0 &&
      !conditions.some((cond: any) => matchesDataSource(ds, cond, memberships))
    ) {
      return false;
    }
  }

  if (where.org?.memberships?.some?.userId) {
    const members = memberships.get(ds.orgId ?? "") ?? new Set<string>();
    if (!members.has(where.org.memberships.some.userId)) {
      return false;
    }
  }

  return true;
}
