import { configureStore } from '@reduxjs/toolkit';
import tankReducer from './slices/tankSlice';
import analyticsReducer from './slices/analyticsSlice';
import themeReducer from './slices/themeSlice';
import productReducer from './slices/productSlice';
import reportReducer from './slices/reportSlice';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    tanks: tankReducer,
    analytics: analyticsReducer,
    auth: authReducer,
    theme: themeReducer,
    products: productReducer,
    reports: reportReducer,
    users: userReducer,
  },
});