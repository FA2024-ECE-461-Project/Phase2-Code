// src/components/layout/Footer.jsx
import React from 'react';
import { Typography, Box } from '@mui/material';

const Footer = () => {
  return (
    <Box sx={{ bgcolor: 'background.paper', p: 6 }} component="footer">
      <Typography variant="subtitle1" align="center" color="text.secondary" component="p">
        © {new Date().getFullYear()} Trustworthy Module Registry. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
