import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { fetchAllDataSupabase, updateTaskStatusSupabase, updateCompanyDataSupabase, createCompanySupabase, softDeleteCompanySupabase, fetchTasksPaginatedSupabase } from '../services/supabaseService';
import { CompanyTask } from '../types';

export const useInfiniteTasksQuery = (filters: any = {}) => {
    return useInfiniteQuery({
        queryKey: ['tasks', 'infinite', filters],
        queryFn: ({ pageParam = 0 }) => fetchTasksPaginatedSupabase(pageParam, 50, filters),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length : undefined,
    });
};

export const useTasksQuery = () => {
    return useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const data = await fetchAllDataSupabase();
            return data.tasks;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
};

export const useCollaboratorsQuery = () => {
    return useQuery({
        queryKey: ['collaborators'],
        queryFn: async () => {
            const data = await fetchAllDataSupabase();
            return data.collaborators;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useUpdateTaskMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ task, columnId, status, user }: { task: CompanyTask, columnId: string, status: string, user: string }) => {
            await updateTaskStatusSupabase(task, columnId as keyof CompanyTask, status, user);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
};

export const useUpdateCompanyMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ company, user }: { company: CompanyTask, user: string }) => {
            await updateCompanyDataSupabase(company, user);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
};
