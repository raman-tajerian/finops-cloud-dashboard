// Local typed mock data for 3D topology, GreenOps, anomaly forecast and scenario simulator.
// Shapes mirror the planned C# API contracts.
export type NodeKind = "region" | "vpc" | "cluster";
export type NodeHealth = "ok" | "oversized" | "anomaly";
export interface TopoNode { id: string; label: string; kind: NodeKind; health: NodeHealth; x: number; y: number; z: number; cost: number }
export interface TopoEdge { from: string; to: string }

export const topoNodes: TopoNode[] = [
  { id: "use1", label: "us-east-1", kind: "region", health: "ok", x: -120, y: 0, z: 0, cost: 112_400 },
  { id: "euw1", label: "eu-west-1", kind: "region", health: "ok", x: 120, y: 0, z: 0, cost: 68_900 },
  { id: "vpc-core", label: "vpc-core", kind: "vpc", health: "ok", x: -170, y: -80, z: 70, cost: 41_200 },
  { id: "vpc-data", label: "vpc-data", kind: "vpc", health: "oversized", x: -60, y: 90, z: -70, cost: 38_700 },
  { id: "vpc-edge", label: "vpc-edge", kind: "vpc", health: "anomaly", x: 170, y: -80, z: -60, cost: 22_100 },
  { id: "k8s-prod", label: "prod-k8s-01", kind: "cluster", health: "ok", x: -210, y: 30, z: 120, cost: 29_800 },
  { id: "k8s-ml", label: "ml-gpu-pool", kind: "cluster", health: "oversized", x: -20, y: 150, z: -10, cost: 24_300 },
  { id: "k8s-eu", label: "eu-k8s-02", kind: "cluster", health: "ok", x: 200, y: 70, z: 90, cost: 18_600 },
];
export const topoEdges: TopoEdge[] = [
  { from: "use1", to: "euw1" }, { from: "use1", to: "vpc-core" }, { from: "use1", to: "vpc-data" },
  { from: "euw1", to: "vpc-edge" }, { from: "euw1", to: "k8s-eu" }, { from: "vpc-core", to: "k8s-prod" }, { from: "vpc-data", to: "k8s-ml" },
];

export interface CarbonRegion { region: string; provider: "AWS" | "Azure" | "GCP"; intensity: number; rating: "A" | "B" | "C" | "D"; tons: number }
export const carbonRegions: CarbonRegion[] = [
  { region: "eu-north-1", provider: "AWS", intensity: 28, rating: "A", tons: 1.2 },
  { region: "europe-west1", provider: "GCP", intensity: 112, rating: "B", tons: 2.4 },
  { region: "westeurope", provider: "Azure", intensity: 268, rating: "C", tons: 6.1 },
  { region: "us-east-1", provider: "AWS", intensity: 379, rating: "D", tons: 14.8 },
];

export const forecast = Array.from({ length: 30 }, (_, i) => {
  const base = 7600 + i * 45 + Math.sin(i / 2.5) * 320;
  const actual = i < 22 ? base + (i === 18 ? 5200 : i === 19 ? 3100 : 0) + Math.cos(i) * 180 : null;
  const spread = 380 + i * 22;
  return { day: `Oct ${i + 1}`, forecast: Math.round(base), band: [Math.round(base - spread), Math.round(base + spread)] as [number, number], actual: actual === null ? null : Math.round(actual) };
});

export const unitExtra = { perDeployment: 1.24, perSession: 0.018 };
