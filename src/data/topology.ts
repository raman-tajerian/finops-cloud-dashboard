// Topology layout only; cost and health are derived from the master dataset.
import type { MasterResource, TopoNodeDto } from "@/types/finops";

export const topoLayout: (Pick<TopoNodeDto, "id" | "label" | "kind" | "x" | "y" | "z"> & { match: (r: MasterResource) => boolean })[] = [
  { id: "use1", label: "us-east-1", kind: "region", x: -120, y: 0, z: 0, match: (r) => r.region === "us-east-1" },
  { id: "euw1", label: "eu-west-1", kind: "region", x: 120, y: 0, z: 0, match: (r) => r.region === "eu-west-1" },
  { id: "vpc-core", label: "vpc-core", kind: "vpc", x: -170, y: -80, z: 70, match: (r) => r.region === "us-east-1" && r.category === "Compute" },
  { id: "vpc-data", label: "vpc-data", kind: "vpc", x: -60, y: 90, z: -70, match: (r) => r.region === "us-east-1" && (r.category === "Database" || r.category === "Storage") },
  { id: "vpc-edge", label: "vpc-edge", kind: "vpc", x: 170, y: -80, z: -60, match: (r) => r.region === "eu-west-1" && r.category !== "Kubernetes" },
  { id: "k8s-prod", label: "prod-k8s-01", kind: "cluster", x: -210, y: 30, z: 120, match: (r) => r.service === "EKS" && r.region === "us-east-1" },
  { id: "k8s-ml", label: "ml-gpu-pool", kind: "cluster", x: -20, y: 150, z: -10, match: (r) => r.service === "GKE" || r.service === "AKS" },
  { id: "k8s-eu", label: "eu-k8s-02", kind: "cluster", x: 200, y: 70, z: 90, match: (r) => r.service === "EKS" && r.region === "eu-west-1" },
];
export const topoEdges = [
  { from: "use1", to: "euw1" }, { from: "use1", to: "vpc-core" }, { from: "use1", to: "vpc-data" },
  { from: "euw1", to: "vpc-edge" }, { from: "euw1", to: "k8s-eu" }, { from: "vpc-core", to: "k8s-prod" }, { from: "vpc-data", to: "k8s-ml" },
];
