import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axios';  // Use configured axios instance

export const fetchDailyReport = createAsyncThunk(
  'reports/fetchDaily',
  async ({ date, startTime, endTime }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (startTime) params.append('startTime', startTime);
      if (endTime) params.append('endTime', endTime);
      
      const response = await axios.get(`/api/reports/daily?${params}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch daily report');
    }
  }
);

export const fetchTankReport = createAsyncThunk(
  'reports/fetchTank',
  async ({ tankNumber, date, startTime, endTime }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (startTime) params.append('startTime', startTime);
      if (endTime) params.append('endTime', endTime);
      
      const response = await axios.get(`/api/reports/tank/${tankNumber}?${params}`);
      return { tankNumber, data: response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch tank report');
    }
  }
);

const reportSlice = createSlice({
  name: 'reports',
  initialState: {
    dailyReport: null,
    tankReports: {},
    filters: {
      date: new Date().toISOString().split('T')[0],
      startTime: '00:00',
      endTime: '23:59',
    },
    status: 'idle',
    error: null,
  },
  reducers: {
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearReports: (state) => {
      state.dailyReport = null;
      state.tankReports = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyReport.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDailyReport.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.dailyReport = action.payload;
        state.error = null;
      })
      .addCase(fetchDailyReport.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unknown error occurred';
      })
      .addCase(fetchTankReport.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTankReport.fulfilled, (state, action) => {
        const { tankNumber, data } = action.payload;
        state.tankReports[tankNumber] = data;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchTankReport.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unknown error occurred';
      });
  },
});

export const { updateFilters, clearReports } = reportSlice.actions;
export default reportSlice.reducer;