import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({ 
  baseUrl: '/api',
  prepareHeaders: (headers) => {
    const user = localStorage.getItem('user');
    if (user) {
      const { id } = JSON.parse(user);
      headers.set('x-user-id', id);
    }
    return headers;
  },
});

const baseQueryWithAuthChecks: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error && (result.error.status === 401 || result.error.status === 403)) {
    // Check if user session needs to be cleared
    if (localStorage.getItem('user')) {
      localStorage.removeItem('user');
      // Use window.location as the final authority to reset the app state
      window.location.href = '/login';
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuthChecks,
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
    getCurrentUser: builder.query<any, void>({
      query: () => '/auth/me',
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
    getApprovedUsers: builder.query<any[], void>({
      query: () => '/admin/approved-users',
      providesTags: ['User' as any],
    }),
    revokeUser: builder.mutation<any, string>({
      query: (userId) => ({
        url: '/admin/revoke-user',
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
  useGetCurrentUserQuery,
  useCreateIntakeMutation, 
  useGetIntakesQuery, 
  useCompleteIntakeMutation,
  useGetPublicReportQuery,
  useSaveFinalResultsMutation,
  useGetPendingUsersQuery,
  useApproveUserMutation,
  useGetApprovedUsersQuery,
  useRevokeUserMutation
} = apiSlice;
