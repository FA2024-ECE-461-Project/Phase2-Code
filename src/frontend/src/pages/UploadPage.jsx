// src/pages/UploadPage.jsx
import React, { useState } from 'react';
import Button from '../components/common/Button';
import InputField from '../components/common/InputField';
import { useDispatch, useSelector } from 'react-redux';
import { addPackage } from '../store/packagesSlice';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Alert, Box, Typography } from '@mui/material';

const UploadPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.packages);

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [debloat, setDebloat] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleDebloatChange = (e) => {
    setDebloat(e.target.checked);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a package file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('package', file);
    formData.append('debloat', debloat);

    try {
      await dispatch(addPackage(formData)).unwrap();
      setMessage('Package uploaded successfully!');
      navigate('/');
    } catch (err) {
      console.error('Failed to upload package:', err);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Package
      </Typography>
      <input
        type="file"
        accept=".zip"
        onChange={handleFileChange}
        aria-label="Upload Package"
        style={{ marginTop: '1rem' }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
        <input
          type="checkbox"
          id="debloat"
          checked={debloat}
          onChange={handleDebloatChange}
        />
        <label htmlFor="debloat" style={{ marginLeft: '0.5rem' }}>
          Debloat Package
        </label>
      </Box>
      <Button onClick={handleUpload} disabled={status === 'loading'} sx={{ mt: 2 }}>
        {status === 'loading' ? <CircularProgress size={24} /> : 'Upload'}
      </Button>
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
};

export default UploadPage;
