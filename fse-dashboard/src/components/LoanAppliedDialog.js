import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, IconButton, TextField, InputAdornment, Tooltip, TablePagination
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import * as XLSX from 'xlsx';
import { BRAND } from '../theme';

/**
 * LoanAppliedDialog Component
 * Displays the list of all merchants where Loan / PCS Quote Form is 'Yes'
 */
export default function LoanAppliedDialog({ open, onClose, forms = [], selectedMonth, globalVerifyMap = {} }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Status Chip Colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'Fully Verified':
        return { bg: '#e6f4ea', color: '#2e7d32', border: '#a5d6a7' };
      case 'Already Verified':
        return { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' };
      case 'Critical Failure':
        return { bg: '#fdecea', color: '#c62828', border: '#ef9a9a' };
      case 'Partially Done':
        return { bg: '#fff8e1', color: '#f57f17', border: '#ffe082' };
      case 'Not Verified':
        return { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' };
      default:
        return { bg: '#f5f5f5', color: '#616161', border: '#e0e0e0' };
    }
  };

  // Filter forms by search query and status filter
  const filteredForms = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return forms.filter(f => {
      const vStatus = globalVerifyMap[f._id]?.status || f.verificationStatus || 'Not Found';
      if (statusFilter !== 'ALL' && vStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const mName = (f.customerName || f.shopName || '').toLowerCase();
      const phone = String(f.customerNumber || '').toLowerCase();
      const empName = (f.employeeName || '').toLowerCase();
      const tl = (f.tlName || '').toLowerCase();
      const prod = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase();
      return mName.includes(q) || phone.includes(q) || empName.includes(q) || tl.includes(q) || prod.includes(q);
    });
  }, [forms, searchTerm, statusFilter, globalVerifyMap]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredForms.length) return;
    const exportData = filteredForms.map((f, i) => {
      const vStatus = globalVerifyMap[f._id]?.status || f.verificationStatus || 'Pending';
      return {
        'S.No': i + 1,
        'Merchant Name': f.customerName || f.shopName || '—',
        'Customer Number / Phone': f.customerNumber || '—',
        'FSE / Employee Name': f.employeeName || '—',
        'Team Leader (TL)': f.tlName || '—',
        'Product': f.formFillingFor || f.tideProduct || f.brand || '—',
        'Submission Date': f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        'Loan / PCS Quote Form': 'Yes',
        'Verification Status': vStatus
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loan Applied');
    const monthLabel = selectedMonth ? selectedMonth.replace(/\s+/g, '_') : 'All';
    XLSX.writeFile(wb, `Loan_Applied_Merchants_${monthLabel}.xlsx`);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Paginated list
  const paginatedForms = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredForms.slice(start, start + rowsPerPage);
  }, [filteredForms, page, rowsPerPage]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: '#f3e5f5',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AssignmentTurnedInIcon fontSize="medium" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#7c3aed' }}>
                Loan Applied Merchants
              </Typography>
              <Chip
                label={`${filteredForms.length} Records`}
                size="small"
                sx={{ bgcolor: '#f3e5f5', color: '#7c3aed', fontWeight: 800, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Merchants where PCS Quote Form / Loan is Yes · {selectedMonth || 'All Months'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Controls: Search, Status Filter, Export */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flex: 1, minWidth: { xs: '100%', sm: 300 } }}>
            <TextField
              size="small"
              placeholder="Search by merchant, phone, FSE, TL..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchTerm(''); setPage(0); }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              disabled={filteredForms.length === 0}
              sx={{
                borderColor: '#7c3aed',
                color: '#7c3aed',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { borderColor: '#6d28d9', bgcolor: '#f3e5f5' }
              }}
            >
              Export Excel ({filteredForms.length})
            </Button>
          </Box>
        </Box>

        {/* Table of merchants */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, maxHeight: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9', width: 50 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9' }}>Merchant Details</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9' }}>FSE / Employee</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9' }}>Team Leader</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9' }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9', textAlign: 'center' }}>Loan Applied</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#faf5ff', color: '#6d28d9' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {forms.length === 0 ? 'No Loan Applied records found for this selection.' : 'No matching records found for this search.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedForms.map((f, idx) => {
                  const actualIdx = page * rowsPerPage + idx + 1;
                  const vStatus = globalVerifyMap[f._id]?.status || f.verificationStatus || 'Not Found';
                  const sStyle = getStatusColor(vStatus);
                  const mName = f.customerName || f.shopName || '—';
                  const phone = f.customerNumber || '—';
                  const prod = f.formFillingFor || f.tideProduct || f.brand || '—';
                  const dateStr = f.createdAt
                    ? new Date(f.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';

                  return (
                    <TableRow key={f._id || idx} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{actualIdx}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#2c3e50' }}>
                          {mName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 600 }}>
                          📱 {phone}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#333' }}>
                          {f.employeeName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {f.tlName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={prod}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            bgcolor: '#f0f4f8',
                            color: '#334155'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {dateStr}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label="Yes"
                          size="small"
                          sx={{
                            bgcolor: '#e8f5e9',
                            color: '#2e7d32',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            border: '1px solid #a5d6a7'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={vStatus}
                          size="small"
                          sx={{
                            bgcolor: sStyle.bg,
                            color: sStyle.color,
                            border: `1px solid ${sStyle.border}`,
                            fontWeight: 700,
                            fontSize: '0.7rem'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {filteredForms.length > 0 && (
          <TablePagination
            component="div"
            count={filteredForms.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ borderTop: '1px solid #f0f0f0', pt: 0.5 }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
          Total {filteredForms.length} merchants with Loan Applied
        </Typography>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
