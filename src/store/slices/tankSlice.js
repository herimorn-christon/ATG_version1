import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axios'; // Use configured axios instance

// Async thunks
export const fetchCurrentTanks = createAsyncThunk(
  'tanks/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/tanks/current');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch current tanks');
    }
  }
);

export const fetchTankHistory = createAsyncThunk(
  'tanks/fetchHistory',
  async ({ tankNumber, hours = 24 }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/tanks/history/${tankNumber}?hours=${hours}`);
      return { tankNumber, data: response.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch tank history');
    }
  }
);

const tankSlice = createSlice({
  name: 'tanks',
  initialState: {
    currentData: [],
    historicalData: {},
    status: 'idle',
    error: null,
    lastUpdated: null,
  },
  reducers: {
    updateRealTimeData: (state, action) => {
      state.currentData = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentTanks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCurrentTanks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentData = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchCurrentTanks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchTankHistory.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTankHistory.fulfilled, (state, action) => {
        const { tankNumber, data } = action.payload;
        state.historicalData[tankNumber] = data;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchTankHistory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { updateRealTimeData, clearError } = tankSlice.actions;
export default tankSlice.reducer;