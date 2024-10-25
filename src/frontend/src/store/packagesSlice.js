// src/store/packagesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchPackages, uploadPackage } from '../services/api';

export const getPackages = createAsyncThunk(
  'packages/getPackages',
  async () => {
    const response = await fetchPackages();
    return response.data;
  }
);

export const addPackage = createAsyncThunk(
  'packages/addPackage',
  async (formData) => {
    const response = await uploadPackage(formData);
    return response.data;
  }
);

const packagesSlice = createSlice({
  name: 'packages',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getPackages.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getPackages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(getPackages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addPackage.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export default packagesSlice.reducer;
