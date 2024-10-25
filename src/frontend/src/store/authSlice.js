// src/store/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginUser, registerUser } from '../services/api';

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }) => {
    const response = await loginUser({ username, password });
    return response.data;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ username, password, role }) => {
    const response = await registerUser({ username, password, role });
    return response.data;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('token') || null,
    user: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Register
      .addCase(register.fulfilled, (state, action) => {
        // Handle registration success if needed
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;
