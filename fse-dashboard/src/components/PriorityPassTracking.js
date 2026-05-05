import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, MenuItem, Select, FormControl,
  InputLabel
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { BRAND } from '../theme';

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

/**
 * PriorityPassTracking Component
 * Shows merchants verified in a specific month and their Priority Pass status across future months
 * Uses cached verification data for instant results
 */
function PriorityPassTracking({ open, onClose, verificationMonth, forms, globalVerifyMap }) {
  const [loading, setLoading] = useState(false);
  const [futureMonthsData, setFutureMonthsData] = useState({});
  const [filterMonth, setFilterMonth] = useState('All');
  const [error, setError] = useState(null);

  // Parse verification month
  const [verificationMonthName, verificationYear] = verificationMonth.split(' ');
  const verificationMonthIndex = new Date(`${verificationMonthName} 1, ${verificationYear}`).getMonth();
  
  // Get ALL 12 months (not just future months)
  const allMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get Tide merchants verified in the selected month using cached data
  const verifiedTideMerchants = useMemo(() => {
    const merchants = [];
    
    forms.forEach(form => {
      // Only Tide product
      const product = (form.formFillingFor || form.tideProduct || form.brand || '').toLowerCase().trim();
      if (product !== 'tide') return;
      
      // Check if fully verified using cached data
      const key = `${form.customerNumber}__tide`;
      const verificationStatus = globalVerifyMap[key]?.status;
      
      if (verificationStatus === 'Fully Verified') {
        merchants.push({
          phone: form.customerNumber,
          merchantName: form.customerName,
          location: form.location,
          employeeName: form.employeeName,
          submittedDate: form.createdAt,
          verifiedMonth: verificationMonthName
        });
      }
    });
    
    return merchants;
  }, [forms, globalVerifyMap, verificationMonthName]);

  // Fetch Priority Pass status for ALL 12 months
  useEffect(() => {
    if (open && verifiedTideMerchants.length > 0) {
      fetchAllMonthsData();
    }
  }, [open, verifiedTideMerchants.length]);

  const fetchAllMonthsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get unique phone numbers
      const phones = [...new Set(verifiedTideMerchants.map(m => m.phone))];
      
      // Fetch Priority Pass status for ALL 12 months in parallel
      const monthDataPromises = allMonths.map(async (month) => {
        const monthKey = month.toLowerCase();
        const collectionName = `tl_connect_${monthKey}`;
        
        try {
          // Fetch records for all phones in this month
          const res = await fetch(
            `${EMP_API}/tide/priority-pass-batch?phones=${phones.join(',')}&collection=${collectionName}`
          );
          
          if (!res.ok) {
            console.error(`Failed to fetch ${month} data`);
            return { month, data: {} };
          }
          
          const data = await res.json();
          return { month, data };
        } catch (err) {
          console.error(`Error fetching ${month}:`, err);
          return { month, data: {} };
        }
      });
      
      const results = await Promise.all(monthDataPromises);
      
      // Build futureMonthsData object
      const monthsData = {};
      results.forEach(({ month, data }) => {
        monthsData[month] = data;
      });
      
      setFutureMonthsData(monthsData);
      
      // Set initial filter to verification month
      setFilterMonth(verificationMonthName);
    } catch (err) {
      console.error('Error fetching months data:', err);
      setError(err.message || 'Failed to load Priority Pass data');
    } finally {
      setLoading(false);
    }
  };

  // Build merchants with Priority Pass status for ALL months
  const merchantsWithPriorityPass = useMemo(() => {
    return verifiedTideMerchants.map(merchant => {
      const priorityPassStatus = {};
      
      allMonths.forEach(month => {
        const monthData = futureMonthsData[month] || {};
        const merchantData = monthData[merchant.phone];
        
        if (merchantData) {
          const status = merchantData.priority_pass_pro || 'Not Active';
          priorityPassStatus[month] = status;
        } else {
          priorityPassStatus[month] = 'No Data';
        }
      });
      
      return {
        ...merchant,
        priorityPassStatus
      };
    });
  }, [verifiedTideMerchants, futureMonthsData, allMonths]);

  // Count active Priority Pass for the SELECTED month filter
  const activeCountForSelectedMonth = useMemo(() => {
    if (filterMonth === 'All') {
      // Count merchants with at least one active Priority Pass in any month
      return merchantsWithPriorityPass.filter(m => 
        Object.values(m.priorityPassStatus).some(status => status === 'Active')
      ).length;
    } else {
      // Count merchants with active Priority Pass in the selected month
      return merchantsWithPriorityPass.filter(m => 
        m.priorityPassStatus[filterMonth] === 'Active'
      ).length;
    }
  }, [merchantsWithPriorityPass, filterMonth]);

  // Filter merchants - NO FILTERING, always show all verified merchants
  const filteredMerchants = merchantsWithPriorityPass;

  const getStatusChip = (status) => {
    if (status === 'Active') {
      return (
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
          label="Active"
          size="small"
          sx={{
            bgcolor: '#e6f4ea',
            color: '#2e7d32',
            fontWeight: 700,
            fontSize: 10,
            border: '1px solid #2e7d32'
          }}
        />
      );
    } else if (status === 'Not Active') {
      return (
        <Chip
          icon={<CancelIcon sx={{ fontSize: 14 }} />}
          label="Inactive"
          size="small"
          sx={{
            bgcolor: '#fdecea',
            color: '#c62828',
            fontWeight: 700,
            fontSize: 10,
            border: '1px solid #c62828'
          }}
        />
      );
    } else if (status === 'No Data') {
      return (
        <Chip
          icon={<HelpOutlineIcon sx={{ fontSize: 14 }} />}
          label="No Data"
          size="small"
          sx={{
            bgcolor: '#f5f5f5',
            color: '#888',
            fontWeight: 700,
            fontSize: 10,
            border: '1px solid #888'
          }}
        />
      );
    } else {
      return (
        <Chip
          label={status}
          size="small"
          sx={{
            bgcolor: '#fff3e0',
            color: '#e65100',
            fontWeight: 700,
            fontSize: 10
          }}
        />
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: BRAND.primary,
        color: '#fff',
        fontWeight: 800,
        pb: 1
      }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            🎯 Priority Pass Tracking
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Merchants verified in {verificationMonth} with active Priority Pass in future months
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Loading Priority Pass data for all months...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Checking {allMonths.length} months for {verifiedTideMerchants.length} verified merchants
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : verifiedTideMerchants.length === 0 ? (
          <Alert severity="info">
            No Tide merchants were fully verified in {verificationMonth}.
          </Alert>
        ) : (
          <Box>
            {/* Summary Stats */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Paper sx={{ p: 2, flex: 1, minWidth: 200, bgcolor: '#e6f4ea', border: '1.5px solid #2e7d32' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32' }}>
                  {activeCountForSelectedMonth}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Active Priority Pass in {filterMonth === 'All' ? 'Any Month' : filterMonth}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Out of {verifiedTideMerchants.length} verified in {verificationMonth}
                </Typography>
              </Paper>
              
              <Paper sx={{ p: 2, flex: 1, minWidth: 200, bgcolor: '#f9fffe', border: '1.5px solid #1565c0' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#1565c0' }}>
                  {verifiedTideMerchants.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Verified Merchants
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Verified in {verificationMonth}
                </Typography>
              </Paper>
            </Box>

            {merchantsWithPriorityPass.length === 0 ? (
              <Alert severity="warning">
                No Priority Pass data available for the {verifiedTideMerchants.length} verified merchants.
              </Alert>
            ) : (
              <>
                {/* Month Filter */}
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>View Priority Pass for Month</InputLabel>
                    <Select
                      value={filterMonth}
                      label="View Priority Pass for Month"
                      onChange={(e) => setFilterMonth(e.target.value)}
                    >
                      <MenuItem value="All">All Months (Any Active)</MenuItem>
                      {allMonths.map(month => (
                        <MenuItem key={month} value={month}>{month}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Typography variant="body2" color="text.secondary">
                    Showing all {filteredMerchants.length} merchants · {activeCountForSelectedMonth} with active Priority Pass
                  </Typography>
                </Box>

                {/* Merchants Table */}
                {filteredMerchants.length === 0 ? (
                  <Alert severity="info">
                    No verified merchants found.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} sx={{ maxHeight: 500, border: '1px solid #e0e0e0' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 800, minWidth: 150 }}>
                            Merchant Name
                          </TableCell>
                          <TableCell sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 800, minWidth: 120 }}>
                            Phone
                          </TableCell>
                          <TableCell sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 800, minWidth: 120 }}>
                            Location
                          </TableCell>
                          <TableCell sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 800, minWidth: 120 }}>
                            FSE
                          </TableCell>
                          <TableCell sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 800, minWidth: 100 }}>
                            Verified
                          </TableCell>
                          {allMonths.map(month => (
                            <TableCell
                              key={month}
                              sx={{
                                bgcolor: filterMonth === month ? '#7c3aed' : BRAND.primary,
                                color: '#fff',
                                fontWeight: 800,
                                minWidth: 100,
                                textAlign: 'center',
                                position: 'relative',
                                '&::after': filterMonth === month ? {
                                  content: '""',
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: '4px',
                                  bgcolor: '#fbbf24'
                                } : {}
                              }}
                            >
                              {month.slice(0, 3)}
                              {filterMonth === month && (
                                <Typography variant="caption" sx={{ display: 'block', fontSize: 8, opacity: 0.9 }}>
                                  ★
                                </Typography>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredMerchants.map((merchant, idx) => (
                          <TableRow
                            key={idx}
                            sx={{
                              '&:hover': { bgcolor: '#f9fffe' },
                              '&:nth-of-type(odd)': { bgcolor: '#fafafa' }
                            }}
                          >
                            <TableCell sx={{ fontWeight: 600 }}>
                              {merchant.merchantName || '—'}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {merchant.phone}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {merchant.location || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {merchant.employeeName || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`✓ ${merchant.verifiedMonth}`}
                                size="small"
                                sx={{
                                  bgcolor: '#e3f2fd',
                                  color: '#1565c0',
                                  fontWeight: 700,
                                  fontSize: 10
                                }}
                              />
                            </TableCell>
                            {allMonths.map(month => (
                              <TableCell 
                                key={month} 
                                sx={{ 
                                  textAlign: 'center',
                                  bgcolor: filterMonth === month ? '#fef3c7' : 'inherit',
                                  fontWeight: filterMonth === month ? 700 : 400
                                }}
                              >
                                {getStatusChip(merchant.priorityPassStatus[month])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Legend */}
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block' }}>
                    Legend
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {getStatusChip('Active')}
                    {getStatusChip('Not Active')}
                    {getStatusChip('No Data')}
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: BRAND.primary, fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PriorityPassTracking;
