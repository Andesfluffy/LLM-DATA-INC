"use client";
import dynamic from "next/dynamic";

// Code-split Recharts chart
const Chart = dynamic(() => import("@/src/components/Chart"), { ssr: false });

export default Chart;

