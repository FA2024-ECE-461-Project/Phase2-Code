// src/store/store.js
import { configureStore } from '@reduxjs/toolkit';
import packagesReducer from './packagesSlice';
import authReducer from './authSlice';

const store = configureStore({
  reducer: {
    packages: packagesReducer,
    auth: authReducer,
    // Add other reducers here
  },
});

export default store;
