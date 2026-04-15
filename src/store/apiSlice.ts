import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Intake'],
  endpoints: (builder) => ({
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
  }),
});

export const { 
  useCreateIntakeMutation, 
  useGetIntakesQuery, 
  useCompleteIntakeMutation 
} = apiSlice;
