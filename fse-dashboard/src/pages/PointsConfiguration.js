import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, TextField, IconButton, Chip, 
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress, Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveIcon from '@mui/icons-material/Save';
import { BRAND } from '../theme';

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

export default function PointsConfiguration() {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 🔥 NEW: Filter state
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  
  // 🔥 NEW: Collections and columns
  const [collections, setCollections] = useState([]);
  const [collectionColumns, setCollectionColumns] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [availableTiers, setAvailableTiers] = useState([]);
  const [availableMappedValues, setAvailableMappedValues] = useState([]);
  
  // Modal state
  const [editModal, setEditModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  
  // Expanded products (for complex products)
  const [expanded, setExpanded] = useState({});
  
  // Form state
  const [formData, setFormData] = useState({
    productName: '',
    productType: 'simple',
    simplePoints: 0,
    month: '',
    year: null,
    collectionName: '',
    fieldMapping: {
      productField: 'formFillingFor',
      planField: '',
      tierField: '',
      priceField: '',
      mappedColumn: ''
    },
    plans: [],
    valueMapping: []
  });

  // 🔥 NEW: Load collections on mount
  const loadCollections = async () => {
    try {
      const res = await fetch(`${EMP_API}/points-config/collections`);
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  };

  // 🔥 NEW: Load columns when collection selected
  const loadCollectionColumns = async (collectionName) => {
    if (!collectionName) {
      setCollectionColumns([]);
      return;
    }
    
    try {
      const res = await fetch(`${EMP_API}/points-config/collection-columns/${collectionName}`);
      if (res.ok) {
        const data = await res.json();
        setCollectionColumns(data.columns || []);
      }
    } catch (err) {
      console.error('Failed to load columns:', err);
      setCollectionColumns([]);
    }
  };

  // Load configurations with filters
  const loadConfigs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      
      const res = await fetch(`${EMP_API}/points-config?${params}`);
      if (!res.ok) throw new Error('Failed to load configurations');
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
    loadConfigs();
  }, []);

  // Fetch distinct values for Plan and Tier dropdowns
  useEffect(() => {
    const fetchDistinctValues = async (collection, field, setter) => {
      if (!collection || !field) {
        setter([]);
        return;
      }
      try {
        const res = await fetch(`${EMP_API}/points-config/distinct-values/${collection}/${field}`);
        if (res.ok) {
          const data = await res.json();
          setter(data.values || []);
        }
      } catch (err) {
        console.error('Failed to fetch distinct values:', err);
        setter([]);
      }
    };

    // We no longer fetch availableProducts since Product Field is removed
    
    if (formData.productType === 'mapped' && formData.collectionName && formData.fieldMapping?.mappedColumn) {
      fetchDistinctValues(formData.collectionName, formData.fieldMapping.mappedColumn, setAvailableMappedValues);
    } else {
      setAvailableMappedValues([]);
    }
  }, [
    formData.collectionName, 
    formData.fieldMapping?.productField, 
    formData.fieldMapping?.planField, 
    formData.fieldMapping?.tierField, 
    formData.fieldMapping?.mappedColumn,
    formData.productType
  ]);

  // Reload when filters change
  useEffect(() => {
    loadConfigs();
  }, [filterMonth, filterYear]);

  // Handle create new
  const handleCreate = () => {
    setSelectedConfig(null);
    setFormData({
      productName: '',
      productType: 'simple',
      simplePoints: 0,
      month: filterMonth || '',
      year: filterYear || null,
      collectionName: '',
      fieldMapping: {
        productField: 'formFillingFor',
        planField: '',
        tierField: '',
        priceField: ''
      },
      plans: []
    });
    setCollectionColumns([]);
    setEditModal(true);
  };

  // Handle edit existing
  const handleEdit = (config) => {
    setSelectedConfig(config);
    setFormData({
      productName: config.productName,
      productType: config.productType,
      simplePoints: config.simplePoints || 0,
      month: config.month || '',
      year: config.year || null,
      collectionName: config.collectionName || '',
      fieldMapping: config.fieldMapping || {
        productField: 'formFillingFor',
        planField: '',
        tierField: '',
        priceField: ''
      },
      plans: config.plans || []
    });
    
    // Load columns for selected collection
    if (config.collectionName) {
      loadCollectionColumns(config.collectionName);
    }
    
    setEditModal(true);
  };

  // Handle save
  const handleSave = async () => {
    try {
      const res = await fetch(`${EMP_API}/points-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          updatedBy: localStorage.getItem('userEmail') || 'admin'
        })
      });

      if (!res.ok) throw new Error('Failed to save configuration');

      setSuccess(selectedConfig ? 'Configuration updated successfully' : 'Configuration created successfully');
      setEditModal(false);
      loadConfigs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle delete
  const handleDelete = (config) => {
    setSelectedConfig(config);
    setDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`${EMP_API}/points-config/${selectedConfig._id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete configuration');

      setSuccess('Configuration deleted successfully');
      setDeleteDialog(false);
      loadConfigs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Add plan to complex product
  const addPlan = () => {
    setFormData({
      ...formData,
      plans: [...formData.plans, { planName: '', tiers: [] }]
    });
  };

  // Remove plan
  const removePlan = (index) => {
    setFormData({
      ...formData,
      plans: formData.plans.filter((_, i) => i !== index)
    });
  };

  // Update plan name
  const updatePlanName = (index, name) => {
    const newPlans = [...formData.plans];
    newPlans[index].planName = name;
    setFormData({ ...formData, plans: newPlans });
  };

  // Add tier to plan
  const addTier = (planIndex) => {
    const newPlans = [...formData.plans];
    newPlans[planIndex].tiers.push({ name: '', price: 0, points: 0 });
    setFormData({ ...formData, plans: newPlans });
  };

  // Remove tier
  const removeTier = (planIndex, tierIndex) => {
    const newPlans = [...formData.plans];
    newPlans[planIndex].tiers = newPlans[planIndex].tiers.filter((_, i) => i !== tierIndex);
    setFormData({ ...formData, plans: newPlans });
  };

  // Update tier
  const updateTier = (planIndex, tierIndex, field, value) => {
    const newPlans = [...formData.plans];
    newPlans[planIndex].tiers[tierIndex][field] = value;
    setFormData({ ...formData, plans: newPlans });
  };

  // Toggle expanded
  const toggleExpanded = (productName) => {
    setExpanded({ ...expanded, [productName]: !expanded[productName] });
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>
            ⚙️ Points Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage product points and variants
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={handleCreate}
          sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}
        >
          Add Product
        </Button>
      </Box>

      {/* 🔥 NEW: Month/Year Filters */}
      <Card sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            label="Month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Months</MenuItem>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
              <MenuItem key={month} value={month}>{month}</MenuItem>
            ))}
          </TextField>

          <TextField
            type="number"
            label="Year"
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            size="small"
            sx={{ minWidth: 120 }}
          />

          <Typography variant="caption" color="text.secondary">
            {filterMonth || filterYear ? `Showing configs for ${filterMonth || 'all months'} ${filterYear || ''}` : 'Showing all configs'}
          </Typography>
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Configurations List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BRAND.primary }} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {configs.map((config) => (
            <Card key={config._id} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {config.productName}
                  </Typography>
                  <Chip 
                    label={config.productType === 'simple' ? 'Simple' : 'Complex'}
                    size="small"
                    sx={{ 
                      bgcolor: config.productType === 'simple' ? '#e3f2fd' : '#fff3e0',
                      color: config.productType === 'simple' ? '#1565c0' : '#e65100',
                      fontWeight: 600 
                    }}
                  />
                  {config.productType === 'simple' && (
                    <Chip 
                      label={`${config.simplePoints} points`}
                      size="small"
                      sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {config.productType === 'complex' && (
                    <IconButton 
                      size="small" 
                      onClick={() => toggleExpanded(config.productName)}
                      sx={{ color: BRAND.primary }}
                    >
                      {expanded[config.productName] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => handleEdit(config)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(config)} sx={{ color: '#d32f2f' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Complex product details */}
              {config.productType === 'complex' && (
                <Collapse in={expanded[config.productName]}>
                  <Box sx={{ mt: 2, pl: 2, borderLeft: '3px solid #e0e0e0' }}>
                    {config.plans.map((plan, planIdx) => (
                      <Box key={planIdx} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: BRAND.primary }}>
                          📦 {plan.planName}
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Tier</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Points</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {plan.tiers.map((tier, tierIdx) => (
                                <TableRow key={tierIdx}>
                                  <TableCell>{tier.name}</TableCell>
                                  <TableCell>₹{tier.price?.toLocaleString('en-IN') || 0}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={`${tier.points} pts`}
                                      size="small"
                                      sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              )}
            </Card>
          ))}

          {configs.length === 0 && (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No product configurations yet. Click "Add Product" to create one.
              </Typography>
            </Card>
          )}
        </Box>
      )}

      {/* Edit/Create Modal */}
      <Dialog open={editModal} onClose={() => setEditModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 800 }}>
          {selectedConfig ? 'Edit Product Configuration' : 'Create Product Configuration'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 🔥 NEW: Month/Year/Collection */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="Month (Optional)"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
                helperText="Leave empty to apply to all months"
              >
                <MenuItem value="">All Months</MenuItem>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                  <MenuItem key={month} value={month}>{month}</MenuItem>
                ))}
              </TextField>

              <TextField
                type="number"
                label="Year (Optional)"
                value={formData.year || ''}
                onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : null })}
                size="small"
                sx={{ flex: 1 }}
                helperText="Leave empty to apply to all years"
              />
            </Box>

            <TextField
              select
              label="Collection/Sheet (Optional)"
              value={formData.collectionName}
              onChange={(e) => {
                setFormData({ ...formData, collectionName: e.target.value });
                loadCollectionColumns(e.target.value);
              }}
              size="small"
              fullWidth
              helperText="Select the Google Sheet/collection that contains this product data"
            >
              <MenuItem value="">No Collection</MenuItem>
              {collections.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Product Type"
              value={formData.productType}
              onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
              fullWidth
            >
              <MenuItem value="simple">Simple (Flat Points)</MenuItem>
              <MenuItem value="mapped">Mapped (Column-based Points)</MenuItem>
            </TextField>

            {/* 🔥 FIELD MAPPING IS ONLY FOR MAPPED NOW */}
            {formData.collectionName && formData.productType === 'mapped' && (
              <Card sx={{ p: 2, bgcolor: '#f9fafb', border: '2px dashed #e0e0e0' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: BRAND.primary }}>
                  📋 Field Mapping (Select columns to auto-fetch database values)
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    select
                    label="Points Column"
                    value={formData.fieldMapping.mappedColumn || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      fieldMapping: { ...formData.fieldMapping, mappedColumn: e.target.value }
                    })}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: '#f0fdf4' }}
                    helperText="Which column dictates the points? (e.g. 'amount')"
                  >
                    <MenuItem value="">Select Column</MenuItem>
                    {collectionColumns.map(col => (
                      <MenuItem key={col} value={col}>{col}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Card>
            )}

            <TextField
              label="Product Name"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              disabled={!!selectedConfig}
              fullWidth
              helperText="Type the exact product name here (e.g. 'Tide MSME'). This is case-insensitive!"
            />

            {formData.productType === 'simple' && (
              <TextField
                label="Points"
                type="number"
                value={formData.simplePoints}
                onChange={(e) => setFormData({ ...formData, simplePoints: parseFloat(e.target.value) || 0 })}
                fullWidth
              />
            )}

            {formData.productType === 'mapped' && (
              <Card sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                  Assign Points to Values
                </Typography>
                
                {availableMappedValues.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Please map the 'Points Column' above to see values.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {availableMappedValues.map(val => {
                      const mapping = formData.valueMapping?.find(m => m.value === val);
                      const points = mapping ? mapping.points : 0;
                      return (
                        <Box key={val} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{val}</Typography>
                          <TextField
                            label="Points"
                            type="number"
                            value={points}
                            onChange={(e) => {
                              const newPoints = parseFloat(e.target.value) || 0;
                              const newMapping = [...(formData.valueMapping || [])];
                              const idx = newMapping.findIndex(m => m.value === val);
                              if (idx >= 0) {
                                newMapping[idx].points = newPoints;
                              } else {
                                newMapping.push({ value: val, points: newPoints });
                              }
                              setFormData({ ...formData, valueMapping: newMapping });
                            }}
                            size="small"
                            sx={{ width: 120 }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditModal(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />} sx={{ bgcolor: BRAND.primary }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the configuration for <strong>{selectedConfig?.productName}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
