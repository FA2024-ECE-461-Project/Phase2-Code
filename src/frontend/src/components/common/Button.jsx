// src/components/common/Button.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Button as MuiButton } from '@mui/material';

const Button = ({ children, onClick, variant, color, ariaLabel, ...props }) => {
  return (
    <MuiButton
      variant={variant}
      color={color}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['text', 'outlined', 'contained']),
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info']),
  ariaLabel: PropTypes.string,
};

Button.defaultProps = {
  variant: 'contained',
  color: 'primary',
  ariaLabel: '',
};

export default Button;
