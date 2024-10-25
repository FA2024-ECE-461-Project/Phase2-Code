// src/components/common/InputField.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { TextField } from '@mui/material';

const InputField = ({ label, value, onChange, type, ...props }) => {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      variant="outlined"
      fullWidth
      margin="normal"
      {...props}
    />
  );
};

InputField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
};

InputField.defaultProps = {
  type: 'text',
};

export default InputField;
