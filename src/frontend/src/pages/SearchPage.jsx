// src/pages/SearchPage.jsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { searchPackages } from '../store/packagesSlice';
import {
  Box,
  Typography,
  InputField,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Link } from 'react-router-dom';

const SearchPage = () => {
  const dispatch = useDispatch();
  const { searchResults, searchStatus, searchError } = useSelector((state) => state.packages);
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim() === '') return;
    dispatch(searchPackages(query));
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Search Packages
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <InputField
          label="Search by Name or README"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
        />
        <Button onClick={handleSearch} disabled={searchStatus === 'loading'}>
          {searchStatus === 'loading' ? <CircularProgress size={24} /> : 'Search'}
        </Button>
      </Box>
      {searchStatus === 'failed' && <Alert severity="error" sx={{ mt: 2 }}>{searchError}</Alert>}
      {searchResults && searchResults.length > 0 && (
        <List sx={{ mt: 4 }}>
          {searchResults.map((pkg) => (
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
      )}
      {searchResults && searchResults.length === 0 && (
        <Typography sx={{ mt: 4 }}>No packages found matching your query.</Typography>
      )}
    </Box>
  );
};

export default SearchPage;
