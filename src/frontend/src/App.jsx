// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Removed BrowserRouter alias
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import UpdatePage from './pages/UpdatePage';
import PackageDetailsPage from './pages/PackageDetailsPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/common/ProtectedRoute';

const App = () => {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/update"
            element={
              <ProtectedRoute>
                <UpdatePage />
              </ProtectedRoute>
            }
          />
          <Route path="/package/:id" element={<PackageDetailsPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          {/* Add more routes as needed */}
        </Routes>
      </main>
      <Footer />
    </>
  );
};

export default App;
