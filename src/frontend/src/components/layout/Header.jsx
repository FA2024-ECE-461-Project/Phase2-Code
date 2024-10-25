// src/components/layout/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';

const Header = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const { token } = auth;

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Trustworthy Module Registry
        </Typography>
        <Button color="inherit" component={Link} to="/">
          Home
        </Button>
        {token ? (
          <>
            <Button color="inherit" component={Link} to="/upload">
              Upload
            </Button>
            <Button color="inherit" component={Link} to="/update">
              Update
            </Button>
            <Button color="inherit" component={Link} to="/admin">
              Admin Dashboard
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <Button color="inherit" component={Link} to="/login">
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
