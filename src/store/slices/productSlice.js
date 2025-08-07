import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axios'; // Use configured axios instance

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async () => {
    const [productsRes, tankProductsRes] = await Promise.all([
      axios.get('/api/products'),
      axios.get('/api/tank-products')
    ]);
    return {
      products: productsRes.data,
      tankProducts: tankProductsRes.data
    };
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async ({ name, color }) => {
    const response = await axios.post('/api/products', { name, color });
    return response.data;
  }
);

export const assignTankProduct = createAsyncThunk(
  'products/assignToTank',
  async ({ tankNumber, productId, pumpNumbers }) => {
    const response = await axios.post('/api/tank-products', {
      tankNumber,
      productId,
      pumpNumbers
    });
    return response.data;
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    tankProducts: {},
    availableProducts: [],
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Convert tank products array to object
        state.tankProducts = action.payload.tankProducts.reduce((acc, tp) => {
          acc[tp.tank_number] = {
            name: tp.name,
            color: tp.color,
            productId: tp.product_id,
            pumpNumbers: tp.pump_numbers || []
          };
          return acc;
        }, {});
        // Extract available products
        state.availableProducts = action.payload.products.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color
        }));
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.availableProducts.push({
          id: action.payload.id,
          name: action.payload.name,
          color: action.payload.color
        });
      })
      .addCase(assignTankProduct.fulfilled, (state, action) => {
        const product = state.availableProducts.find(p => p.id === action.payload.product_id);
        if (product) {
          state.tankProducts[action.payload.tank_number] = {
            name: product.name,
            color: product.color,
            productId: product.id,
            pumpNumbers: action.payload.pump_numbers || []
          };
        }
      });
  }
});

export default productSlice.reducer;