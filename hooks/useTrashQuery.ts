import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrashSupabase, restoreCompanySupabase, restoreCollaboratorSupabase, deleteCompanySupabase, deleteCollaboratorSupabase } from '../services/supabaseService';

export const useTrashQuery = (year?: string) => {
    return useQuery({
        queryKey: ['trash', year],
        queryFn: () => fetchTrashSupabase(year),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useRestoreCompanyMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, user, year }: { id: string; user: string; year: string }) => {
            await restoreCompanySupabase(id, user, year);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Assuming main tasks query key
        },
    });
};

export const useRestoreCollaboratorMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await restoreCollaboratorSupabase(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            queryClient.invalidateQueries({ queryKey: ['collaborators'] }); // Assuming main collaborators query key
        },
    });
};

export const usePermanentDeleteCompanyMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, user, year }: { id: string; user: string; year: string }) => {
            await deleteCompanySupabase(id, user, year);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
        },
    });
};

export const usePermanentDeleteCollaboratorMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await deleteCollaboratorSupabase(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] });
        },
    });
};
