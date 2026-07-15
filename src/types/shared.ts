/**
 * src/types/shared.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Type definitions for all Phase A6.8 Shared Modules:
 *   Notifications, Comments, Attachments, Tags, Favorites,
 *   User Preferences, API Keys, Activity Feed
 */

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationCategory =
  | 'system'
  | 'finding'
  | 'asset'
  | 'workflow'
  | 'ai'
  | 'report'
  | 'member';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  projectId?: string;
  createdAt: string;
}

export interface NotificationFilters {
  category?: NotificationCategory | null;
  read?: boolean | null;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export type CommentEntityType = 'finding' | 'asset' | 'report' | 'case';

export interface CommentAuthor {
  id: string;
  name: string;
  email?: string;
}

export interface CommentAttachment {
  id: string;
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

export interface Comment {
  id: string;
  content: string;
  entityType: CommentEntityType;
  entityId: string;
  projectId: string;
  author: CommentAuthor;
  parentId?: string | null;
  replies?: Comment[];
  mentions?: string[]; // user IDs
  attachments?: CommentAttachment[];
  edited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  entityType: CommentEntityType;
  entityId: string;
  parentId?: string;
  mentions?: string[];
}

export interface UpdateCommentRequest {
  content: string;
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export type AttachmentEntityType = 'finding' | 'asset' | 'report' | 'case' | 'project';

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  entityType: AttachmentEntityType;
  entityId: string;
  projectId: string;
  uploadedBy: CommentAuthor;
  createdAt: string;
}

export interface UploadAttachmentRequest {
  entityType: AttachmentEntityType;
  entityId: string;
  file: File;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export type TagColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink';

export interface Tag {
  id: string;
  name: string;
  color: TagColor;
  projectId: string;
  usageCount: number;
  createdAt: string;
}

export interface CreateTagRequest {
  name: string;
  color?: TagColor;
}

export interface AssignTagRequest {
  entityType: string;
  entityId: string;
  tagId: string;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export type FavoriteEntityType =
  | 'project'
  | 'finding'
  | 'asset'
  | 'report'
  | 'playbook'
  | 'case';

export interface Favorite {
  id: string;
  entityType: FavoriteEntityType;
  entityId: string;
  entityName?: string;
  entityMeta?: Record<string, unknown>;
  userId: string;
  createdAt: string;
}

export interface AddFavoriteRequest {
  entityType: FavoriteEntityType;
  entityId: string;
  entityName?: string;
  entityMeta?: Record<string, unknown>;
}

// ─── User Preferences ─────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light' | 'system';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';
export type DensityMode = 'compact' | 'comfortable' | 'spacious';

export interface DashboardPreferences {
  defaultView: 'grid' | 'list';
  showStats: boolean;
  showCharts: boolean;
  showActivity: boolean;
  defaultProjectSort: string;
}

export interface AiPreferences {
  defaultProvider: string;
  defaultModel: string;
  streamingEnabled: boolean;
  reasoningEnabled: boolean;
  contextSize: 'small' | 'medium' | 'large';
  temperature: number;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  browserEnabled: boolean;
  findingAlerts: boolean;
  workflowAlerts: boolean;
  systemAlerts: boolean;
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'never';
}

export interface UserPreferences {
  theme: Theme;
  language: Language;
  density: DensityMode;
  timezone: string;
  dateFormat: string;
  dashboard: DashboardPreferences;
  ai: AiPreferences;
  notifications: NotificationPreferences;
  updatedAt?: string;
}

export type UpdatePreferencesRequest = Partial<UserPreferences>;

// ─── API Keys ─────────────────────────────────────────────────────────────────

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string; // first 8 chars only, e.g. "nf_live_"
  status: ApiKeyStatus;
  lastUsedAt: string | null;
  expiresAt: string | null;
  scopes: string[];
  createdAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  secret: string; // Only returned on creation
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresAt?: string | null;
}

export interface ApiKeyActivity {
  id: string;
  keyId: string;
  keyName: string;
  action: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

export type ActivityType =
  | 'user'
  | 'investigation'
  | 'ai'
  | 'workflow'
  | 'system';

export type ActivitySeverity = 'info' | 'warning' | 'error' | 'success';

export interface ActivityActor {
  id: string;
  name: string;
  role?: string;
}

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  severity: ActivitySeverity;
  title: string;
  description?: string;
  actor?: ActivityActor;
  projectId?: string;
  projectName?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityFilters {
  type?: ActivityType | null;
  severity?: ActivitySeverity | null;
  projectId?: string | null;
  search?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

// ─── Cache Configuration ──────────────────────────────────────────────────────

export interface CacheTTLConfig {
  dashboard: number;        // 30s
  statistics: number;       // 30s
  knowledge: number;        // 5 min
  workflowLists: number;    // 60s
  userPreferences: number;  // until changed (very large)
  notifications: number;    // 15s
  default: number;          // 60s
}

export const DEFAULT_CACHE_TTL: CacheTTLConfig = {
  dashboard: 30_000,
  statistics: 30_000,
  knowledge: 5 * 60_000,
  workflowLists: 60_000,
  userPreferences: 24 * 60 * 60_000,
  notifications: 15_000,
  default: 60_000,
};
