import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axios';

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async () => {
    const response = await axios.get('/api/users'); // Add /api prefix
    return response.data;
  }
);

export const createUser = createAsyncThunk(
  'users/create',
  async (userData) => {
    const response = await axios.post('/api/auth/register', userData); // Add /api prefix
    return response.data.user;
  }
);

export const updateUserRole = createAsyncThunk(
  'users/updateRole',
  async ({ userId, role }) => {
    await axios.put(`/api/users/${userId}/role`, { role }); // Add /api prefix
    return { userId, role };
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.users = action.payload;
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.push(action.payload);
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const { userId, role } = action.payload;
        const user = state.users.find(u => u.id === userId);
        if (user) {
          user.role = role;
        }
      });
  }
});

export default userSlice.reducer;