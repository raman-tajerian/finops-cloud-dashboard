// Format-only validators for demo forms. Nothing is ever sent or stored.
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const isRoleArn = (s: string) => /^arn:aws:iam::\d{12}:role\/[\w+=,.@\/-]{1,64}$/.test(s.trim());
export const isGuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
export const isGcpProjectId = (s: string) => /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(s.trim());
export const parseEmails = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
