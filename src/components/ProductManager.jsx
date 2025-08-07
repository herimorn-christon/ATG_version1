import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchProducts, 
  createProduct, 
  assignTankProduct 
} from '../store/slices/productSlice';
import { Settings, Plus, Edit3, Save, X } from 'lucide-react';

const ProductManager = () => {
  const dispatch = useDispatch();
  const { tankProducts, availableProducts, status } = useSelector((state) => state.products);
  const { mode } = useSelector((state) => state.theme);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTank, setEditingTank] = useState(null);
  const [newProduct, setNewProduct] = useState('');
  const [formData, setFormData] = useState({
    product: '',
    color: '#10b981',
    pumpNumbers: '',
  });

  const productColors = [
    '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#f97316', '#84cc16', '#ec4899'
  ];

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const handleAddProduct = async () => {
    if (newProduct.trim()) {
      try {
        await dispatch(createProduct({ 
          name: newProduct.trim(),
          color: formData.color
        })).unwrap();
        setNewProduct('');
      } catch (err) {
        console.error('Failed to add product:', err);
      }
    }
  };

  const handleSave = async (tankNumber) => {
    const pumpNumbers = formData.pumpNumbers
      .split(',')
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num));

    const selectedProduct = availableProducts.find(p => p.name === formData.product);
    
    if (selectedProduct) {
      try {
        await dispatch(assignTankProduct({
          tankNumber,
          productId: selectedProduct.id,
          pumpNumbers
        })).unwrap();
        setEditingTank(null);
        setFormData({ product: '', color: '#10b981', pumpNumbers: '' });
      } catch (err) {
        console.error('Failed to assign product:', err);
      }
    }
  };

  const handleEdit = (tankNumber) => {
    const current = tankProducts[tankNumber];
    setFormData({
      product: current?.name || '',
      color: current?.color || '#10b981',
      pumpNumbers: current?.pumpNumbers?.join(', ') || '',
    });
    setEditingTank(tankNumber);
  };

  const baseClasses = mode === 'dark' 
    ? 'bg-gray-800 border-gray-700 text-white' 
    : 'bg-white border-gray-300 text-gray-900';

  const inputClasses = mode === 'dark'
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200
          ${mode === 'dark' 
            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }
        `}
      >
        <Settings className="h-4 w-4" />
        <span className="text-sm font-medium">Manage Products</span>
      </button>

      {isOpen && (
        <div
          className={`
            fixed inset-0 flex items-start justify-center z-[9999] px-4 py-8
          `}
        >
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />
          {/* Modal */}
          <div
            className={`
              relative w-full max-w-lg
              rounded-xl border shadow-xl
              p-6
              ${baseClasses}
              max-h-[90vh] overflow-y-auto mt-8
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Product Management</h3>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded hover:bg-gray-600 ${mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add New Product */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Add New Product
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  placeholder="Product name"
                  className={`flex-1 px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                />
                <button
                  onClick={handleAddProduct}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tank Product Assignments */}
            <div className="space-y-4">
              <h4 className={`font-medium ${mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Tank Assignments
              </h4>
              {['01', '02', '03', '04'].map((tankNumber) => (
                <div key={tankNumber} className={`
                  p-4 rounded-lg border
                  ${mode === 'dark' ? 'bg-gray-900 border-gray-600' : 'bg-gray-50 border-gray-200'}
                `}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Tank {tankNumber}</span>
                    {editingTank === tankNumber ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSave(tankNumber)}
                          className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingTank(null)}
                          className="p-1 text-red-400 hover:bg-red-400/20 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(tankNumber)}
                        className={`p-1 rounded hover:bg-gray-600 ${mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {editingTank === tankNumber ? (
                    <div className="space-y-3">
                      <select
                        value={formData.product}
                        onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                      >
                        <option value="">Select Product</option>
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.name}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <label className={`block text-xs mb-1 ${mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Color
                          </label>
                          <div className="flex space-x-1">
                            {productColors.map((color) => (
                              <button
                                key={color}
                                onClick={() => setFormData({ ...formData, color })}
                                className={`w-6 h-6 rounded-full border-2 ${
                                  formData.color === color ? 'border-white' : 'border-gray-400'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={formData.pumpNumbers}
                        onChange={(e) => setFormData({ ...formData, pumpNumbers: e.target.value })}
                        placeholder="Pump numbers (e.g., 1, 2, 3)"
                        className={`w-full px-3 py-2 border rounded-md text-sm ${inputClasses}`}
                      />
                    </div>
                  ) : (
                    <div className="text-sm">
                      {tankProducts[tankNumber] ? (
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tankProducts[tankNumber].color }}
                          />
                          <span>{tankProducts[tankNumber].name}</span>
                          <span className={`text-xs ${mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            (Pumps: {tankProducts[tankNumber].pumpNumbers?.join(', ') || 'None'})
                          </span>
                        </div>
                      ) : (
                        <span className={mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          No product assigned
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;