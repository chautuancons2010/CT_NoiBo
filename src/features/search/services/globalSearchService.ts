import "server-only";

import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { globalSearchCore } from "@/features/search/services/globalSearchCore";
import { listRecentEntities } from "@/features/search/services/recentEntityService";
import { searchProviders } from "@/features/search/services/providers";
import type { GlobalSearchResponse, SearchEntityType } from "@/features/search/types";
import { isReleasedFeaturePath } from "@/config/featureRelease";

export async function globalSearch(user: AuthenticatedUser, input: { query: string; types?: SearchEntityType[]; limit?: number; offset?: number }): Promise<GlobalSearchResponse> {
  const recent = await listRecentEntities(user, 20);
  const providers = searchProviders.filter(provider => provider.entityTypes.some(type => ["employee", "project", "worksite", "timesheet_period", "contract"].includes(type))).map(provider => ({ ...provider, search: async (context: Parameters<typeof provider.search>[0]) => (await provider.search(context)).filter(item => isReleasedFeaturePath(item.deepLink)) }));
  const response = await globalSearchCore(user, input, providers, new Set(recent.map((item) => `${item.entityType}:${item.entityId}`)));
  return { ...response, unavailableTypes: response.unavailableTypes.filter(type => ["employee", "project", "worksite", "timesheet_period", "contract"].includes(type)) };
}
