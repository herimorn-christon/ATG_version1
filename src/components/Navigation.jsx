import React from 'react';
import { useSelector } from 'react-redux';
import DailyReport from './DailyReport';
import ProductManager from './ProductManager';
import UserManagement from './UserManagement';
import { Users } from 'lucide-react';

const Navigation = () => {
  const { user } = useSelector((state) => state.auth);
  console.log('User in Navigation:', user);
  const { mode } = useSelector((state) => state.theme);

  return (
    <div className="flex items-center space-x-4">
      <DailyReport />
      <ProductManager />
      
      {/* Only show User Management to admin and manager roles */}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <UserManagement />
      )}
    </div>
  );
};

export default Navigation;