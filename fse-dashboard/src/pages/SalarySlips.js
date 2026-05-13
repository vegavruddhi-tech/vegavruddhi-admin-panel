import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert,
  TextField, MenuItem, InputAdornment, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Checkbox
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { BRAND } from '../theme';

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = MONTHS[new Date().getMonth()];

export default function SalarySlips() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [salarySlips, setSalarySlips] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [pointValue, setPointValue] = useState(250);
  const [roleFilter, setRoleFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  
  // Modals
  const [generateModal, setGenerateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedSlip, setSelectedSlip] = useState(null);
  
  // PDF viewer modal
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  
  // Form state for generate/edit
  const [formData, setFormData] = useState({
    pointsEarned: 0,
    slabPoints: 0,
    totalPoints: 0,
    pointValue: 250,
    totalSalary: 0,
    paymentDate: '',
    paymentMode: 'Bank Transfer',
    status: 'generated',
    remarks: '',
    // Editable percentages
    pctBasic: 50,
    pctHRA: 25,
    pctConv: 5,
    pctSpec: 20,
    // Editable deductions
    deductionPF: 0,
    deductionPT: 0,
    deductionESIC: 0,
    deductionTDS: 0
  });
  
  // Bulk selection
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Load employees with points (WITHOUT pointValue - calculate on frontend)
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Don't send pointValue to API - we'll calculate salary on frontend
      const res = await fetch(`${EMP_API}/salary/employees?month=${selectedMonth}&year=${selectedYear}&pointValue=250`);
      if (!res.ok) throw new Error('Failed to load employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]); // Removed pointValue from dependency

  // Load salary slips
  const loadSalarySlips = useCallback(async () => {
    try {
      const res = await fetch(`${EMP_API}/salary/list?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to load salary slips');
      const data = await res.json();
      setSalarySlips(data.slips || []);
    } catch (err) {
      console.error('Error loading salary slips:', err);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadEmployees();
    loadSalarySlips();
  }, [loadEmployees, loadSalarySlips]);

  // Recalculate salary when pointValue changes (frontend only - no API call)
  const employeesWithRecalculatedSalary = employees.map(emp => ({
    ...emp,
    totalSalary: emp.pointsEarned * pointValue
  }));

  // Filter employees
  const filteredEmployees = employeesWithRecalculatedSalary.filter(emp => {
    if (roleFilter !== 'All' && emp.role !== roleFilter) return false;
    if (search && !emp.employeeName.toLowerCase().includes(search.toLowerCase()) && 
        !emp.employeeEmail.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Handle generate slip
  const handleGenerate = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      pointsEarned: employee.pointsEarned,
      slabPoints: employee.slabPoints || 0,
      totalPoints: employee.totalPoints || employee.pointsEarned,
      pointValue: pointValue,
      totalSalary: (employee.totalPoints || employee.pointsEarned) * pointValue,
      paymentDate: '',
      paymentMode: 'Bank Transfer',
      status: 'generated',
      remarks: '',
      pctBasic: 50,
      pctHRA: 25,
      pctConv: 5,
      pctSpec: 20,
      deductionPF: 0,
      deductionPT: 0,
      deductionESIC: 0,
      deductionTDS: 0
    });
    setGenerateModal(true);
  };

  // Submit generate
  const submitGenerate = async () => {
    try {
      const base = parseFloat(formData.pointsEarned) || 0;
      const slab = parseFloat(formData.slabPoints) || 0;
      const pv   = parseFloat(formData.pointValue) || 250;
      const totalPts = Math.round((base + slab) * 10) / 10;
      const totalSal = Math.round(totalPts * pv * 10) / 10;

      const res = await fetch(`${EMP_API}/salary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedEmployee,
          pointsEarned: base,
          slabPoints: slab,
          totalPoints: totalPts,
          pointValue: pv,
          totalSalary: totalSal,
          remarks: formData.remarks,
          // Editable percentages
          pctBasic: formData.pctBasic,
          pctHRA:   formData.pctHRA,
          pctConv:  formData.pctConv,
          pctSpec:  formData.pctSpec,
          // Editable deductions
          deductionPF:   formData.deductionPF,
          deductionPT:   formData.deductionPT,
          deductionESIC: formData.deductionESIC,
          deductionTDS:  formData.deductionTDS,
          month: selectedMonth,
          year: selectedYear,
          generatedBy: localStorage.getItem('userEmail') || 'admin'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate slip');
      }

      alert('✅ Salary slip generated successfully!');
      setGenerateModal(false);
      loadEmployees();
      loadSalarySlips();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Handle edit slip
  const handleEdit = async (slip) => {
    setSelectedSlip(slip);
    setFormData({
      pointsEarned:  slip.pointsEarned || 0,
      slabPoints:    slip.slabPoints   || 0,
      totalPoints:   slip.totalPoints  || slip.pointsEarned || 0,
      pointValue:    slip.pointValue   || 250,
      totalSalary:   slip.totalSalary  || 0,
      paymentDate:   slip.paymentDate ? new Date(slip.paymentDate).toISOString().split('T')[0] : '',
      paymentMode:   slip.paymentMode  || 'Bank Transfer',
      status:        slip.status       || 'generated',
      remarks:       slip.remarks      || '',
      pctBasic:      slip.pctBasic     || 50,
      pctHRA:        slip.pctHRA       || 25,
      pctConv:       slip.pctConv      || 5,
      pctSpec:       slip.pctSpec      || 20,
      deductionPF:   slip.deductionPF   || 0,
      deductionPT:   slip.deductionPT   || 0,
      deductionESIC: slip.deductionESIC || 0,
      deductionTDS:  slip.deductionTDS  || 0
    });
    setEditModal(true);
  };

  // Submit edit
  const submitEdit = async () => {
    try {
      const base = parseFloat(formData.pointsEarned) || 0;
      const slab = parseFloat(formData.slabPoints) || 0;
      const pv   = parseFloat(formData.pointValue) || 250;
      const totalPts = Math.round((base + slab) * 10) / 10;
      const totalSal = Math.round(totalPts * pv * 10) / 10;

      const res = await fetch(`${EMP_API}/salary/${selectedSlip._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsEarned:  base,
          slabPoints:    slab,
          totalPoints:   totalPts,
          pointValue:    pv,
          totalSalary:   totalSal,
          paymentDate:   formData.paymentDate,
          paymentMode:   formData.paymentMode,
          status:        formData.status,
          remarks:       formData.remarks,
          pctBasic:      formData.pctBasic,
          pctHRA:        formData.pctHRA,
          pctConv:       formData.pctConv,
          pctSpec:       formData.pctSpec,
          deductionPF:   formData.deductionPF,
          deductionPT:   formData.deductionPT,
          deductionESIC: formData.deductionESIC,
          deductionTDS:  formData.deductionTDS,
          editedBy:      localStorage.getItem('userEmail') || 'admin'
        })
      });

      if (!res.ok) throw new Error('Failed to update slip');

      alert('✅ Salary slip updated successfully!');
      setEditModal(false);
      loadSalarySlips();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Handle delete
  const handleDelete = (slip) => {
    setSelectedSlip(slip);
    setDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      const res = await fetch(`${EMP_API}/salary/${selectedSlip._id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete slip');

      alert('✅ Salary slip deleted successfully!');
      setDeleteDialog(false);
      loadEmployees();
      loadSalarySlips();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Generate PDF for existing slip
  const handleGeneratePDF = async (slip) => {
    try {
      const confirmed = window.confirm(`Generate PDF for ${slip.employeeName}?`);
      if (!confirmed) return;

      setLoading(true);

      // Use dedicated PDF generation endpoint
      const res = await fetch(`${EMP_API}/salary/${slip._id}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }

      const data = await res.json();
      
      // Update local state immediately with the new pdfUrl
      setSalarySlips(prev => prev.map(s => 
        s._id === slip._id ? { ...s, pdfUrl: data.pdfUrl } : s
      ));
      
      setLoading(false);
      
      // Auto-open the PDF using view-pdf endpoint
      alert('✅ PDF generated successfully! Opening PDF...');
      handleViewPDF(slip);
      
    } catch (err) {
      setLoading(false);
      alert('❌ Error: ' + err.message);
      console.error('PDF generation error:', err);
    }
  };

  // View PDF - stream directly from backend (admin view shows % column)
  const handleViewPDF = (slip) => {
    const slipId = typeof slip === 'string' ? slip : slip._id;
    const url = `${EMP_API}/salary/${slipId}/view-pdf?admin=true`;
    window.open(url, '_blank');
  };

  // Handle bulk generate
  const handleBulkGenerate = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    const confirmed = window.confirm(`Generate salary slips for ${selectedEmployees.length} employees?`);
    if (!confirmed) return;

    try {
      const employeesToGenerate = employees.filter(emp => 
        selectedEmployees.includes(emp.employeeEmail) && !emp.hasSlip
      );

      const res = await fetch(`${EMP_API}/salary/bulk-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: employeesToGenerate,
          month: selectedMonth,
          year: selectedYear,
          pointValue: pointValue,
          generatedBy: localStorage.getItem('userEmail') || 'admin'
        })
      });

      if (!res.ok) throw new Error('Failed to bulk generate');

      const data = await res.json();
      alert(`✅ ${data.message}`);
      setSelectedEmployees([]);
      loadEmployees();
      loadSalarySlips();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Toggle employee selection
  const toggleEmployeeSelection = (email) => {
    setSelectedEmployees(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  // Select all (excluding employees with 0 points)
  const toggleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.filter(emp => emp.totalPoints > 0).length) {
      setSelectedEmployees([]);
    } else {
      // Only select employees with points > 0
      setSelectedEmployees(
        filteredEmployees
          .filter(emp => emp.totalPoints > 0)
          .map(emp => emp.employeeEmail)
      );
    }
  };

  // Update total salary when points or value changes
  const updateFormData = (field, value) => {
    const newData = { ...formData, [field]: value };
    if (field === 'pointsEarned' || field === 'slabPoints' || field === 'pointValue') {
      const base = parseFloat(newData.pointsEarned) || 0;
      const slab = parseFloat(newData.slabPoints) || 0;
      newData.totalPoints = Math.round((base + slab) * 10) / 10;
      newData.totalSalary = newData.totalPoints * (parseFloat(newData.pointValue) || 250);
    }
    setFormData(newData);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>
            💰 Salary Slips
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate and manage salary slips based on points earned
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={() => { loadEmployees(); loadSalarySlips(); }}
          sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            sx={{ minWidth: 150 }}
            size="small"
          >
            {MONTHS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>

          <TextField
            select
            label="Year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            sx={{ minWidth: 120 }}
            size="small"
          >
            {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Point Value (₹)"
            type="number"
            value={pointValue}
            onChange={(e) => setPointValue(parseInt(e.target.value) || 250)}
            sx={{ minWidth: 150 }}
            size="small"
          />

          <TextField
            select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ minWidth: 120 }}
            size="small"
          >
            {['All', 'FSE', 'TL', 'Manager'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>

          <TextField
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </Box>
      </Card>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Card sx={{ mb: 2, p: 2, bgcolor: '#e6f4ea', border: '1px solid #2e7d32' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between', gap: 2 }}>
            <Typography variant="body2" fontWeight={600} sx={{ color: '#2e7d32' }}>
              {selectedEmployees.length} employee(s) selected
            </Typography>
            <Button
              variant="contained"
              onClick={handleBulkGenerate}
              sx={{ bgcolor: '#2e7d32', fontWeight: 700, ml: 'auto' }}
            >
              📊 Generate Selected Slips
            </Button>
          </Box>
        </Card>
      )}

      {/* Employee List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BRAND.primary }} />
        </Box>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        selectedEmployees.length === filteredEmployees.filter(emp => emp.totalPoints > 0).length && 
                        filteredEmployees.filter(emp => emp.totalPoints > 0).length > 0
                      }
                      indeterminate={
                        selectedEmployees.length > 0 && 
                        selectedEmployees.length < filteredEmployees.filter(emp => emp.totalPoints > 0).length
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Points</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Salary</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.employeeEmail} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedEmployees.includes(emp.employeeEmail)}
                        onChange={() => toggleEmployeeSelection(emp.employeeEmail)}
                        disabled={emp.hasSlip}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{emp.employeeName}</Typography>
                      <Typography variant="caption" color="text.secondary">{emp.employeeEmail}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={emp.role} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{emp.pointsEarned}</Typography>
                      {emp.slabPoints > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          +{emp.slabPoints} slab = <strong>{emp.totalPoints}</strong>
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.primary }}>
                        ₹{emp.totalSalary.toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {emp.hasSlip ? (
                        <Chip 
                          label={emp.slipStatus} 
                          size="small" 
                          sx={{ 
                            bgcolor: emp.slipStatus === 'paid' ? '#e6f4ea' : '#fff8e1',
                            color: emp.slipStatus === 'paid' ? '#2e7d32' : '#f57f17',
                            fontWeight: 600 
                          }} 
                        />
                      ) : (
                        <Chip label="Not Generated" size="small" sx={{ bgcolor: '#f5f5f5', color: '#666' }} />
                      )}
                      {emp.hasSlip && (() => {
                        const slip = salarySlips.find(s => s.employeeEmail === emp.employeeEmail);
                        return slip?.pdfUrl ? (
                          <Chip 
                            label="PDF" 
                            size="small" 
                            icon={<PictureAsPdfIcon />}
                            sx={{ 
                              ml: 0.5,
                              bgcolor: '#ffebee', 
                              color: '#d32f2f',
                              fontWeight: 600,
                              fontSize: 10
                            }} 
                          />
                        ) : null;
                      })()}
                    </TableCell>
                    <TableCell>
                      {emp.hasSlip ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {(() => {
                            const slip = salarySlips.find(s => s.employeeEmail === emp.employeeEmail);
                            return (
                              <>
                                {slip?.pdfUrl ? (
                                  // RED ICON - PDF exists, click to view directly
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleViewPDF(slip)}
                                    sx={{ color: '#d32f2f' }}
                                    title="View PDF"
                                  >
                                    <PictureAsPdfIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  // ORANGE ICON - No PDF, click to generate
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleGeneratePDF(slip)}
                                    sx={{ color: '#ff9800' }}
                                    title="Generate PDF"
                                  >
                                    <PictureAsPdfIcon fontSize="small" />
                                  </IconButton>
                                )}
                                <IconButton size="small" onClick={() => {
                                  if (slip) handleEdit(slip);
                                }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => {
                                  if (slip) handleDelete(slip);
                                }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </>
                            );
                          })()}
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleGenerate(emp)}
                          sx={{ bgcolor: BRAND.primary, fontWeight: 600, fontSize: 11 }}
                        >
                          Generate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Generate Modal - Full Live Preview */}
      <Dialog open={generateModal} onClose={() => setGenerateModal(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { maxHeight: '95vh' } }}>
        <DialogTitle sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 800 }}>
          Generate Salary Slip — {selectedEmployee?.employeeName}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedEmployee && (() => {
            // Live calculation
            const FIXED_GROSS = 25000;
            // Total calendar days in the month (including Sundays)
            const MONTHS_LIST = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const mIdx = MONTHS_LIST.indexOf(selectedMonth);
            const TOTAL_WD = new Date(selectedYear, mIdx + 1, 0).getDate();
            const base = parseFloat(formData.pointsEarned) || 0;
            const slab = parseFloat(formData.slabPoints) || 0;
            const pv   = parseFloat(formData.pointValue) || 250;
            const totalPts = Math.round((base + slab) * 10) / 10;
            const pointsSalary = Math.round(totalPts * pv * 10) / 10;
            const hasIncentive = pointsSalary > FIXED_GROSS;
            const incentive    = hasIncentive ? Math.round((pointsSalary - FIXED_GROSS) * 10) / 10 : 0;
            const workingDays  = hasIncentive ? TOTAL_WD : Math.round((pointsSalary / FIXED_GROSS) * TOTAL_WD);
            // Breakdown: ₹25k base if incentive, else actual salary
            const breakBase = hasIncentive ? FIXED_GROSS : pointsSalary;
            const pctB = parseFloat(formData.pctBasic) || 50;
            const pctH = parseFloat(formData.pctHRA)   || 25;
            const pctC = parseFloat(formData.pctConv)  || 5;
            const pctS = parseFloat(formData.pctSpec)  || 20;
            const basic = Math.round(breakBase * pctB / 100);
            const hra   = Math.round(breakBase * pctH / 100);
            const conv  = Math.round(breakBase * pctC / 100);
            const spec  = Math.round(breakBase * pctS / 100);
            const dedPF   = parseFloat(formData.deductionPF)   || 0;
            const dedPT   = parseFloat(formData.deductionPT)   || 0;
            const dedESIC = parseFloat(formData.deductionESIC) || 0;
            const dedTDS  = parseFloat(formData.deductionTDS)  || 0;
            const totalDed = dedPF + dedPT + dedESIC + dedTDS;
            const gross = pointsSalary;
            const net   = gross - totalDed;
            const fmt   = (n) => Number(n || 0).toLocaleString('en-IN');

            return (
              <Box sx={{ display: 'flex', gap: 0, height: '100%' }}>
                {/* LEFT: Editable Fields */}
                <Box sx={{ width: 290, p: 2, borderRight: '1px solid #eee', bgcolor: '#fafafa', flexShrink: 0, overflowY: 'auto' }}>
                  <Typography variant="subtitle2" fontWeight={700} color={BRAND.primary} sx={{ mb: 1.5 }}>Edit Values</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField label="Base Points" type="number" size="small" fullWidth
                      value={formData.pointsEarned}
                      onChange={(e) => updateFormData('pointsEarned', parseFloat(e.target.value) || 0)}
                      helperText="From verified forms" />
                    <TextField label="Slab / Bonus Points" type="number" size="small" fullWidth
                      value={formData.slabPoints}
                      onChange={(e) => updateFormData('slabPoints', parseFloat(e.target.value) || 0)}
                      helperText="Admin editable"
                      sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ff9800' } }} />
                    <TextField label="Point Value (₹)" type="number" size="small" fullWidth
                      value={formData.pointValue}
                      onChange={(e) => updateFormData('pointValue', parseInt(e.target.value) || 250)} />

                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mt: 0.5 }}>Breakdown %</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <TextField label="Basic %" type="number" size="small"
                        value={formData.pctBasic}
                        onChange={(e) => updateFormData('pctBasic', parseFloat(e.target.value) || 0)} />
                      <TextField label="HRA %" type="number" size="small"
                        value={formData.pctHRA}
                        onChange={(e) => updateFormData('pctHRA', parseFloat(e.target.value) || 0)} />
                      <TextField label="Conveyance %" type="number" size="small"
                        value={formData.pctConv}
                        onChange={(e) => updateFormData('pctConv', parseFloat(e.target.value) || 0)} />
                      <TextField label="Special Allow %" type="number" size="small"
                        value={formData.pctSpec}
                        onChange={(e) => updateFormData('pctSpec', parseFloat(e.target.value) || 0)} />
                    </Box>

                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mt: 0.5 }}>Deductions (₹)</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <TextField label="Employee PF" type="number" size="small"
                        value={formData.deductionPF}
                        onChange={(e) => updateFormData('deductionPF', parseFloat(e.target.value) || 0)} />
                      <TextField label="Prof. Tax" type="number" size="small"
                        value={formData.deductionPT}
                        onChange={(e) => updateFormData('deductionPT', parseFloat(e.target.value) || 0)} />
                      <TextField label="ESIC" type="number" size="small"
                        value={formData.deductionESIC}
                        onChange={(e) => updateFormData('deductionESIC', parseFloat(e.target.value) || 0)} />
                      <TextField label="TDS" type="number" size="small"
                        value={formData.deductionTDS}
                        onChange={(e) => updateFormData('deductionTDS', parseFloat(e.target.value) || 0)} />
                    </Box>

                    <TextField label="Remarks" size="small" fullWidth multiline rows={2}
                      value={formData.remarks}
                      onChange={(e) => updateFormData('remarks', e.target.value)} />
                  </Box>
                </Box>

                {/* RIGHT: Live Preview */}
                <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1a5c38', pb: 1.5, mb: 1.5 }}>
                    <Typography variant="h5" fontWeight={900} color={BRAND.primary}>VEGAVRUDDHI</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle1" fontWeight={900} color={BRAND.primary}>Salary Slip</Typography>
                      <Typography variant="caption" color="text.secondary">{selectedMonth} {selectedYear}</Typography>
                    </Box>
                  </Box>

                  {/* Employee Info */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1.5, p: 1, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                    {[
                      ['Employee', selectedEmployee.employeeName],
                      ['Designation', selectedEmployee.role],
                      ['Department', 'Sales'],
                      ['Pay Period', `${selectedMonth} ${selectedYear}`],
                      ['Working Days', `${workingDays}`],
                      ['Base Points', `${base} pts`],
                      ...(slab > 0 ? [['Slab Bonus', `+${slab} pts`]] : []),
                      ['Total Points', `${totalPts} pts × ₹${pv} = ₹${fmt(pointsSalary)}`],
                    ].map(([label, val]) => (
                      <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ minWidth: 85, fontSize: 10 }}>{label}:</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 10 }}>{val}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Earnings */}
                  <Typography variant="subtitle2" fontWeight={700} color={BRAND.primary} sx={{ borderBottom: `2px solid ${BRAND.primary}`, pb: 0.5, mb: 0.5, fontSize: 11 }}>Earnings</Typography>
                  <Table size="small" sx={{ mb: 1 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: 10, py: 0.5 }}>Component</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 10, py: 0.5 }}>%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 10, py: 0.5 }}>Amount (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        ['Basic', `${pctB}%`, basic],
                        ['HRA', `${pctH}%`, hra],
                        ['Conveyance / Fuel', `${pctC}%`, conv],
                        ['Special Allowance', `${pctS}%`, spec],
                      ].map(([label, pct, val]) => (
                        <TableRow key={label}>
                          <TableCell sx={{ fontSize: 11, py: 0.5 }}>{label}</TableCell>
                          <TableCell align="center" sx={{ fontSize: 11, color: '#666', py: 0.5 }}>{pct}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11, fontWeight: 600, py: 0.5 }}>₹{fmt(val)}</TableCell>
                        </TableRow>
                      ))}
                      {hasIncentive && (
                        <TableRow>
                          <TableCell sx={{ fontSize: 11, color: '#e65100', fontWeight: 700, py: 0.5 }}>
                            Incentive <span style={{ fontSize: 9, fontWeight: 400 }}>(₹{fmt(pointsSalary)} − ₹{fmt(FIXED_GROSS)})</span>
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: 11, color: '#e65100', py: 0.5 }}>Variable</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, color: '#e65100', py: 0.5 }}>₹{fmt(incentive)}</TableCell>
                        </TableRow>
                      )}
                      <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 700, borderTop: '2px solid #ccc', py: 0.5 }}>Gross Salary</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid #ccc', py: 0.5 }}>₹{fmt(gross)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Deductions */}
                  <Typography variant="subtitle2" fontWeight={700} color={BRAND.primary} sx={{ borderBottom: `2px solid ${BRAND.primary}`, pb: 0.5, mb: 0.5, fontSize: 11 }}>Deductions</Typography>
                  <Table size="small" sx={{ mb: 1 }}>
                    <TableBody>
                      {[
                        ['Employee PF', dedPF],
                        ['Professional Tax', dedPT],
                        ['ESIC (if applicable)', dedESIC],
                        ['TDS (as applicable)', dedTDS],
                      ].map(([label, val]) => (
                        <TableRow key={label}>
                          <TableCell sx={{ fontSize: 11, color: '#333', py: 0.5 }}>{label}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11, py: 0.5, color: val > 0 ? '#333' : '#bbb', fontStyle: val > 0 ? 'normal' : 'italic' }}>
                            {val > 0 ? `₹${fmt(val)}` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                        <TableCell sx={{ fontWeight: 700, borderTop: '2px solid #ccc', py: 0.5 }}>Total Deductions</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid #ccc', py: 0.5 }}>₹{fmt(totalDed)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Net Salary */}
                  <Box sx={{ bgcolor: BRAND.primary, color: '#fff', p: 1.5, borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography fontWeight={700} fontSize={13}>Net Salary (Take Home)</Typography>
                    <Typography variant="h6" fontWeight={900}>₹{fmt(net)}</Typography>
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setGenerateModal(false)}>Cancel</Button>
          <Button onClick={submitGenerate} variant="contained" sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}>
            Generate Slip
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal - Same layout as Generate */}
      <Dialog open={editModal} onClose={() => setEditModal(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { maxHeight: '95vh' } }}>
        <DialogTitle sx={{ bgcolor: BRAND.primary, color: '#fff', fontWeight: 800 }}>
          Edit Salary Slip — {selectedSlip?.employeeName}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedSlip && (() => {
            const FIXED_GROSS = 25000;
            const MONTHS_LIST = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const mIdx = MONTHS_LIST.indexOf(selectedSlip.month);
            const TOTAL_WD = new Date(selectedSlip.year, mIdx + 1, 0).getDate();
            const base = parseFloat(formData.pointsEarned) || 0;
            const slab = parseFloat(formData.slabPoints) || 0;
            const pv   = parseFloat(formData.pointValue) || 250;
            const totalPts = Math.round((base + slab) * 10) / 10;
            const pointsSalary = Math.round(totalPts * pv * 10) / 10;
            const hasIncentive = pointsSalary > FIXED_GROSS;
            const incentive    = hasIncentive ? Math.round((pointsSalary - FIXED_GROSS) * 10) / 10 : 0;
            const workingDays  = hasIncentive ? TOTAL_WD : Math.round((pointsSalary / FIXED_GROSS) * TOTAL_WD);
            const breakBase = hasIncentive ? FIXED_GROSS : pointsSalary;
            const pctB = parseFloat(formData.pctBasic) || 50;
            const pctH = parseFloat(formData.pctHRA)   || 25;
            const pctC = parseFloat(formData.pctConv)  || 5;
            const pctS = parseFloat(formData.pctSpec)  || 20;
            const basic = Math.round(breakBase * pctB / 100);
            const hra   = Math.round(breakBase * pctH / 100);
            const conv  = Math.round(breakBase * pctC / 100);
            const spec  = Math.round(breakBase * pctS / 100);
            const dedPF   = parseFloat(formData.deductionPF)   || 0;
            const dedPT   = parseFloat(formData.deductionPT)   || 0;
            const dedESIC = parseFloat(formData.deductionESIC) || 0;
            const dedTDS  = parseFloat(formData.deductionTDS)  || 0;
            const totalDed = dedPF + dedPT + dedESIC + dedTDS;
            const gross = pointsSalary;
            const net   = gross - totalDed;
            const fmt   = (n) => Number(n || 0).toLocaleString('en-IN');

            return (
              <Box sx={{ display: 'flex', gap: 0, height: '100%' }}>
                {/* LEFT: Editable Fields */}
                <Box sx={{ width: 290, p: 2, borderRight: '1px solid #eee', bgcolor: '#fafafa', flexShrink: 0, overflowY: 'auto' }}>
                  <Typography variant="subtitle2" fontWeight={700} color={BRAND.primary} sx={{ mb: 1.5 }}>Edit Values</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField label="Base Points" type="number" size="small" fullWidth
                      value={formData.pointsEarned}
                      onChange={(e) => updateFormData('pointsEarned', parseFloat(e.target.value) || 0)} />
                    <TextField label="Slab / Bonus Points" type="number" size="small" fullWidth
                      value={formData.slabPoints}
                      onChange={(e) => updateFormData('slabPoints', parseFloat(e.target.value) || 0)}
                      sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ff9800' } }} />
                    <TextField label="Point Value (₹)" type="number" size="small" fullWidth
                      value={formData.pointValue}
                      onChange={(e) => updateFormData('pointValue', parseInt(e.target.value) || 250)} />

                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mt: 0.5 }}>Breakdown %</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <TextField label="Basic %" type="number" size="small"
                        value={formData.pctBasic} onChange={(e) => updateFormData('pctBasic', parseFloat(e.target.value) || 0)} />
                      <TextField label="HRA %" type="number" size="small"
                        value={formData.pctHRA} onChange={(e) => updateFormData('pctHRA', parseFloat(e.target.value) || 0)} />
                      <TextField label="Conveyance %" type="number" size="small"
                        value={formData.pctConv} onChange={(e) => updateFormData('pctConv', parseFloat(e.target.value) || 0)} />
                      <TextField label="Special Allow %" type="number" size="small"
                        value={formData.pctSpec} onChange={(e) => updateFormData('pctSpec', parseFloat(e.target.value) || 0)} />
                    </Box>

                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mt: 0.5 }}>Deductions (₹)</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <TextField label="Employee PF" type="number" size="small"
                        value={formData.deductionPF} onChange={(e) => updateFormData('deductionPF', parseFloat(e.target.value) || 0)} />
                      <TextField label="Prof. Tax" type="number" size="small"
                        value={formData.deductionPT} onChange={(e) => updateFormData('deductionPT', parseFloat(e.target.value) || 0)} />
                      <TextField label="ESIC" type="number" size="small"
                        value={formData.deductionESIC} onChange={(e) => updateFormData('deductionESIC', parseFloat(e.target.value) || 0)} />
                      <TextField label="TDS" type="number" size="small"
                        value={formData.deductionTDS} onChange={(e) => updateFormData('deductionTDS', parseFloat(e.target.value) || 0)} />
                    </Box>

                    <TextField select label="Status" size="small" fullWidth
                      value={formData.status} onChange={(e) => updateFormData('status', e.target.value)}>
                      {['draft', 'generated', 'sent', 'paid'].map(s => (
                        <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                      ))}
                    </TextField>
                    <TextField label="Payment Date" type="date" size="small" fullWidth
                      value={formData.paymentDate} onChange={(e) => updateFormData('paymentDate', e.target.value)}
                      InputLabelProps={{ shrink: true }} />
                    <TextField label="Payment Mode" size="small" fullWidth
                      value={formData.paymentMode} onChange={(e) => updateFormData('paymentMode', e.target.value)} />
                    <TextField label="Remarks" size="small" fullWidth multiline rows={2}
                      value={formData.remarks} onChange={(e) => updateFormData('remarks', e.target.value)} />
                  </Box>
                </Box>

                {/* RIGHT: Live Preview */}
                <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1a5c38', pb: 1.5, mb: 1.5 }}>
                    <Typography variant="h5" fontWeight={900} color={BRAND.primary}>VEGAVRUDDHI</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle1" fontWeight={900} color={BRAND.primary}>Salary Slip</Typography>
                      <Typography variant="caption" color="text.secondary">{selectedSlip.month} {selectedSlip.year}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1.5, p: 1, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                    {[
                      ['Employee', selectedSlip.employeeName],
                      ['Designation', selectedSlip.role],
                      ['Department', 'Sales'],
                      ['Month', `${selectedSlip.month} ${selectedSlip.year}`],
                      ['Working Days', `${workingDays}`],
                      ['Base Points', `${base} pts`],
                      ...(slab > 0 ? [['Slab Bonus', `+${slab} pts`]] : []),
                      ['Total Points', `${totalPts} pts × ₹${pv} = ₹${fmt(pointsSalary)}`],
                    ].map(([label, val]) => (
                      <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ minWidth: 85, fontSize: 10 }}>{label}:</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 10 }}>{val}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Typography variant="subtitle2" fontWeight={700} color={BRAND.primary} sx={{ borderBottom: `2px solid ${BRAND.primary}`, pb: 0.5, mb: 0.5, fontSize: 11 }}>Earnings</Typography>
                  <Table size="small" sx={{ mb: 1 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: 10, py: 0.5 }}>Component</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 10, py: 0.5 }}>%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 10, py: 0.5 }}>Amount (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[['Basic', `${pctB}%`, basic], ['HRA', `${pctH}%`, hra], ['Conveyance / Fuel', `${pctC}%`, conv], ['Special Allowance', `${pctS}%`, spec]].map(([label, pct, val]) => (
                        <TableRow key={label}>
                          <TableCell sx={{ fontSize: 11, py: 0.5 }}>{label}</TableCell>
                          <TableCell align="center" sx={{ fontSize: 11, color: '#666', py: 0.5 }}>{pct}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11, fontWeight: 600, py: 0.5 }}>₹{fmt(val)}</TableCell>
                        </TableRow>
                      ))}
                      {hasIncentive && (
                        <TableRow>
                          <TableCell sx={{ fontSize: 11, color: '#e65100', fontWeight: 700, py: 0.5 }}>
                            Incentive <span style={{ fontSize: 9, fontWeight: 400 }}>(₹{fmt(pointsSalary)} − ₹{fmt(FIXED_GROSS)})</span>
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: 11, color: '#e65100', py: 0.5 }}>Variable</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, color: '#e65100', py: 0.5 }}>₹{fmt(incentive)}</TableCell>
                        </TableRow>
                      )}
                      <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 700, borderTop: '2px solid #ccc', py: 0.5 }}>Gross Salary</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid #ccc', py: 0.5 }}>₹{fmt(gross)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Typography variant="subtitle2" fontWeight={700} color={BRAND.primary} sx={{ borderBottom: `2px solid ${BRAND.primary}`, pb: 0.5, mb: 0.5, fontSize: 11 }}>Deductions</Typography>
                  <Table size="small" sx={{ mb: 1 }}>
                    <TableBody>
                      {[['Employee PF', dedPF], ['Professional Tax', dedPT], ['ESIC (if applicable)', dedESIC], ['TDS (as applicable)', dedTDS]].map(([label, val]) => (
                        <TableRow key={label}>
                          <TableCell sx={{ fontSize: 11, color: '#333', py: 0.5 }}>{label}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11, py: 0.5, color: val > 0 ? '#333' : '#bbb', fontStyle: val > 0 ? 'normal' : 'italic' }}>
                            {val > 0 ? `₹${fmt(val)}` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                        <TableCell sx={{ fontWeight: 700, borderTop: '2px solid #ccc', py: 0.5 }}>Total Deductions</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid #ccc', py: 0.5 }}>₹{fmt(totalDed)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Box sx={{ bgcolor: BRAND.primary, color: '#fff', p: 1.5, borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontWeight={700} fontSize={13}>Net Salary (Take Home)</Typography>
                    <Typography variant="h6" fontWeight={900}>₹{fmt(net)}</Typography>
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setEditModal(false)}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained" sx={{ bgcolor: BRAND.primary, fontWeight: 700 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Salary Slip?</DialogTitle>
        <DialogContent>
          {selectedSlip && (
            <Typography>
              Are you sure you want to delete the salary slip for <strong>{selectedSlip.employeeName}</strong> ({selectedSlip.month} {selectedSlip.year})?
              <br /><br />
              This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Viewer Modal */}
      <Dialog 
        open={pdfViewerOpen} 
        onClose={() => setPdfViewerOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>Salary Slip PDF</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => window.open(pdfUrl, '_blank')}
              sx={{ fontWeight: 600 }}
            >
              Open in New Tab
            </Button>
            <IconButton onClick={() => setPdfViewerOpen(false)} size="small">
              <span style={{ fontSize: 20 }}>✕</span>
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%' }}>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="Salary Slip PDF"
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
