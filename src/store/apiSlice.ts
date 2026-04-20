import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      const user = localStorage.getItem('user');
      if (user) {
        const { id } = JSON.parse(user);
        headers.set('x-user-id', id);
      }
      return headers;
    },
  }),
  tagTypes: ['Intake'],
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    createIntake: builder.mutation({
      query: (newIntake) => ({
        url: '/intake',
        method: 'POST',
        body: newIntake,
      }),
      invalidatesTags: ['Intake'],
    }),
    getIntakes: builder.query<any[], { search?: string; status?: 'pending' | 'completed'; startDate?: string; endDate?: string } | void>({
      query: (options) => ({
        url: '/intake',
        params: options || {},
      }),
      providesTags: ['Intake'],
    }),
    completeIntake: builder.mutation<any, string>({
      query: (id) => ({
        url: `/intake/${id}/complete`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Intake'],
    }),
    getPublicReport: builder.query<any, string>({
      query: (id) => `/public/report/${id}`,
    }),
    saveFinalResults: builder.mutation({
      query: (finalResults) => ({
        url: '/final-results/save',
        method: 'POST',
        body: finalResults,
      }),
    }),
    getPendingUsers: builder.query<any[], void>({
      query: () => '/admin/pending-users',
      providesTags: ['User' as any],
    }),
    approveUser: builder.mutation<any, string>({
      query: (userId) => ({
        url: '/admin/approve-user',
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: ['User' as any],
    }),
  }),
});

export const { 
  useRegisterMutation,
  useLoginMutation,
  useCreateIntakeMutation, 
  useGetIntakesQuery, 
  useCompleteIntakeMutation,
  useGetPublicReportQuery,
  useSaveFinalResultsMutation,
  useGetPendingUsersQuery,
  useApproveUserMutation
} = apiSlice;
