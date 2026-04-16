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
    }),
    getIntakes: builder.query<any[], string | void>({
      query: (search) => ({
        url: '/intake',
        params: search ? { search } : {},
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
    saveFinalResults: builder.mutation({
      query: (finalResults) => ({
        url: '/final-results/save',
        method: 'POST',
        body: finalResults,
      }),
    }),
  }),
});

export const { 
  useRegisterMutation,
  useLoginMutation,
  useCreateIntakeMutation, 
  useGetIntakesQuery, 
  useCompleteIntakeMutation,
  useSaveFinalResultsMutation
} = apiSlice;
