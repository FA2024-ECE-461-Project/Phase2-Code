// src/context/AuthContext.jsx
import React, { createContext, useContext } from 'react';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  // Provide authentication context without Router
  return (
    <AuthContext.Provider value={{ /* auth values */ }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
