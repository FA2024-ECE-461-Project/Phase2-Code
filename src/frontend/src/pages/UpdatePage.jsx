// src/pages/HomePage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getPackages } from '../store/packagesSlice';
import { Link } from 'react-router-dom';
import { CircularProgress, List, ListItem, ListItemText, Alert } from '@mui/material';

const HomePage = () => {
  const dispatch = useDispatch();
  const { items: packages, status, error } = useSelector((state) => state.packages);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(getPackages());
    }
  }, [status, dispatch]);

  if (status === 'loading') {
    return <CircularProgress />;
  }

  if (status === 'failed') {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <div>
      <h2>Available Packages</h2>
      <List>
        {packages.map((pkg) => (
          <ListItem key={pkg._id} component={Link} to={`/package/${pkg._id}`} button>
            <ListItemText primary={pkg.name} secondary={`Version: ${pkg.version}`} />
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default HomePage;
