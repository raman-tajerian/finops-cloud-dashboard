// Operational (non-cost) telemetry for the Kubernetes panel.
export const cluster = { name: "prod-k8s-cluster-01", region: "eu-west-1", version: "v1.30.4", nodes: 42, cpu: 74, memory: 62, podsHealthy: 148, podsTotal: 150 };
export const tickerSeed = [
  "Auto-scaler terminated 3 idle nodes",
  "HPA scaled checkout-api from 6 → 9 replicas",
  "Spot interruption handled on ip-10-2-14-8",
  "Rollout payments-svc v2.14.0 completed",
  "Budget guardrail paused dev-gpu-pool",
  "Karpenter consolidated 2 nodes into 1",
];
