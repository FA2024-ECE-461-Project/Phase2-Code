// src/pages/HomePage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getPackages } from '../store/packagesSlice';
import { Link } from 'react-router-dom';
import {
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Alert,
  Box,
  Typography,
  Pagination,
} from '@mui/material';

const HomePage = () => {
  const dispatch = useDispatch();
  const { items: packages, status, error } = useSelector((state) => state.packages);
  const [page, setPage] = React.useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (status === 'idle') {
      dispatch(getPackages());
    }
  }, [status, dispatch]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'failed') {
    return <Alert severity="error">{error}</Alert>;
  }

  // Pagination logic
  const paginatedPackages = packages.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(packages.length / itemsPerPage);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Available Packages
      </Typography>
      <List>
        {paginatedPackages.map((pkg) => (
          <ListItem
            key={pkg._id}
            component={Link}
            to={`/package/${pkg._id}`}
            button
            sx={{ borderBottom: '1px solid #e0e0e0' }}
          >
            <ListItemText
              primary={pkg.name}
              secondary={`Version: ${pkg.version} | Rating: ${pkg.rating.netScore}`}
            />
          </ListItem>
        ))}
      </List>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default HomePage;
