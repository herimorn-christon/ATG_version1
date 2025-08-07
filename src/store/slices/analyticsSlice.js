import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axios';  // Use configured axios instance

export const fetchAnalyticsSummary = createAsyncThunk(
  'analytics/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/analytics/summary');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch analytics');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    summary: {},
    trends: {},
    status: 'idle',
    error: null,
  },
  reducers: {
    updateTrends: (state, action) => {
      state.trends = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsSummary.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchAnalyticsSummary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unknown error occurred';
      });
  },
});

export const { updateTrends } = analyticsSlice.actions;
export default analyticsSlice.reducer;