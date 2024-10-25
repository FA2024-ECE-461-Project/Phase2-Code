// src/components/common/ProtectedRoute.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, roles }) => {
  const auth = useSelector((state) => state.auth);
  const { token, user } = auth;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
