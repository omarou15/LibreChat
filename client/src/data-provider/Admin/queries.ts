import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { QueryObserverResult, UseMutationResult, UseQueryOptions } from '@tanstack/react-query';
import type { AdminUserListItem } from 'librechat-data-provider';

type AdminUsersResponse = { users: AdminUserListItem[]; total: number; limit: number; offset: number };

export const useListAdminUsers = (
  params?: { limit?: number; offset?: number },
  config?: UseQueryOptions<AdminUsersResponse>,
): QueryObserverResult<AdminUsersResponse> => {
  return useQuery<AdminUsersResponse>(
    [QueryKeys.adminUsers, params],
    () => dataService.listAdminUsers(params),
    { refetchOnWindowFocus: false, retry: false, ...config },
  );
};

export const useInviteUserMutation = (options?: {
  onSuccess?: (data: { message: string; inviteLink?: string }) => void;
  onError?: (error: { message?: string }) => void;
}): UseMutationResult<{ message: string; inviteLink?: string }, { message?: string }, string> => {
  const queryClient = useQueryClient();
  return useMutation((email: string) => dataService.inviteAdminUser(email), {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKeys.adminUsers]);
      options?.onSuccess?.(data);
    },
    onError: (error) => options?.onError?.(error),
  });
};

export const useDeleteAdminUserMutation = (options?: {
  onSuccess?: () => void;
  onError?: (error: { message?: string }) => void;
}): UseMutationResult<{ message: string }, { message?: string }, string> => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => dataService.deleteAdminUser(id), {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.adminUsers]);
      options?.onSuccess?.();
    },
    onError: (error) => options?.onError?.(error),
  });
};
