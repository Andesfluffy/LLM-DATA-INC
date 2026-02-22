import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureUser } from "@/lib/userOrg";
import { prisma } from "@/lib/db";

// Pre-seeded sales dataset — 84 rows, 6 months of 2024
// Columns: date, product, category, revenue, units, region, channel
const DEMO_CSV = `date,product,category,revenue,units,region,channel
2024-01-08,Widget Pro,Electronics,2400,12,North,Online
2024-01-08,Gizmo Mini,Accessories,450,9,South,Retail
2024-01-08,SnazBand,Wearables,720,6,East,Online
2024-01-08,DataDrive,Software,900,3,West,Direct
2024-01-15,Widget Pro,Electronics,3200,16,South,Online
2024-01-15,Gizmo Mini,Accessories,600,12,North,Online
2024-01-15,SnazBand,Wearables,480,4,West,Retail
2024-01-15,DataDrive,Software,1200,4,East,Direct
2024-01-22,Widget Pro,Electronics,2000,10,East,Retail
2024-01-22,Gizmo Mini,Accessories,350,7,West,Online
2024-01-22,SnazBand,Wearables,960,8,North,Online
2024-01-22,DataDrive,Software,600,2,South,Direct
2024-01-29,Widget Pro,Electronics,4000,20,West,Direct
2024-01-29,Gizmo Mini,Accessories,750,15,East,Retail
2024-01-29,SnazBand,Wearables,360,3,South,Online
2024-01-29,DataDrive,Software,1500,5,North,Online
2024-02-05,Widget Pro,Electronics,2800,14,North,Online
2024-02-05,Gizmo Mini,Accessories,500,10,South,Direct
2024-02-05,SnazBand,Wearables,840,7,West,Retail
2024-02-05,DataDrive,Software,900,3,East,Online
2024-02-12,Widget Pro,Electronics,1600,8,South,Retail
2024-02-12,Gizmo Mini,Accessories,400,8,West,Online
2024-02-12,SnazBand,Wearables,600,5,North,Direct
2024-02-12,DataDrive,Software,1800,6,Central,Online
2024-02-19,Widget Pro,Electronics,3600,18,East,Online
2024-02-19,Gizmo Mini,Accessories,650,13,Central,Retail
2024-02-19,SnazBand,Wearables,720,6,South,Online
2024-02-19,DataDrive,Software,1200,4,West,Direct
2024-02-26,Widget Pro,Electronics,2200,11,Central,Direct
2024-02-26,Gizmo Mini,Accessories,300,6,North,Online
2024-02-26,SnazBand,Wearables,480,4,East,Retail
2024-02-26,DataDrive,Software,600,2,South,Online
2024-03-04,Widget Pro,Electronics,4400,22,West,Online
2024-03-04,Gizmo Mini,Accessories,800,16,East,Direct
2024-03-04,SnazBand,Wearables,1080,9,Central,Online
2024-03-04,DataDrive,Software,2100,7,North,Online
2024-03-11,Widget Pro,Electronics,3000,15,North,Retail
2024-03-11,Gizmo Mini,Accessories,550,11,South,Online
2024-03-11,SnazBand,Wearables,840,7,West,Direct
2024-03-11,DataDrive,Software,1500,5,East,Online
2024-03-18,Widget Pro,Electronics,2600,13,South,Online
2024-03-18,Gizmo Mini,Accessories,700,14,West,Retail
2024-03-18,SnazBand,Wearables,600,5,North,Online
2024-03-18,DataDrive,Software,900,3,Central,Direct
2024-03-25,Widget Pro,Electronics,5000,25,East,Direct
2024-03-25,Gizmo Mini,Accessories,900,18,Central,Online
2024-03-25,SnazBand,Wearables,1200,10,South,Retail
2024-03-25,DataDrive,Software,2400,8,West,Online
2024-04-01,Widget Pro,Electronics,3400,17,Central,Online
2024-04-01,Gizmo Mini,Accessories,600,12,North,Retail
2024-04-01,SnazBand,Wearables,720,6,East,Online
2024-04-01,DataDrive,Software,1200,4,South,Direct
2024-04-08,Widget Pro,Electronics,2000,10,West,Online
2024-04-08,Gizmo Mini,Accessories,450,9,South,Direct
2024-04-08,SnazBand,Wearables,480,4,Central,Retail
2024-04-08,DataDrive,Software,1800,6,North,Online
2024-04-15,Widget Pro,Electronics,4600,23,North,Direct
2024-04-15,Gizmo Mini,Accessories,750,15,East,Online
2024-04-15,SnazBand,Wearables,960,8,West,Online
2024-04-15,DataDrive,Software,2700,9,Central,Retail
2024-04-22,Widget Pro,Electronics,3200,16,South,Retail
2024-04-22,Gizmo Mini,Accessories,500,10,Central,Online
2024-04-22,SnazBand,Wearables,840,7,North,Direct
2024-04-22,DataDrive,Software,900,3,East,Online
2024-04-29,Widget Pro,Electronics,2800,14,East,Online
2024-04-29,Gizmo Mini,Accessories,350,7,West,Retail
2024-04-29,SnazBand,Wearables,600,5,South,Online
2024-04-29,DataDrive,Software,1500,5,West,Direct
2024-05-06,Widget Pro,Electronics,5200,26,West,Online
2024-05-06,Gizmo Mini,Accessories,850,17,North,Online
2024-05-06,SnazBand,Wearables,1080,9,Central,Retail
2024-05-06,DataDrive,Software,3000,10,South,Direct
2024-05-13,Widget Pro,Electronics,3800,19,Central,Direct
2024-05-13,Gizmo Mini,Accessories,600,12,South,Online
2024-05-13,SnazBand,Wearables,720,6,West,Online
2024-05-13,DataDrive,Software,1800,6,North,Retail
2024-05-20,Widget Pro,Electronics,4200,21,North,Online
2024-05-20,Gizmo Mini,Accessories,700,14,East,Direct
2024-05-20,SnazBand,Wearables,960,8,South,Online
2024-05-20,DataDrive,Software,2400,8,Central,Online
2024-05-27,Widget Pro,Electronics,3000,15,South,Retail
2024-05-27,Gizmo Mini,Accessories,500,10,Central,Online
2024-05-27,SnazBand,Wearables,480,4,North,Direct
2024-05-27,DataDrive,Software,1200,4,East,Online
2024-06-03,Widget Pro,Electronics,5600,28,East,Online
2024-06-03,Gizmo Mini,Accessories,950,19,West,Retail
2024-06-03,SnazBand,Wearables,1320,11,Central,Online
2024-06-03,DataDrive,Software,3300,11,North,Direct`;

export async function POST(req: NextRequest) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user: dbUser } = await ensureUser(userAuth);

  // Check if user already has a demo datasource — don't create duplicates
  const existing = await prisma.dataSource.findFirst({
    where: { ownerId: dbUser.id, name: "Sample Sales Data" },
  });

  if (existing) {
    return NextResponse.json({ id: existing.id, alreadyExisted: true });
  }

  const csvBase64 = Buffer.from(DEMO_CSV, "utf-8").toString("base64");

  const ds = await prisma.dataSource.create({
    data: {
      name: "Sample Sales Data",
      type: "csv",
      ownerId: dbUser.id,
      metadata: {
        csvBase64,
        tableName: "sales",
        storage: "inline_base64",
        delimiter: ",",
        rowCount: 84,
      },
    },
  });

  // Auto-scope to the "sales" table so queries work immediately
  await prisma.dataSourceTableScope.create({
    data: { dataSourceId: ds.id, tableName: "sales" },
  });

  return NextResponse.json({ id: ds.id, alreadyExisted: false });
}
