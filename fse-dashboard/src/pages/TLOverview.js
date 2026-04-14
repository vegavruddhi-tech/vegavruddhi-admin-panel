import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress,
  Alert, Button, Avatar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Collapse, TextField, InputAdornment, Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { BRAND } from '../theme';

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusChip({ status }) {
  const map = {
    'Ready for Onboarding':          { bg: '#e6f4ea', color: '#2e7d32' },
    'Not Interested':                { bg: '#fdecea', color: '#c62828' },
    'Try but not done due to error': { bg: '#fff3e0', color: '#e65100' },
    'Need to visit again':           { bg: '#e3f2fd', color: '#1565c0' },
  };
  const s = map[status] || { bg: '#f5f5f5', color: '#555' };
  return (
    <Chip label={status || '–'} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 11, maxWidth: 180 }} />
  );
}

function FSEGroup({ fse, forms }) {
  const [expanded, setExpanded] = useState(false);
  const fseForms = forms.filter(f => f.employeeName === fse.newJoinerName);

  return (
    <Box sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
      <Box onClick={() => setExpanded(p => !p)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1, cursor: 'pointer', bgcolor: '#f9fafb',
          '&:hover': { bgcolor: '#f0f7f3' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: BRAND.primary, width: 28, height: 28, fontSize: 11, fontWeight: 700 }}>
            {initials(fse.newJoinerName)}
          </Avatar>
          <Typography fontWeight={600} fontSize={13}>{fse.newJoinerName}</Typography>
          <Typography variant="caption" color="text.secondary">{fse.location}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`${fseForms.length} forms`} size="small"
            sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </Box>
      <Collapse in={expanded}>
        {fseForms.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
            No forms submitted.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                  color: 'text.secondary', borderBottom: '2px solid', borderColor: 'divider' } }}>
                  <TableCell>Customer</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fseForms.map(f => (
                  <TableRow key={f._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell><Typography variant="body2" fontWeight={600}>{f.customerName}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{f.customerNumber}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{f.location}</Typography></TableCell>
                    <TableCell><StatusChip status={f.status} /></TableCell>
                    <TableCell>
                      <Typography variant="caption">{f.tideProduct || f.brand || f.formFillingFor || '–'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Collapse>
    </Box>
  );
}

function TLCard({ tlData, search }) {
  const [expanded, setExpanded] = useState(false);
  const { tl, fses, forms } = tlData;
  const tlName = tl.name || tl.email;

  const filteredFSEs = useMemo(() => {
    if (!search) return fses;
    const q = search.toLowerCase();
    return fses.filter(f =>
      (f.newJoinerName || '').toLowerCase().includes(q) ||
      (f.location || '').toLowerCase().includes(q)
    );
  }, [fses, search]);

  return (
    <Card sx={{ mb: 2, border: `1.5px solid ${BRAND.primaryLight || '#c8e6c9'}`, borderRadius: 2 }}>
      <Box onClick={() => setExpanded(p => !p)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: BRAND.primary, width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
            {initials(tlName)}
          </Avatar>
          <Box>
            <Typography fontWeight={700}>{tlName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {tl.location || 'No location'} · {tl.phone || ''}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`${fses.length} FSEs`} size="small"
            sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: 11 }} />
          <Chip label={`${forms.length} forms`} size="small"
            sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
          {expanded ? <ExpandLessIcon sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2.5, pb: 2 }}>
          {filteredFSEs.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>No FSEs found.</Typography>
          ) : (
            filteredFSEs.map(fse => (
              <FSEGroup key={fse._id} fse={fse} forms={forms} />
            ))
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

export default function TLOverview() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [toDate, setToDate]         = useState('');
  const [fromDate, setFromDate]     = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${EMP_API}/forms/admin/tl-overview`);
      if (!res.ok) throw new Error('Failed to load TL data');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(d =>
      (d.tl.email || d.tl.name || '').toLowerCase().includes(q) ||
      (d.tl.location || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalFSEs  = data.reduce((s, d) => s + d.fses.length, 0);
  const totalForms = data.reduce((s, d) => s + d.forms.length, 0);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>TL Overview</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All Team Leaders with their FSEs and merchant submissions
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}
          sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}>
          Refresh
        </Button>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Total TLs',   value: data.length,  color: BRAND.primary, bg: '#e6f4ea' },
          { label: 'Total FSEs',  value: totalFSEs,    color: '#1565c0',     bg: '#e3f2fd' },
          { label: 'Total Forms', value: totalForms,   color: '#e65100',     bg: '#fff3e0' },
        ].map(k => (
          <Card key={k.label} sx={{ borderRadius: 3, border: `1.5px solid ${k.color}20` }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>{k.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <TextField fullWidth size="small" placeholder="Search by TL name or location…"
        value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 3 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }} />

      {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BRAND.primary }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6, border: `1.5px dashed ${BRAND.primaryLight}` }}>
          <Typography color="text.secondary">No TLs found.</Typography>
        </Card>
      ) : (
        filtered.map((tlData, i) => (
          <TLCard key={tlData.tl._id || i} tlData={tlData} search={search} />
        ))
      )}
    </Box>
  );
}
