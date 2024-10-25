// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const { status, error, token } = auth;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  if (token) {
    navigate('/');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(login({ username, password })).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Failed to login:', err);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Login
      </Typography>
      <form onSubmit={handleSubmit}>
        <InputField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <InputField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={status === 'loading'} sx={{ mt: 2 }}>
          {status === 'loading' ? <CircularProgress size={24} /> : 'Login'}
        </Button>
      </form>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
};

export default LoginPage;
