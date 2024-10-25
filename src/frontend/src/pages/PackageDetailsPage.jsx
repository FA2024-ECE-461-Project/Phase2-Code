// src/pages/PackageDetailsPage.jsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
// import { getPackageDetails } from '../store/packagesSlice';
import {
  CircularProgress,
  Alert,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

const PackageDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentPackage, status, error } = useSelector((state) => state.packages);

  useEffect(() => {
    dispatch(getPackageDetails(id));
  }, [dispatch, id]);

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

  if (!currentPackage) {
    return <Typography>No package found.</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {currentPackage.name} - {currentPackage.version}
      </Typography>
      <Typography variant="body1" gutterBottom>
        {currentPackage.description}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">Rating</Typography>
        <Chip label={`Net Score: ${currentPackage.rating.netScore}`} color="success" sx={{ mr: 1, mt: 1 }} />
        <Chip label={`Dependencies Pinned: ${currentPackage.rating.subScores.dependenciesPinned}`} color="primary" sx={{ mr: 1, mt: 1 }} />
        <Chip label={`Code Reviewed PRs: ${currentPackage.rating.subScores.codeReviewedPRs}`} color="primary" sx={{ mr: 1, mt: 1 }} />
        {/* Add other sub-scores as needed */}
      </Box>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Dependencies</Typography>
        <List>
          {currentPackage.dependencies.map((dep, index) => (
            <ListItem key={index}>
              <ListItemText primary={dep.name} secondary={`Version: ${dep.version}`} />
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Download</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.open(currentPackage.downloadUrl, '_blank')}
        >
          Download Package
        </Button>
      </Box>
    </Box>
  );
};

export default PackageDetailsPage;
