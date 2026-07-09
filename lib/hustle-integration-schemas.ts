import { z } from "zod"

export const callCenterPermissionsSchema = z.object({
  canBuyNumber: z.boolean(),
  canTopUpWallet: z.boolean(),
  canManageAgents: z.boolean(),
  canManageCallFlows: z.boolean(),
  canAssignNumbers: z.boolean(),
  canUseAssignedNumbers: z.boolean(),
  canEditAssignedFlow: z.boolean(),
  canViewOwnCallLogs: z.boolean(),
  canViewAllCallLogs: z.boolean(),
  canViewOrgAnalytics: z.boolean(),
  canViewWallet: z.boolean(),
  canManageBilling: z.boolean(),
})

export const callCenterRoleSchema = z.enum([
  "call_center_admin",
  "call_center_operator",
  "no_access",
])

export const hustleOrgSyncSchema = z.object({
  event: z.literal("org.synced"),
  orgId: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  workspaceType: z.string().min(1).optional(),
  ownerUserId: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).optional(),
  orgName: z.string().min(1),
  status: z.string().min(1),
  hustlePlan: z.string().min(1).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const hustleMemberSyncSchema = z.object({
  event: z.literal("member.synced"),
  orgId: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).optional(),
  hustleRole: z.string().min(1),
  role: z.string().min(1).optional(),
  callCenterRole: callCenterRoleSchema.optional(),
  status: z.string().min(1),
  permissions: callCenterPermissionsSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const hustlePermissionSyncSchema = z.object({
  event: z.literal("member.permission.updated"),
  orgId: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  userId: z.string().min(1),
  role: callCenterRoleSchema.optional(),
  callCenterRole: callCenterRoleSchema,
  status: z.string().min(1),
  permissions: callCenterPermissionsSchema,
  updatedAt: z.string().optional(),
})

export type HustleOrgSyncPayload = z.infer<typeof hustleOrgSyncSchema>
export type HustleMemberSyncPayload = z.infer<typeof hustleMemberSyncSchema>
export type HustlePermissionSyncPayload = z.infer<typeof hustlePermissionSyncSchema>
export type CallCenterPermissions = z.infer<typeof callCenterPermissionsSchema>

export const CALL_CENTER_ADMIN_PERMISSIONS: CallCenterPermissions = {
  canBuyNumber: true,
  canTopUpWallet: true,
  canManageAgents: true,
  canManageCallFlows: true,
  canAssignNumbers: true,
  canUseAssignedNumbers: true,
  canEditAssignedFlow: true,
  canViewOwnCallLogs: true,
  canViewAllCallLogs: true,
  canViewOrgAnalytics: true,
  canViewWallet: true,
  canManageBilling: true,
}
