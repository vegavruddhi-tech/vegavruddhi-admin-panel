import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

export default function FormBuilder() {
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState({ brands: [] });
  
  useEffect(() => {
    fetchConfig();
  }, []);
  
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${EMP_API}/form-config`);
      if (!res.ok) throw new Error('Failed to fetch configuration');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // deeply clone config.brands and process options before saving
      const payloadBrands = JSON.parse(JSON.stringify(config.brands));
      payloadBrands.forEach(b => {
        if (b.fields) {
          b.fields.forEach(f => {
            if (typeof f.options === 'string') f.options = f.options.split(',').map(s => s.trim()).filter(s => s);
          });
        }
        if (b.products) {
          b.products.forEach(p => {
            p.fields.forEach(f => {
              if (typeof f.options === 'string') f.options = f.options.split(',').map(s => s.trim()).filter(s => s);
            });
          });
        }
      });

      const res = await fetch(`${EMP_API}/form-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ brands: payloadBrands })
      });
      
      if (!res.ok) throw new Error('Failed to save configuration');
      setSuccess('Form configuration saved successfully! It will instantly update across Employee, TL, and Manager apps.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  // Brand Level Actions
  const addBrand = () => {
    const newBrand = { name: 'New Brand', hasSubProducts: false, products: [], fields: [] };
    setConfig({ ...config, brands: [...config.brands, newBrand] });
  };
  
  const updateBrand = (bIdx, key, val) => {
    const newBrands = [...config.brands];
    newBrands[bIdx][key] = val;
    setConfig({ ...config, brands: newBrands });
  };
  
  const removeBrand = (bIdx) => {
    if (!window.confirm('Are you sure you want to remove this brand?')) return;
    const newBrands = [...config.brands];
    newBrands.splice(bIdx, 1);
    setConfig({ ...config, brands: newBrands });
  };
  
  // Product Level Actions
  const addProduct = (bIdx) => {
    const newBrands = [...config.brands];
    newBrands[bIdx].products.push({ name: 'New Product', fields: [] });
    newBrands[bIdx].hasSubProducts = true;
    setConfig({ ...config, brands: newBrands });
  };
  
  const updateProduct = (bIdx, pIdx, name) => {
    const newBrands = [...config.brands];
    newBrands[bIdx].products[pIdx].name = name;
    setConfig({ ...config, brands: newBrands });
  };
  
  const removeProduct = (bIdx, pIdx) => {
    if (!window.confirm('Are you sure you want to remove this product?')) return;
    const newBrands = [...config.brands];
    newBrands[bIdx].products.splice(pIdx, 1);
    if (newBrands[bIdx].products.length === 0) {
      newBrands[bIdx].hasSubProducts = false;
    }
    setConfig({ ...config, brands: newBrands });
  };
  
  // Field Level Actions
  const addField = (bIdx, pIdx) => {
    const newBrands = [...config.brands];
    const newField = { name: 'new_field', label: 'New Field', type: 'text', options: [] };
    
    if (pIdx === null) {
      // Add to brand
      newBrands[bIdx].fields.push(newField);
    } else {
      // Add to product
      newBrands[bIdx].products[pIdx].fields.push(newField);
    }
    
    setConfig({ ...config, brands: newBrands });
  };
  
  const updateField = (bIdx, pIdx, fIdx, key, val) => {
    const newBrands = [...config.brands];
    let field;
    
    if (pIdx === null) field = newBrands[bIdx].fields[fIdx];
    else field = newBrands[bIdx].products[pIdx].fields[fIdx];
    
    if (key === 'options') {
      field[key] = val; // keep as string while typing
    } else {
      field[key] = val;
    }
    
    setConfig({ ...config, brands: newBrands });
  };
  
  const removeField = (bIdx, pIdx, fIdx) => {
    if (!window.confirm('Are you sure you want to remove this field?')) return;
    const newBrands = [...config.brands];
    
    if (pIdx === null) newBrands[bIdx].fields.splice(fIdx, 1);
    else newBrands[bIdx].products[pIdx].fields.splice(fIdx, 1);
    
    setConfig({ ...config, brands: newBrands });
  };
  
  const renderFieldEditor = (field, bIdx, pIdx, fIdx) => (
    <div key={fIdx} style={{ background: '#f5f7f5', padding: 12, borderRadius: 8, marginBottom: 8, border: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 150px' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' }}>Database Key (no spaces)</label>
        <input 
          type="text" 
          value={field.name} 
          onChange={(e) => updateField(bIdx, pIdx, fIdx, 'name', e.target.value)}
          style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }}
        />
      </div>
      <div style={{ flex: '1 1 150px' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' }}>UI Label</label>
        <input 
          type="text" 
          value={field.label} 
          onChange={(e) => updateField(bIdx, pIdx, fIdx, 'label', e.target.value)}
          style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }}
        />
      </div>
      <div style={{ flex: '1 1 100px' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' }}>Type</label>
        <select 
          value={field.type} 
          onChange={(e) => updateField(bIdx, pIdx, fIdx, 'type', e.target.value)}
          style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }}
        >
          <option value="text">Text Input</option>
          <option value="radio">Radio Buttons</option>
          <option value="checkbox">Checkbox</option>
        </select>
      </div>
      {field.type === 'radio' && (
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' }}>Options (comma separated)</label>
          <input 
            type="text" 
            value={Array.isArray(field.options) ? field.options.join(', ') : (field.options || '')} 
            onChange={(e) => updateField(bIdx, pIdx, fIdx, 'options', e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }}
            placeholder="Yes, No"
          />
        </div>
      )}
      <button 
        onClick={() => removeField(bIdx, pIdx, fIdx)}
        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 13, alignSelf: 'flex-end', height: 32 }}
      >
        Remove
      </button>
    </div>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--primary, #1a4731)', mb: 0.5 }}>Dynamic Form Builder</Typography>
          <Typography variant="body2" color="text.secondary">Configure the Merchant Visit Form for Employees, TLs, and Managers</Typography>
        </Box>
        <Button 
          onClick={handleSave}
          disabled={saving || loading}
          variant="contained"
          sx={{ bgcolor: 'var(--primary, #1a4731)', fontWeight: 700, borderRadius: 2 }}
        >
          {saving ? 'Saving...' : '💾 Save Form Layout'}
        </Button>
      </Box>
      
      {error && <Box sx={{ bgcolor: '#fef2f2', color: '#b91c1c', p: 1.5, borderRadius: 2, mb: 3, border: '1px solid #fca5a5' }}>{error}</Box>}
      {success && <Box sx={{ bgcolor: '#f0fdf4', color: '#15803d', p: 1.5, borderRadius: 2, mb: 3, border: '1px solid #86efac' }}>{success}</Box>}
      
      {loading ? (
        <Box sx={{ textAlign: 'center', p: 5, color: 'text.secondary' }}>Loading form configuration...</Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {config.brands.map((brand, bIdx) => (
            <Box key={bIdx} sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              
              {/* Brand Header */}
              <Box sx={{ bgcolor: '#f8fafc', p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                  <span style={{ fontSize: 20 }}>🏷️</span>
                  <input 
                    type="text" 
                    value={brand.name} 
                    onChange={(e) => updateBrand(bIdx, 'name', e.target.value)}
                    style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', background: 'transparent', border: '1px solid transparent', padding: '4px 8px', borderRadius: 4, width: '100%', maxWidth: '300px' }}
                    placeholder="Brand Name"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={brand.hasSubProducts} 
                      onChange={(e) => updateBrand(bIdx, 'hasSubProducts', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    Has Sub-Products
                  </label>
                  <Button size="small" onClick={() => removeBrand(bIdx)} sx={{ color: '#ef4444', border: '1px solid #fca5a5', textTransform: 'none', fontWeight: 600 }}>Delete Brand</Button>
                </Box>
              </Box>
              
              <Box sx={{ p: 2.5 }}>
                {/* If Brand has no sub-products, show fields directly */}
                {!brand.hasSubProducts && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569' }}>Brand Specific Fields</Typography>
                      <Button size="small" onClick={() => addField(bIdx, null)} sx={{ bgcolor: '#f1f5f9', color: '#475569', textTransform: 'none', fontWeight: 600 }}>+ Add Field</Button>
                    </Box>
                    {brand.fields?.length === 0 ? (
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', py: 1 }}>No fields added yet.</Typography>
                    ) : (
                      brand.fields?.map((f, fIdx) => renderFieldEditor(f, bIdx, null, fIdx))
                    )}
                  </Box>
                )}
                
                {/* If Brand has sub-products, show products */}
                {brand.hasSubProducts && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#334155' }}>Sub-Products</Typography>
                      <Button size="small" onClick={() => addProduct(bIdx)} sx={{ bgcolor: '#e0e7ff', color: '#4338ca', textTransform: 'none', fontWeight: 600 }}>+ Add Product</Button>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {brand.products?.map((prod, pIdx) => (
                        <Box key={pIdx} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <Box sx={{ bgcolor: '#f8fafc', p: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 1 }}>
                            <input 
                              type="text" 
                              value={prod.name} 
                              onChange={(e) => updateProduct(bIdx, pIdx, e.target.value)}
                              style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', background: 'transparent', border: '1px solid transparent', padding: '2px 8px', borderRadius: 4, width: '250px' }}
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button size="small" onClick={() => addField(bIdx, pIdx)} sx={{ bgcolor: '#f1f5f9', color: '#475569', textTransform: 'none', fontWeight: 600 }}>+ Add Field</Button>
                              <Button size="small" onClick={() => removeProduct(bIdx, pIdx)} sx={{ color: '#ef4444', minWidth: 32 }}>✖</Button>
                            </Box>
                          </Box>
                          <Box sx={{ p: 1.5 }}>
                            {prod.fields?.length === 0 ? (
                              <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>No fields.</Typography>
                            ) : (
                              prod.fields?.map((f, fIdx) => renderFieldEditor(f, bIdx, pIdx, fIdx))
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
          
          <Button 
            onClick={addBrand}
            sx={{ bgcolor: '#fff', border: '2px dashed #cbd5e1', color: '#64748b', p: 2.5, borderRadius: 3, fontWeight: 600, fontSize: 16, textTransform: 'none' }}
          >
            + Add New Brand
          </Button>
          
        </Box>
      )}
    </Box>
  );
}
