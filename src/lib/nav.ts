import { Activity, BarChart3, Bell, Boxes, FileText, Gauge, Handshake, Leaf, Plug, Server, Settings, ShieldCheck, Sparkles, Target, Users, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem { to: string; label: string; icon: LucideIcon; description: string }
export interface NavGroup { label: string; items: NavItem[] }

// Single source for sidebar, breadcrumbs and command palette.
export const navGroups: NavGroup[] = [
  { label: "Analyze", items: [
    { to: "/", label: "Overview", icon: Gauge, description: "Spend, forecast, savings and anomalies at a glance" },
    { to: "/cost-explorer", label: "Cost Explorer", icon: BarChart3, description: "Slice spend by service, region and provider" },
    { to: "/resources", label: "Resources", icon: Server, description: "Every cloud resource with cost and status" },
    { to: "/teams", label: "Teams", icon: Users, description: "Team showback, resources and budgets" },
  ] },
  { label: "Optimize", items: [
    { to: '/model-insights', label: 'Model Insights', icon: Sparkles, description: 'Demo detection, forecasting, model registry and planned MLOps' },
    { to: "/recommendations", label: "Recommendations", icon: Target, description: "Savings actions ranked by impact" },
    { to: "/commitments", label: "Commitments", icon: Handshake, description: "Savings plans, reservations and coverage" },
    { to: "/kubernetes", label: "Kubernetes", icon: Boxes, description: "Cluster health, utilization and live events" },
    { to: "/sustainability", label: "Sustainability", icon: Leaf, description: "Estimated carbon footprint by region" },
  ] },
  { label: "Govern", items: [
    { to: "/security", label: "Security & Compliance", icon: ShieldCheck, description: "Findings and compliance posture" },
    { to: "/budgets", label: "Budgets & Alerts", icon: Wallet, description: "Budgets, thresholds and anomaly alerts" },
    { to: "/reports", label: "Reports", icon: FileText, description: "Generate and schedule cost reports" },
    { to: "/notifications", label: "Notifications", icon: Bell, description: "Anomalies, budgets, security and savings" },
  ] },
  { label: "Admin", items: [
    { to: "/integrations", label: "Integrations", icon: Plug, description: "Cloud accounts and tool connections" },
    { to: "/settings", label: "Settings", icon: Settings, description: "Workspace, team and preferences" },
  ] },
];
export const navItems = navGroups.flatMap((g) => g.items);
export const ActivityIcon = Activity;
