import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, TextField, Card, CardContent,
  Grid, CircularProgress, Alert, InputAdornment, TableSortLabel,
  Tooltip, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, IconButton, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import RepeatIcon from '@mui/icons-material/Repeat';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';

const EMP_BASE = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

function AttendanceManagement({ onReady }) {
  const [allRecords, setAllRecords]     = useState([]);
  const [summary, setSummary]           = useState({ totalPresent: 0, totalAbsent: 0, totalRelogins: 0 });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'present' | 'absent'
  const [filterRole, setFilterRole]     = useState('all'); // 'all' | 'employee' | 'teamlead' | 'manager'
  const [sortField, setSortField]       = useState('status');
  const [sortDir, setSortDir]           = useState('asc');
  const [now, setNow]                   = useState(new Date());
  const [teamModal, setTeamModal]       = useState(null); // { tl: record }
  const [teamFilter, setTeamFilter]     = useState('all'); // 'all' | 'present' | 'absent'

  // Monthly view state
  const [viewMode, setViewMode]         = useState('daily'); // 'daily' | 'monthly'
  const [monthRecords, setMonthRecords] = useState([]);
  const [monthSummary, setMonthSummary] = useState({ workingDays: 0, totalDaysInMonth: 30, totalPeople: 0, fullAttendance: 0, neverPresent: 0, avgPresentDays: 0 });
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthSearch, setMonthSearch]   = useState('');
  const [monthRoleFilter, setMonthRoleFilter] = useState('all'); // 'all' | 'employee' | 'teamlead' | 'manager'

  // Tick every minute to update live durations
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (viewMode === 'daily') {
      fetchFull();
      fetchSummary();
    }
  }, [selectedDate, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchMonthly();
    }
  }, [viewMode, selectedMonthYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMonthly = async () => {
    setMonthLoading(true);
    setError('');
    try {
      const [year, month] = selectedMonthYear.split('-');
      const res = await fetch(`${EMP_BASE}/attendance/admin/monthly?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Failed to fetch monthly attendance');
      const data = await res.json();
      setMonthRecords(data.records || []);
      setMonthSummary({
        workingDays: data.workingDays || 0,
        totalDaysInMonth: data.totalDaysInMonth || 30,
        totalPeople: data.totalPeople || 0,
        fullAttendance: data.fullAttendance || 0,
        neverPresent: data.neverPresent || 0,
        avgPresentDays: data.avgPresentDays || 0
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load monthly attendance data');
    } finally {
      setMonthLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && onReady) {
      onReady();
    }
  }, [loading, onReady]);

  const fetchFull = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${EMP_BASE}/attendance/admin/full?date=${selectedDate}`);
      if (!res.ok && res.status !== 304) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      setAllRecords(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${EMP_BASE}/attendance/admin/summary?date=${selectedDate}`);
      if (!res.ok && res.status !== 304) throw new Error();
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      // silent
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Filter + search
  const filtered = allRecords
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r => filterRole === 'all' || r.userType === filterRole)
    .filter(r => {
      const q = search.toLowerCase();
      return (
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userEmail || '').toLowerCase().includes(q) ||
        (r.userType || '').toLowerCase().includes(q) ||
        (r.position || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q)
      );
    });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField] ?? '';
    let bVal = b[sortField] ?? '';
    if (sortField === 'firstLoginTime' || sortField === 'lastActivityTime') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const fseCount      = allRecords.filter(r => r.userType === 'employee').length;
  const tlCount       = allRecords.filter(r => r.userType === 'teamlead').length;
  const managerCount  = allRecords.filter(r => r.userType === 'manager').length;

  // Monthly filtered & sorted records
  const filteredMonthRecords = monthRecords.filter(r => {
    if (monthRoleFilter !== 'all' && r.userType !== monthRoleFilter) return false;
    if (monthSearch) {
      const q = monthSearch.toLowerCase();
      return (
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userEmail || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.position || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Attendance Management
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, val) => val && setViewMode(val)}
            size="small"
            sx={{
              bgcolor: '#fff',
              border: '1px solid #c8e6c9',
              borderRadius: '8px',
              '& .MuiToggleButton-root': {
                px: 2.5,
                py: 0.75,
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'none',
                color: '#555',
                border: 'none',
                '&.Mui-selected': {
                  bgcolor: '#1b5e20',
                  color: '#fff',
                  '&:hover': { bgcolor: '#2e7d32' }
                }
              }
            }}
          >
            <ToggleButton value="daily">Daily View</ToggleButton>
            <ToggleButton value="monthly">Monthly View</ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            startIcon={(loading || monthLoading) ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => {
              if (viewMode === 'monthly') {
                fetchMonthly();
              } else {
                fetchFull();
                fetchSummary();
              }
            }}
            disabled={loading || monthLoading}
            sx={{ borderColor: '#2e7d32', color: '#2e7d32', fontWeight: 700, '&:hover': { bgcolor: '#e8f5e9', borderColor: '#2e7d32' } }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* ── Daily View Content ──────────────────────────────────────── */}
      {viewMode === 'daily' && (
        <>

      {/* ── Summary Cards ─────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleIcon sx={{ color: '#2e7d32', fontSize: 36 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Present Today</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#2e7d32', lineHeight: 1 }}>
                  {summary.totalPresent}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#ffebee', borderLeft: '4px solid #c62828' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonOffIcon sx={{ color: '#c62828', fontSize: 36 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Absent Today</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#c62828', lineHeight: 1 }}>
                  {summary.totalAbsent}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #ef6c00' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <RepeatIcon sx={{ color: '#ef6c00', fontSize: 36 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Re-logins</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#ef6c00', lineHeight: 1 }}>
                  {summary.totalRelogins}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Controls ──────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
        {/* Date picker */}
        <TextField
          type="date"
          label="Select Date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ minWidth: 180 }}
        />

        {/* Search */}
        <TextField
          placeholder="Search name, email, type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {/* Status filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={e => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All ({allRecords.length})</MenuItem>
            <MenuItem value="present">Present ({summary.totalPresent})</MenuItem>
            <MenuItem value="absent">Absent ({summary.totalAbsent})</MenuItem>
          </Select>
        </FormControl>

        {/* Role filter */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Role</InputLabel>
          <Select
            value={filterRole}
            label="Role"
            onChange={e => setFilterRole(e.target.value)}
          >
            <MenuItem value="all">All Roles ({allRecords.length})</MenuItem>
            <MenuItem value="employee">FSE ({fseCount})</MenuItem>
            <MenuItem value="teamlead">TL ({tlCount})</MenuItem>
            <MenuItem value="manager">Manager ({managerCount})</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Table ─────────────────────────────────────────── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'userName'}
                    direction={sortField === 'userName' ? sortDir : 'asc'}
                    onClick={() => handleSort('userName')}
                  >Name</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'userType'}
                    direction={sortField === 'userType' ? sortDir : 'asc'}
                    onClick={() => handleSort('userType')}
                  >Type</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Position</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'firstLoginTime'}
                    direction={sortField === 'firstLoginTime' ? sortDir : 'asc'}
                    onClick={() => handleSort('firstLoginTime')}
                  >Login Time</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Activity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Re-logins</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === 'status'}
                    direction={sortField === 'status' ? sortDir : 'asc'}
                    onClick={() => handleSort('status')}
                  >Status</TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                      No records found for {selectedDate}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((record, idx) => {
                  const isAbsent = record.status === 'absent';
                  return (
                    <TableRow
                      key={record._id || `absent-${record.userId}`}
                      hover
                      onClick={record.userType === 'teamlead' ? () => { setTeamModal({ tl: record }); setTeamFilter('all'); } : undefined}
                      sx={{
                        bgcolor: isAbsent ? 'rgba(198,40,40,0.04)' : 'inherit',
                        opacity: isAbsent ? 0.85 : 1,
                        cursor: record.userType === 'teamlead' ? 'pointer' : 'default',
                      }}
                    >
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {record.userName || '—'}
                          </Typography>
                          {record.userType === 'teamlead' && (
                            <Tooltip title="Click to view team attendance">
                              <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.7rem' }}>
                                👥
                              </Typography>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                          {record.userEmail || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.userType}
                          size="small"
                          color={
                            record.userType === 'manager' ? 'secondary' :
                            record.userType === 'teamlead' ? 'warning' : 'primary'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
                          {record.position || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
                          {record.location || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
                          {record.phone || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {isAbsent ? (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {formatTime(record.firstLoginTime)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAbsent ? (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        ) : (
                          <Typography variant="body2" fontWeight="bold">
                            {formatTime(record.lastActivityTime)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.duration ? (
                          <Tooltip title={`${record.duration.toFixed(2)} hours`}>
                            <Typography variant="body2" fontWeight="bold">
                              {record.duration.toFixed(1)}h
                            </Typography>
                          </Tooltip>
                        ) : record.firstLoginTime ? (
                          // Live duration — still logged in
                          <Tooltip title="Live — still logged in">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{
                                width: 7, height: 7, borderRadius: '50%',
                                bgcolor: '#22c55e',
                                animation: 'pulse 1.5s ease-in-out infinite',
                                '@keyframes pulse': {
                                  '0%, 100%': { opacity: 1 },
                                  '50%': { opacity: 0.3 },
                                }
                              }} />
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                {(() => {
                                  const ms = now - new Date(record.firstLoginTime);
                                  const hrs = Math.floor(ms / 3600000);
                                  const mins = Math.floor((ms % 3600000) / 60000);
                                  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                                })()}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAbsent ? (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        ) : record.reloginCount > 0 ? (
                          <Chip label={`${record.reloginCount}x`} size="small" color="warning" />
                        ) : (
                          <Chip label="0x" size="small" color="default" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          color={
                            record.status === 'present' ? 'success' :
                            record.status === 'absent'  ? 'error'   :
                            record.status === 'half-day'? 'warning' : 'default'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Footer count */}
      {!loading && sorted.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Showing {sorted.length} of {allRecords.length} employees
        </Typography>
      )}

      {/* ── Team Modal ─────────────────────────────────────── */}
      {teamModal && (() => {
        const tl = teamModal.tl;
        const tlName = tl.userName || '';

        // Find all FSEs whose reportingManager matches this TL's name
        const teamMembers = allRecords.filter(r =>
          r.userType === 'employee' &&
          (r.reportingManager || '').toLowerCase().trim() === tlName.toLowerCase().trim()
        );

        const presentTeam = teamMembers.filter(r => r.status === 'present');
        const absentTeam  = teamMembers.filter(r => r.status === 'absent');

        return (          <Dialog
            open
            onClose={() => setTeamModal(null)}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{
              background: 'linear-gradient(90deg, #071a0f 0%, #1a5c38 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <Box>
                <Typography fontWeight={800} fontSize={16}>
                  👥 {tlName} — Team Attendance
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {tl.location || ''} · {selectedDate}
                </Typography>
              </Box>
              <IconButton onClick={() => setTeamModal(null)} sx={{ color: '#fff' }} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
              {/* TL own status */}
              <Box sx={{
                p: 2, mb: 2, borderRadius: 2,
                bgcolor: tl.status === 'present' ? '#e8f5e9' : '#ffebee',
                border: `1.5px solid ${tl.status === 'present' ? '#2e7d32' : '#c62828'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1
              }}>
                <Box>
                  <Typography fontWeight={700} fontSize={14}>TL Status: {tlName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tl.userEmail} · {tl.phone || '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {tl.status === 'present' && (
                    <>
                      <Typography variant="body2" color="text.secondary">Login: {formatTime(tl.firstLoginTime)}</Typography>
                      {tl.duration ? (
                        <Chip label={`${tl.duration.toFixed(1)}h`} size="small" color="success" />
                      ) : tl.firstLoginTime ? (
                        <Chip label={(() => {
                          const ms = now - new Date(tl.firstLoginTime);
                          const hrs = Math.floor(ms / 3600000);
                          const mins = Math.floor((ms % 3600000) / 60000);
                          return hrs > 0 ? `${hrs}h ${mins}m 🟢` : `${mins}m 🟢`;
                        })()} size="small" color="success" />
                      ) : null}
                    </>
                  )}
                  <Chip
                    label={tl.status}
                    size="small"
                    color={tl.status === 'present' ? 'success' : 'error'}
                  />
                </Box>
              </Box>

              {/* Team summary */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip
                  label={`✅ ${presentTeam.length} Present`}
                  color="success"
                  variant={teamFilter === 'present' ? 'filled' : 'outlined'}
                  clickable
                  onClick={() => setTeamFilter(f => f === 'present' ? 'all' : 'present')}
                />
                <Chip
                  label={`❌ ${absentTeam.length} Absent`}
                  color="error"
                  variant={teamFilter === 'absent' ? 'filled' : 'outlined'}
                  clickable
                  onClick={() => setTeamFilter(f => f === 'absent' ? 'all' : 'absent')}
                />
                <Chip
                  label={`Total: ${teamMembers.length}`}
                  variant={teamFilter === 'all' ? 'filled' : 'outlined'}
                  clickable
                  onClick={() => setTeamFilter('all')}
                />
              </Box>

              {teamMembers.length === 0 ? (
                <Alert severity="info">No FSEs found under {tlName} for this date.</Alert>
              ) : (
                <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                      <TableRow>
                        {['#', 'Name', 'Location', 'Phone', 'Login Time', 'Duration', 'Status'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Present first, then absent — filtered by teamFilter */}
                      {[...presentTeam, ...absentTeam]
                        .filter(m => teamFilter === 'all' || m.status === teamFilter)
                        .map((member, i) => {
                        const isAbs = member.status === 'absent';
                        return (
                          <TableRow key={member._id || `t-${i}`} hover
                            sx={{ bgcolor: isAbs ? 'rgba(198,40,40,0.04)' : 'inherit' }}>
                            <TableCell sx={{ color: '#888', fontSize: 11 }}>{i + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} fontSize={12}>
                                {member.userName || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontSize: 11 }}>{member.location || '—'}</TableCell>
                            <TableCell sx={{ fontSize: 11 }}>{member.phone || '—'}</TableCell>
                            <TableCell sx={{ fontSize: 11 }}>
                              {isAbs ? '—' : formatTime(member.firstLoginTime)}
                            </TableCell>
                            <TableCell>
                              {member.duration ? (
                                <Typography variant="body2" fontWeight="bold" fontSize={11}>
                                  {member.duration.toFixed(1)}h
                                </Typography>
                              ) : member.firstLoginTime ? (
                                <Typography variant="body2" color="success.main" fontWeight="bold" fontSize={11}>
                                  {(() => {
                                    const ms = now - new Date(member.firstLoginTime);
                                    const hrs = Math.floor(ms / 3600000);
                                    const mins = Math.floor((ms % 3600000) / 60000);
                                    return hrs > 0 ? `${hrs}h ${mins}m 🟢` : `${mins}m 🟢`;
                                  })()}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.disabled" fontSize={11}>—</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={member.status}
                                size="small"
                                color={member.status === 'present' ? 'success' : 'error'}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
          </Dialog>
        );
      })()}
        </>
      )}

      {/* ── Monthly View Content ────────────────────────────────────── */}
      {viewMode === 'monthly' && (
        <>
          {/* Monthly Summary Cards exactly matching reference UI */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: '14px 18px !important' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {new Date(parseInt(selectedMonthYear.split('-')[0], 10), parseInt(selectedMonthYear.split('-')[1], 10) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#1b5e20', mt: 0.5, lineHeight: 1.1 }}>
                    {monthSummary.workingDays} <Typography component="span" sx={{ fontSize: '14px', fontWeight: 600, color: '#444' }}>working days</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#666', mt: 0.5 }}>
                    Total {monthSummary.totalDaysInMonth} days in month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: '14px 18px !important' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#1565c0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total People
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#0d47a1', mt: 0.5, lineHeight: 1.1 }}>
                    {monthSummary.totalPeople}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#555', mt: 0.5 }}>
                    Active staff across roles
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: '14px 18px !important' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Full Attendance
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#1b5e20', mt: 0.5, lineHeight: 1.1 }}>
                    {monthSummary.fullAttendance}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#555', mt: 0.5 }}>
                    100% presence so far
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: '14px 18px !important' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#c62828', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Never Present
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#b71c1c', mt: 0.5, lineHeight: 1.1 }}>
                    {monthSummary.neverPresent}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#555', mt: 0.5 }}>
                    0 days present in month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: '#fff8e1', border: '1px solid #ffecb3', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: '14px 18px !important' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#f57f17', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Avg Present Days
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#e65100', mt: 0.5, lineHeight: 1.1 }}>
                    {monthSummary.avgPresentDays}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#555', mt: 0.5 }}>
                    Average per employee
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Monthly Controls */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
            <TextField
              type="month"
              label="Select Month"
              value={selectedMonthYear}
              onChange={e => setSelectedMonthYear(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 180 }}
            />

            <TextField
              placeholder="Search name, email, phone..."
              value={monthSearch}
              onChange={e => setMonthSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 240 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Role Filter</InputLabel>
              <Select
                label="Role Filter"
                value={monthRoleFilter}
                onChange={e => setMonthRoleFilter(e.target.value)}
              >
                <MenuItem value="all">All Roles ({monthRecords.length})</MenuItem>
                <MenuItem value="employee">FSE ({monthRecords.filter(r => r.userType === 'employee').length})</MenuItem>
                <MenuItem value="teamlead">Team Lead ({monthRecords.filter(r => r.userType === 'teamlead').length})</MenuItem>
                <MenuItem value="manager">Manager ({monthRecords.filter(r => r.userType === 'manager').length})</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Monthly Table */}
          {monthLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
              <CircularProgress color="success" />
            </Box>
          ) : filteredMonthRecords.length === 0 ? (
            <Alert severity="info">No employees or attendance found for this month.</Alert>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#f8f9fa', fontWeight: 700, fontSize: 13 } }}>
                    <TableCell width="40">#</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>TL / Manager</TableCell>
                    <TableCell align="center">Days Present</TableCell>
                    <TableCell align="center">Days Absent</TableCell>
                    <TableCell align="center">Attendance %</TableCell>
                    <TableCell width="320">Attendance Bar ({monthSummary.workingDays || monthSummary.totalDaysInMonth} Days)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMonthRecords.map((row, index) => {
                    const roleColor = row.userType === 'teamlead' ? 'warning' : row.userType === 'manager' ? 'info' : 'default';
                    const roleLabel = row.userType === 'teamlead' ? 'TL' : row.userType === 'manager' ? 'Manager' : 'FSE';
                    return (
                      <TableRow key={row._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ color: '#888', fontSize: 12 }}>{index + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#212121' }}>
                            {row.userName}
                          </Typography>
                          {row.userEmail && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#777' }}>
                              {row.userEmail}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={roleLabel}
                            size="small"
                            color={roleColor}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '11px', height: 22 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#555' }}>
                          {row.reportingManager || '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 800, color: row.daysPresent > 0 ? '#2e7d32' : '#c62828' }}>
                            {row.daysPresent}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#c62828' }}>
                            {row.daysAbsent}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${row.attendancePercent}%`}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '11px',
                              height: 24,
                              bgcolor: row.attendancePercent >= 75 ? '#e8f5e9' : row.attendancePercent >= 40 ? '#fff8e1' : '#ffebee',
                              color: row.attendancePercent >= 75 ? '#2e7d32' : row.attendancePercent >= 40 ? '#e65100' : '#c62828'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ flexGrow: 1, height: 10, bgcolor: '#f5f5f5', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                              <Box
                                sx={{
                                  width: `${Math.min(100, Math.max(0, (row.daysPresent / Math.max(1, monthSummary.workingDays || monthSummary.totalDaysInMonth)) * 100))}%`,
                                  height: '100%',
                                  bgcolor: row.attendancePercent >= 75 ? '#2e7d32' : row.attendancePercent >= 40 ? '#f57f17' : row.daysPresent > 0 ? '#ef6c00' : '#e53935',
                                  borderRadius: 5,
                                  transition: 'width 0.4s ease'
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#444', minWidth: 46, textAlign: 'right', fontSize: '12px' }}>
                              {row.daysPresent}/{monthSummary.workingDays || monthSummary.totalDaysInMonth}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}

export default AttendanceManagement;
