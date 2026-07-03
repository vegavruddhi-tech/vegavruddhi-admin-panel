import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Box, Typography, Card, CardContent, CircularProgress, Chip,
  Tooltip, IconButton, Button, Alert, Popover
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import { BRAND } from '../theme';

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

// Status colors
const STATUS_COLORS = {
  'Fully Verified': { bg: '#e6f4ea', color: '#2e7d32' },
  'Partially Done': { bg: '#fff8e1', color: '#f57f17' },
  'Not Verified':   { bg: '#fdecea', color: '#c62828' },
  'Not Found':      { bg: '#f5f5f5', color: '#888' },
};

/**
 * TideMerchantTimeline Component
 * Shows month-by-month verification status and Priority Pass Pro status for a Tide merchant
 */
function TideMerchantTimeline({ phone, customerName }) {
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const fetchTimeline = async () => {
    if (timeline) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching timeline for:', phone, customerName);
      console.log('📡 API URL:', `${EMP_API}/tide/merchant-timeline`);
      
      const url = `${EMP_API}/tide/merchant-timeline?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(customerName)}`;
      console.log('🌐 Full URL:', url);
      
      const res = await fetch(url);
      console.log('📥 Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('✅ Timeline data received:', data);
      
      setTimeline(data);
      const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
      setSelectedMonth(currentMonthName);
    } catch (err) {
      console.error('❌ Timeline fetch error:', err);
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  const toggleTimeline = (e) => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (newExpanded && e && e.currentTarget) {
      setAnchorEl(e.currentTarget);
    } else {
      setAnchorEl(null);
    }
    
    if (newExpanded && !timeline) {
      fetchTimeline();
    }
  };

  const currentMonthIndex = new Date().getMonth();
  const selectedMonthData = timeline?.timeline?.find(m => m.month === selectedMonth);

  return (
    <>
      <Tooltip title="Show Month-by-Month Timeline" placement="left">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            toggleTimeline(e);
          }}
          sx={{
            color: '#1565c0',
            bgcolor: '#e3f2fd',
            border: `1.5px solid #1565c0`,
            '&:hover': {
              bgcolor: '#bbdefb',
              transform: 'scale(1.05)'
            },
            transition: 'all 0.2s'
          }}
        >
          <TimelineIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(expanded && anchorEl)}
        anchorEl={anchorEl}
        onClose={(e) => {
          if (e) e.stopPropagation();
          setExpanded(false);
          setAnchorEl(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            onClick: (e) => e.stopPropagation(),
            sx: {
              width: { xs: '92vw', sm: 680 },
              maxHeight: '82vh',
              overflow: 'auto',
              border: `2.5px solid ${BRAND.primary}`,
              borderRadius: 3,
              bgcolor: '#ffffff',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              zIndex: 100000
            }
          }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={(e) => {
              if (e) e.stopPropagation();
              setExpanded(false);
              setAnchorEl(null);
            }}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.2)',
              zIndex: 10,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
            }}
          >
            ✕
          </IconButton>
          
          <Box sx={{
            background: `linear-gradient(135deg, ${BRAND.primary}dd, ${BRAND.primary}88)`,
            px: 2.5,
            py: 1.5,
            color: '#fff'
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: '#fff' }}>
              🌊 Tide Month-by-Month Status
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
              Merchant: <strong>{customerName || phone}</strong> ({phone})
            </Typography>
          </Box>

          <Box sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={36} sx={{ color: BRAND.primary }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Scanning 12 months of Tide verifications...
                </Typography>
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
                <Box sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" color="error" onClick={fetchTimeline}>
                    Retry
                  </Button>
                </Box>
              </Alert>
            ) : !timeline ? null : (
              <Box>
                {/* Month Selector Pills */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 0.8, 
                  overflowX: 'auto', 
                  pb: 1.5, 
                  mb: 2,
                  borderBottom: '1.5px solid #eaeaea',
                  '::-webkit-scrollbar': { height: 4 }
                }}>
                  {timeline.timeline.map((month, idx) => {
                    const isCurrentMonth = idx === currentMonthIndex;
                    const isSelected = selectedMonth === month.month;
                    const status = month.status || 'Not Found';
                    const sCol = STATUS_COLORS[status] || STATUS_COLORS['Not Found'];

                    return (
                      <Chip
                        key={month.monthKey || month.month}
                        label={month.month.slice(0, 3)}
                        onClick={() => setSelectedMonth(month.month)}
                        sx={{
                          fontWeight: isSelected ? 800 : 600,
                          bgcolor: isSelected ? BRAND.primary : sCol.bg,
                          color: isSelected ? '#ffffff' : sCol.color,
                          border: isSelected ? `2px solid ${BRAND.primary}` : `1px solid ${sCol.color}44`,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: isSelected ? BRAND.primary : `${sCol.bg}cc`,
                            transform: 'translateY(-1px)'
                          }
                        }}
                      />
                    );
                  })}
                </Box>

                {/* Selected Month Details */}
                {selectedMonthData && (
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: '#fafafa', 
                    border: '1px solid #eaeaea' 
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.primary }}>
                        {selectedMonthData.month} 2026
                      </Typography>
                      <Chip 
                        label={selectedMonthData.status}
                        size="small"
                        sx={{ 
                          fontWeight: 700,
                          bgcolor: (STATUS_COLORS[selectedMonthData.status] || STATUS_COLORS['Not Found']).bg,
                          color: (STATUS_COLORS[selectedMonthData.status] || STATUS_COLORS['Not Found']).color
                        }}
                      />
                    </Box>

                    {selectedMonthData.hasData ? (
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 2 }}>
                        {selectedMonthData.merchantName && (
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Merchant Name
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {selectedMonthData.merchantName}
                          </Typography>
                        </Box>
                      )}

                      {selectedMonthData.location && (
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Location
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            📍 {selectedMonthData.location}
                          </Typography>
                        </Box>
                      )}

                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                          Priority Pass Pro
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: selectedMonthData.priorityPass === 'Active' ? '#2e7d32' : '#c62828' }}>
                          {selectedMonthData.priorityPass === 'Active' ? '✅ Active' : selectedMonthData.priorityPass || '❌ Not Active'}
                        </Typography>
                      </Box>

                      {selectedMonthData.lastUpdated && (
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Last Updated
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {new Date(selectedMonthData.lastUpdated).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </Box>
                      )}

                      {selectedMonthData.verification?.checks && selectedMonthData.verification.checks.length > 0 && (
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                            Verification Checks
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                            {selectedMonthData.verification.checks.map((check, idx) => (
                              <Box key={idx} sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                p: 1,
                                bgcolor: check.pass ? '#e6f4ea' : '#fdecea',
                                borderRadius: 1,
                                border: `1px solid ${check.pass ? '#2e7d32' : '#c62828'}30`
                              }}>
                                <Box sx={{ 
                                  width: 20, 
                                  height: 20, 
                                  borderRadius: '50%', 
                                  bgcolor: check.pass ? '#2e7d32' : '#c62828',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  flexShrink: 0
                                }}>
                                  {check.pass ? '✓' : '✗'}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                                    {check.label}
                                  </Typography>
                                  {check.actual && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                      Value: {check.actual}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      No data found for {selectedMonthData.month} 2026. This merchant may not have been active in this month.
                    </Alert>
                  )}

                  {selectedMonthData.verification?.collection && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, pt: 1.5, borderTop: '1px solid #e0e0e0' }}>
                      📂 Data source: {selectedMonthData.verification.collection} ({selectedMonthData.verification.matchType || 'exact'} match)
                    </Typography>
                  )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
}

export default TideMerchantTimeline;
