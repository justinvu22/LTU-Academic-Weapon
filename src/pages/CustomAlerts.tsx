import React, { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { styled } from '@mui/material/styles';

// Styled components for dark, minimal, professional look
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: '#1E1E1E',
  color: '#FFFFFF',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  border: 'none',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#333',
    },
    '&:hover fieldset': {
      borderColor: '#555',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiInputLabel-root': {
    color: '#BBB',
  },
  '& .MuiInputBase-input': {
    color: '#FFFFFF',
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#FFFFFF',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#333',
    },
    '&:hover fieldset': {
      borderColor: '#555',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiInputLabel-root': {
    color: '#BBB',
  },
  '& .MuiSelect-icon': {
    color: '#BBB',
  },
  '& .MuiSelect-select': {
    color: '#FFFFFF',
  },
}));

const CustomAlerts: React.FC = () => {
  const [alertName, setAlertName] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState([{ metric: '', operator: '', value: '' }]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleAddCondition = () => {
    setConditions([...conditions, { metric: '', operator: '', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
  };

  const handleConditionChange = (index: number, field: string, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!alertName) newErrors.alertName = 'Alert name is required';
    if (!description) newErrors.description = 'Description is required';
    conditions.forEach((condition, index) => {
      if (!condition.metric) newErrors[`metric${index}`] = 'Metric is required';
      if (!condition.operator) newErrors[`operator${index}`] = 'Operator is required';
      if (!condition.value) newErrors[`value${index}`] = 'Value is required';
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Handle form submission logic here
    console.log({ alertName, description, conditions });
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#121212', minHeight: '100vh', fontFamily: '"IBM Plex Sans", "Inter", sans-serif' }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#FFFFFF', fontWeight: 500 }}>
        Custom Alerts
      </Typography>
      <StyledPaper>
        <form onSubmit={handleSubmit}>
          <Box mb={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{
                width: 4,
                height: 28,
                bgcolor: 'primary.main',
                borderRadius: 2,
                mr: 1.5,
              }} />
              <Typography variant="subtitle1" sx={{ color: '#FFF', fontWeight: 600, letterSpacing: 0.5 }}>
                Alert Details
              </Typography>
            </Box>
            <StyledTextField
              fullWidth
              label="Alert Name"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              error={!!errors.alertName}
              helperText={errors.alertName}
              margin="normal"
            />
            <StyledTextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              margin="normal"
              multiline
              rows={4}
              sx={{ mt: 2 }}
            />
          </Box>
          <Box mb={4}>
            <Typography variant="h6" gutterBottom sx={{ color: '#FFFFFF', fontWeight: 500 }}>
              Conditions
            </Typography>
            {conditions.map((condition, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StyledFormControl fullWidth sx={{ mr: 1 }}>
                  <InputLabel>Metric</InputLabel>
                  <Select
                    value={condition.metric}
                    onChange={(e) => handleConditionChange(index, 'metric', e.target.value)}
                    error={!!errors[`metric${index}`]}
                  >
                    <MenuItem value="cpu">CPU Usage</MenuItem>
                    <MenuItem value="memory">Memory Usage</MenuItem>
                    <MenuItem value="disk">Disk Usage</MenuItem>
                  </Select>
                  {errors[`metric${index}`] && <FormHelperText error>{errors[`metric${index}`]}</FormHelperText>}
                </StyledFormControl>
                <StyledFormControl fullWidth sx={{ mr: 1 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={condition.operator}
                    onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                    error={!!errors[`operator${index}`]}
                  >
                    <MenuItem value=">">Greater Than</MenuItem>
                    <MenuItem value="<">Less Than</MenuItem>
                    <MenuItem value="=">Equals</MenuItem>
                  </Select>
                  {errors[`operator${index}`] && <FormHelperText error>{errors[`operator${index}`]}</FormHelperText>}
                </StyledFormControl>
                <StyledTextField
                  fullWidth
                  label="Value"
                  value={condition.value}
                  onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                  error={!!errors[`value${index}`]}
                  helperText={errors[`value${index}`]}
                  sx={{ mr: 1 }}
                />
                <StyledIconButton onClick={() => handleRemoveCondition(index)}>
                  <RemoveIcon />
                </StyledIconButton>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <StyledIconButton onClick={handleAddCondition}>
                <AddIcon />
              </StyledIconButton>
            </Box>
          </Box>
          <Box>
            <StyledButton type="submit" variant="contained" fullWidth>
              Create Alert
            </StyledButton>
          </Box>
        </form>
      </StyledPaper>
    </Box>
  );
};

export default CustomAlerts; 