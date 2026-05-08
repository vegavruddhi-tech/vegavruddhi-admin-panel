import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress,
  Alert, Button, Avatar, TextField, InputAdornment, Collapse, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { BRAND } from '../theme';

const EMP_API = process.env.REACT_APP_EMPLOYEE_API_URL || 'http://localhost:4000/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── FSE row inside a TL card ──────────────────────────────────────────────────

function FSERow({ fse, formCount }) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1, borderBottom: '1px solid #f0f0f0',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: '#f9fafb' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1565c0', width: 26, height: 26, fontSize: 10, fontWeight: 700 }}>
          {initials(fse.newJoinerName)}
        </Avatar>
        <Box>
          <Typography fontSize={13} fontWeight={600}>{fse.newJoinerName || '–'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {[fse.location, fse.newJoinerPhone, fse.email || fse.newJoinerEmailId].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
      </Box>
      <Chip
        label={`${formCount} form${formCount !== 1 ? 's' : ''}`}
        size="small"
        sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }}
      />
    </Box>
  );
}

// ── TL card inside a Manager card ────────────────────────────────────────────

function TLCard({ tlData }) {
  const [expanded, setExpanded] = useState(false);
  const { tl, fses, forms } = tlData;
  const tlName = tl.name || tl.email;

  return (
    <Box sx={{ mb: 1.5, border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
      {/* TL header row */}
      <Box
        onClick={() => setExpanded(p => !p)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.2, cursor: 'pointer', bgcolor: '#f5f9f6',
          '&:hover': { bgcolor: '#edf5ef' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: BRAND.primaryMid, width: 30, height: 30, fontSize: 11, fontWeight: 700 }}>
            {initials(tlName)}
          </Avatar>
          <Box>
            <Typography fontWeight={700} fontSize={13}>{tlName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {[tl.location, tl.phone, tl.email].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`${fses.length} FSEs`} size="small"
            sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: 11 }} />
          <Chip label={`${forms.length} forms`} size="small"
            sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
          {expanded ? <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
        </Box>
      </Box>

      {/* FSE list */}
      <Collapse in={expanded}>
        {fses.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
            No FSEs found.
          </Typography>
        ) : (
          fses.map(fse => {
            const fseFormCount = forms.filter(f => f.employeeName === fse.newJoinerName).length;
            return <FSERow key={fse._id} fse={fse} formCount={fseFormCount} />;
          })
        )}
      </Collapse>
    </Box>
  );
}

// ── Manager card ─────────────────────────────────────────────────────────────

function ManagerCard({ manager, tlsData, search }) {
  const [expanded, setExpanded] = useState(false);
  const [tlDrill, setTlDrill]   = useState(null); // { type, tls }
  const isOpen = expanded;

  // Filter TLs by search
  const filteredTLs = useMemo(() => {
    if (!search) return tlsData;
    const q = search.toLowerCase();
    return tlsData.filter(d =>
      (d.tl.name || d.tl.email || '').toLowerCase().includes(q) ||
      (d.tl.location || '').toLowerCase().includes(q)
    );
  }, [tlsData, search]);

  const totalFSEs  = tlsData.reduce((s, d) => s + d.fses.length, 0);
  const totalForms = tlsData.reduce((s, d) => s + d.forms.length, 0);

  return (
    <Card
      sx={{
        mb: 2.5,
        border: `1.5px solid ${BRAND.primaryLight}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Manager header */}
      <Box
        onClick={() => setExpanded(p => !p)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.8, cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={manager.image || undefined}
            sx={{ bgcolor: BRAND.primary, width: 40, height: 40, fontSize: 14, fontWeight: 700 }}
          >
            {initials(manager.name)}
          </Avatar>
          <Box>
            <Typography fontWeight={800} fontSize={15}>{manager.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {[manager.location, manager.phone, manager.email].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Chip label={`${tlsData.length} TL${tlsData.length !== 1 ? 's' : ''}`} size="small"
            sx={{ bgcolor: '#f3e8ff', color: '#7c3aed', fontWeight: 700, fontSize: 11 }} />
          {/* Active / Inactive TL chips */}
          {(() => {
            const active   = tlsData.filter(d => d.forms.length > 0);
            const inactive = tlsData.filter(d => d.forms.length === 0);
            return (
              <>
                <Chip label={`✅ ${active.length} Active`} size="small" clickable
                  onClick={e => { e.stopPropagation(); setTlDrill({ type: 'Active', tls: active }); }}
                  sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11, '&:hover': { bgcolor: '#c8e6c9' } }} />
                {inactive.length > 0 && (
                  <Chip label={`⚪ ${inactive.length} Inactive`} size="small" clickable
                    onClick={e => { e.stopPropagation(); setTlDrill({ type: 'Inactive', tls: inactive }); }}
                    sx={{ bgcolor: '#f5f5f5', color: '#757575', fontWeight: 700, fontSize: 11, '&:hover': { bgcolor: '#e0e0e0' } }} />
                )}
              </>
            );
          })()}
          <Chip label={`${totalFSEs} FSEs`} size="small"
            sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: 11 }} />
          <Chip label={`${totalForms} forms`} size="small"
            sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
          {isOpen
            ? <ExpandLessIcon sx={{ color: 'text.secondary' }} />
            : <ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        </Box>
      </Box>

      {/* TL drill-down modal */}
      {tlDrill && (
        <Dialog open onClose={() => setTlDrill(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}
          onClick={e => e.stopPropagation()}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Box>
              <Typography fontWeight={800} fontSize={16} sx={{ color: tlDrill.type === 'Active' ? '#2e7d32' : '#757575' }}>
                {tlDrill.type === 'Active' ? '✅ Active' : '⚪ Inactive'} TLs — {manager.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">{tlDrill.tls.length} TL{tlDrill.tls.length !== 1 ? 's' : ''}</Typography>
            </Box>
            <IconButton onClick={() => setTlDrill(null)} size="small"><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 0 }}>
            {tlDrill.tls.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No TLs in this category.</Typography>
            ) : (
              tlDrill.tls.map((d, i) => {
                const tlName = d.tl.name || d.tl.email;
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 'none' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: BRAND.primary, width: 32, height: 32, fontSize: 11, fontWeight: 700 }}>
                        {initials(tlName)}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={700} fontSize={13}>{tlName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[d.tl.location, d.tl.phone].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={`${d.fses.length} FSEs`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: 11 }} />
                      <Chip label={`${d.forms.length} forms`} size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
                    </Box>
                  </Box>
                );
              })
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setTlDrill(null)} variant="contained" sx={{ bgcolor: BRAND.primary, fontWeight: 700, borderRadius: 2 }}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* TL list */}
      <Collapse in={isOpen}>
        <Box sx={{ px: 2.5, pb: 2, pt: 0.5 }}>
          {filteredTLs.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
              {search ? 'No TLs match the search.' : 'No TLs assigned to this manager.'}
            </Typography>
          ) : (
            filteredTLs.map(tlData => (
              <TLCard key={tlData.tl._id || tlData.tl.email} tlData={tlData} />
            ))
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, color, active, onClick }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: 3,
        border: `1.5px solid ${active ? color : color + '20'}`,
        background: active ? color + '12' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 16px ${color}30` },
        boxShadow: active ? `0 4px 16px ${color}40` : undefined,
      }}
    >
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        <Typography variant="h4" fontWeight={800} sx={{ color }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Unassigned TLs section ────────────────────────────────────────────────────

function UnassignedTLsCard({ tlsData, search }) {
  const [expanded, setExpanded] = useState(false);

  const filteredTLs = useMemo(() => {
    if (!search) return tlsData;
    const q = search.toLowerCase();
    return tlsData.filter(d =>
      (d.tl.name || d.tl.email || '').toLowerCase().includes(q) ||
      (d.tl.location || '').toLowerCase().includes(q)
    );
  }, [tlsData, search]);

  if (tlsData.length === 0) return null;

  return (
    <Card
      sx={{
        mb: 2.5,
        border: '1.5px solid #e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={() => setExpanded(p => !p)}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.8, cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#9e9e9e', width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>?</Avatar>
          <Box>
            <Typography fontWeight={800} fontSize={15} color="text.secondary">Unassigned TLs</Typography>
            <Typography variant="caption" color="text.secondary">
              TLs with no matching manager
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`${tlsData.length} TL${tlsData.length !== 1 ? 's' : ''}`} size="small"
            sx={{ bgcolor: '#f5f5f5', color: '#757575', fontWeight: 700, fontSize: 11 }} />
          {expanded ? <ExpandLessIcon sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        </Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2.5, pb: 2, pt: 0.5 }}>
          {filteredTLs.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>No TLs match the search.</Typography>
          ) : (
            filteredTLs.map(tlData => (
              <TLCard key={tlData.tl._id || tlData.tl.email} tlData={tlData} />
            ))
          )}
        </Box>
      </Collapse>
    </Card>
  );
}

// ── Manager Pie Charts ────────────────────────────────────────────────────────
function ManagerPieCharts({ managerGroups }) {
  const [drillDown, setDrillDown] = useState(null); // { managerName, type, tls }

  if (!managerGroups || managerGroups.length === 0) return null;
  const withTLs = managerGroups.filter(g => g.tls.length > 0);
  if (withTLs.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body1" fontWeight={700} sx={{ color: BRAND.primary, mb: 2 }}>
        Working Team Performance (Ready for Onboarding)
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {withTLs.map(g => {
          // Count all TLs (remove working status filter)
          const allTLs = g.tls;
          
          // TLs with "Ready for Onboarding" forms
          const performingTLs = allTLs.filter(d => 
            d.forms.some(f => f.status === 'Ready for Onboarding')
          );
          
          // TLs without "Ready for Onboarding" forms
          const nonPerformingTLs = allTLs.filter(d => 
            !d.forms.some(f => f.status === 'Ready for Onboarding')
          );
          
          const totalFSEs = allTLs.reduce((s, d) => s + d.fses.length, 0);
          
          const onboardingForms = allTLs.reduce((s, d) => 
            s + d.forms.filter(f => f.status === 'Ready for Onboarding').length, 0
          );
          
          const pct = allTLs.length > 0 ? Math.round((performingTLs.length / allTLs.length) * 100) : 0;
          
          const data = [
            { name: 'With Onboarding',   value: performingTLs.length,   color: '#2e7d32', tls: performingTLs },
            { name: 'Without Onboarding', value: nonPerformingTLs.length, color: '#e0e0e0', tls: nonPerformingTLs },
          ].filter(d => d.value > 0);

          return (
            <Card key={g.manager._id} sx={{
              borderRadius: 3, border: `1.5px solid ${BRAND.primaryLight}`, p: 2,
              transition: 'all 0.2s',
              '&:hover': { boxShadow: `0 4px 20px ${BRAND.primary}20`, transform: 'translateY(-2px)' }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar sx={{ bgcolor: BRAND.primary, width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                  {initials(g.manager.name)}
                </Avatar>
                <Box>
                  <Typography fontWeight={800} fontSize={14} sx={{ color: BRAND.primary }}>{g.manager.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{g.manager.location || 'No location'}</Typography>
                </Box>
              </Box>

              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                    dataKey="value" paddingAngle={4} startAngle={90} endAngle={-270}
                    cursor="pointer" activeShape={null} activeIndex={null}
                    onClick={(entry) => {
                      if (entry?.tls) setDrillDown({ managerName: g.manager.name, type: entry.name, tls: entry.tls });
                    }}>
                    {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" strokeWidth={0} />)}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val, name) => [`${val} TLs — click to view`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, background: '#1a4731', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>

              <Typography variant="h5" fontWeight={800} sx={{ textAlign: 'center', color: BRAND.primary, mt: -2, mb: 0.5 }}>
                {pct}%
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mb: 1.5 }}>
                Performance Rate
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-around', pt: 1.5, borderTop: '1px solid #f0f0f0' }}>
                <Box sx={{ textAlign: 'center', cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                  onClick={() => setDrillDown({ managerName: g.manager.name, type: 'With Onboarding', tls: performingTLs })}>
                  <Typography fontWeight={800} fontSize={16} sx={{ color: '#2e7d32' }}>{performingTLs.length}</Typography>
                  <Typography variant="caption" color="text.secondary">TLs</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography fontWeight={800} fontSize={16} sx={{ color: '#1565c0' }}>{totalFSEs}</Typography>
                  <Typography variant="caption" color="text.secondary">FSEs</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography fontWeight={800} fontSize={16} sx={{ color: '#2e7d32' }}>{onboardingForms}</Typography>
                  <Typography variant="caption" color="text.secondary">Onboarding</Typography>
                </Box>
              </Box>
            </Card>
          );
        })}
      </Box>

      {/* Drill-down modal */}
      {drillDown && (
        <Dialog open onClose={() => setDrillDown(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Box>
              <Typography fontWeight={800} fontSize={16} sx={{ color: drillDown.type === 'With Onboarding' ? '#2e7d32' : '#9e9e9e' }}>
                {drillDown.type === 'With Onboarding' ? '✅' : '⚪'} {drillDown.type} — {drillDown.managerName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {drillDown.tls.length} TL{drillDown.tls.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <IconButton onClick={() => setDrillDown(null)} size="small"><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 0 }}>
            {drillDown.tls.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No TLs in this category.</Typography>
            ) : (
              drillDown.tls.map((d, i) => {
                const tlName = d.tl.name || d.tl.email;
                const onboardingCount = d.forms.filter(f => f.status === 'Ready for Onboarding').length;
                const totalFSEs = d.fses.length;
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 'none' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: BRAND.primary, width: 32, height: 32, fontSize: 11, fontWeight: 700 }}>
                        {initials(tlName)}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={700} fontSize={13}>{tlName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[d.tl.location, d.tl.phone].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={`${totalFSEs} FSEs`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: 11 }} />
                      <Chip label={`${onboardingCount} Onboarding`} size="small" sx={{ bgcolor: '#e6f4ea', color: '#2e7d32', fontWeight: 700, fontSize: 11 }} />
                    </Box>
                  </Box>
                );
              })
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDrillDown(null)} variant="contained" sx={{ bgcolor: BRAND.primary, fontWeight: 700, borderRadius: 2 }}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

// ── KPI Detail Modal ─────────────────────────────────────────────────────────
function KpiModal({ kpiModal, onClose }) {
  const [modalSearch, setModalSearch] = useState('');
  if (!kpiModal) return null;

  const rows = kpiModal.rows || [];
  const filtered = modalSearch
    ? rows.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(modalSearch.toLowerCase())))
    : rows;
  const keys = Object.keys(rows[0] || {});
  const headerMap = {
    managers: ['Name', 'Phone', 'Email', 'Location', 'Status'],
    tls:      ['Name', 'Phone', 'Email', 'Location', 'Manager', 'FSEs', 'Forms'],
    fses:     ['Name', 'Phone', 'Email', 'Location', 'TL', 'Forms'],
    forms:    ['Customer', 'Phone', 'FSE', 'Product', 'Status', 'Date'],
  };
  const headers = headerMap[kpiModal.type] || keys.map(k => k.charAt(0).toUpperCase() + k.slice(1));

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography fontWeight={800} fontSize={18} sx={{ color: BRAND.primary }}>{kpiModal.title}</Typography>
          <Typography variant="caption" color="text.secondary">{rows.length} records</Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <TextField fullWidth size="small" placeholder="Search…" value={modalSearch}
          onChange={e => setModalSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ mb: 2 }} />
        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#e65100', color: '#fff', fontSize: 12 }}>#</TableCell>
                {headers.map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#e65100', color: '#fff', fontSize: 12 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row, i) => (
                <TableRow key={i} hover sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' } }}>
                  <TableCell sx={{ fontSize: 12, color: '#888' }}>{i + 1}</TableCell>
                  {keys.map(k => (
                    <TableCell key={k} sx={{ fontSize: 12 }}>
                      {k === 'status' ? (
                        <Chip label={row[k] || '–'} size="small"
                          sx={{
                            bgcolor: row[k] === 'Ready for Onboarding' ? '#e6f4ea' : row[k] === 'Not Interested' ? '#fdecea' : '#fff3e0',
                            color:   row[k] === 'Ready for Onboarding' ? '#2e7d32' : row[k] === 'Not Interested' ? '#c62828' : '#e65100',
                            fontWeight: 700, fontSize: 10
                          }} />
                      ) : (row[k] ?? '–')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: '#e65100', fontWeight: 700, borderRadius: 2 }}>
          CLOSE
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ManagerOverview() {
  const [tlData,      setTlData]      = useState([]);
  const [managers,    setManagers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [activeKPI,   setActiveKPI]   = useState(null);
  const [kpiModal,    setKpiModal]    = useState(null);
  const [selYear,     setSelYear]     = useState(new Date().getFullYear().toString());
  const [selMonth,    setSelMonth]    = useState(new Date().getMonth().toString());
  const [dateFilter,  setDateFilter]  = useState('all');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tlRes, mgrRes] = await Promise.all([
        fetch(`${EMP_API}/forms/admin/tl-overview`),
        fetch(`${EMP_API}/manager/approved-list`),
      ]);
      if (!tlRes.ok)  throw new Error('Failed to load TL overview data');
      if (!mgrRes.ok) throw new Error('Failed to load manager list');
      const [tlJson, mgrJson] = await Promise.all([tlRes.json(), mgrRes.json()]);
      setTlData(tlJson);
      setManagers(mgrJson);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group tl-overview entries by manager name — apply date/year/month filter to forms
  const { managerGroups, unassigned } = useMemo(() => {
    const groups = {};
    const unassignedTLs = [];

    managers.forEach(m => { groups[m._id] = { manager: m, tls: [] }; });

    tlData.forEach(entry => {
      // Filter forms by date/year/month if selected
      let filteredForms = entry.forms.filter(f => {
        const formDate = new Date(f.createdAt);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Apply date filter
        if (dateFilter === 'today' && formDate < today) return false;
        if (dateFilter === 'week' && formDate < weekStart) return false;
        if (dateFilter === 'month' && formDate < monthStart) return false;
        if (dateFilter === 'custom') {
          if (fromDate && formDate < new Date(fromDate)) return false;
          if (toDate && formDate > new Date(toDate + 'T23:59:59')) return false;
        }
        
        // Apply year/month filter
        if (selYear && formDate.getFullYear() !== parseInt(selYear)) return false;
        if (selMonth && formDate.getMonth() !== parseInt(selMonth)) return false;
        
        return true;
      });
      
      const filteredEntry = { ...entry, forms: filteredForms };
      const rm = (entry.tl.reportingManager || '').trim().toLowerCase();
      const matched = managers.find(m => m.name.trim().toLowerCase() === rm);
      if (matched) {
        groups[matched._id].tls.push(filteredEntry);
      } else {
        unassignedTLs.push(filteredEntry);
      }
    });

    return { managerGroups: Object.values(groups), unassigned: unassignedTLs };
  }, [managers, tlData, selYear, selMonth, dateFilter, fromDate, toDate]);

  // Filter managers by search (name / location)
  const filteredGroups = useMemo(() => {
    if (!search) return managerGroups;
    const q = search.toLowerCase();
    return managerGroups.filter(g =>
      g.manager.name.toLowerCase().includes(q) ||
      (g.manager.location || '').toLowerCase().includes(q) ||
      (g.manager.email || '').toLowerCase().includes(q) ||
      g.tls.some(d =>
        (d.tl.name || d.tl.email || '').toLowerCase().includes(q) ||
        (d.tl.location || '').toLowerCase().includes(q)
      )
    );
  }, [managerGroups, search]);

  // KPI totals - calculated from filtered data
  const totalManagers = managers.length;
  const totalTLs      = useMemo(() => {
    // Count TLs from filtered managerGroups + unassigned
    return managerGroups.reduce((s, g) => s + g.tls.length, 0) + unassigned.length;
  }, [managerGroups, unassigned]);
  
  const totalFSEs     = useMemo(() => {
    // Count FSEs from filtered managerGroups + unassigned
    const allTLs = [...managerGroups.flatMap(g => g.tls), ...unassigned];
    return allTLs.reduce((s, d) => s + d.fses.length, 0);
  }, [managerGroups, unassigned]);
  
  const totalForms    = useMemo(() => {
    // Count forms from filtered managerGroups + unassigned (deduplicated)
    const allTLs = [...managerGroups.flatMap(g => g.tls), ...unassigned];
    const seen = new Set();
    return allTLs.flatMap(d => d.forms).filter(f => {
      const id = String(f._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }).length;
  }, [managerGroups, unassigned]);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.primary }}>
            Manager Overview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All Managers with their TLs, FSEs and merchant submissions
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={load}
          sx={{ borderColor: BRAND.primary, color: BRAND.primary, fontWeight: 700 }}
        >
          Refresh
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BRAND.primary }} />
        </Box>
      )}

      {!loading && (
        <>
          {/* KPI row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <KPICard label="Total Managers" value={totalManagers} color={BRAND.primary}
              active={activeKPI === 'managers'}
              onClick={() => {
                setActiveKPI(p => p === 'managers' ? null : 'managers');
                setKpiModal({
                  type: 'managers', title: 'Total Managers',
                  rows: managers.map(m => ({ name: m.name, phone: m.phone, email: m.email, location: m.location, status: m.status }))
                });
              }} />
            <KPICard label="Total TLs" value={totalTLs} color="#7c3aed"
              active={activeKPI === 'tls'}
              onClick={() => {
                setActiveKPI(p => p === 'tls' ? null : 'tls');
                const allTLs = [...managerGroups.flatMap(g => g.tls), ...unassigned];
                setKpiModal({
                  type: 'tls', title: 'Total TLs',
                  rows: allTLs.map(d => ({ name: d.tl.name || d.tl.email, phone: d.tl.phone, email: d.tl.email, location: d.tl.location, manager: d.tl.reportingManager, fses: d.fses.length, forms: d.forms.length }))
                });
              }} />
            <KPICard label="Total FSEs" value={totalFSEs} color="#1565c0"
              active={activeKPI === 'fses'}
              onClick={() => {
                setActiveKPI(p => p === 'fses' ? null : 'fses');
                const fseRows = [];
                const allTLs = [...managerGroups.flatMap(g => g.tls), ...unassigned];
                allTLs.forEach(d => d.fses.forEach(fse => {
                  fseRows.push({ name: fse.newJoinerName, phone: fse.newJoinerPhone, email: fse.email || fse.newJoinerEmailId, location: fse.location, tl: d.tl.name || d.tl.email, forms: d.forms.filter(f => f.employeeName === fse.newJoinerName).length });
                }));
                setKpiModal({ type: 'fses', title: 'Total FSEs', rows: fseRows });
              }} />
            <KPICard label="Total Forms" value={totalForms} color="#2e7d32"
              active={activeKPI === 'forms'}
              onClick={() => {
                setActiveKPI(p => p === 'forms' ? null : 'forms');
                const seen = new Set();
                const allTLs = [...managerGroups.flatMap(g => g.tls), ...unassigned];
                const formRows = allTLs.flatMap(d => d.forms).filter(f => {
                  if (seen.has(String(f._id))) return false;
                  seen.add(String(f._id)); return true;
                }).map(f => ({ customer: f.customerName, phone: f.customerNumber, fse: f.employeeName, product: f.formFillingFor || f.tideProduct || f.brand || '–', status: f.status, date: new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }));
                setKpiModal({ type: 'forms', title: 'Total Forms', rows: formRows });
              }} />
          </Box>

          {/* Active KPI info banner */}
          {activeKPI && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #c8e6c9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={600} sx={{ color: BRAND.primary }}>
                {activeKPI === 'managers' && `Showing all ${totalManagers} managers`}
                {activeKPI === 'tls' && `Showing all ${totalTLs} Team Leaders across all managers`}
                {activeKPI === 'fses' && `Showing all ${totalFSEs} FSEs — all manager cards expanded`}
                {activeKPI === 'forms' && `Showing all ${totalForms} forms — all manager cards expanded`}
              </Typography>
              <Button size="small" onClick={() => setActiveKPI(null)} sx={{ color: BRAND.primary, fontWeight: 700, fontSize: 11 }}>
                Clear ✕
              </Button>
            </Box>
          )}
          {/* Pie charts — active vs inactive TLs per manager */}
          <ManagerPieCharts managerGroups={managerGroups} />

          {/* Search bar */}
          <TextField            fullWidth
            size="small"
            placeholder="Search by manager, TL, or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Date Filter Bar */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {['all', 'today', 'month'].map(f => (
              <Button key={f} size="small"
                variant={dateFilter === f ? 'contained' : 'outlined'}
                onClick={() => { setDateFilter(f); setFromDate(''); setToDate(''); }}
                sx={{ fontWeight: 700, textTransform: 'capitalize',
                  bgcolor: dateFilter === f ? BRAND.primary : 'transparent',
                  borderColor: BRAND.primary, color: dateFilter === f ? '#fff' : BRAND.primary,
                  '&:hover': { bgcolor: dateFilter === f ? '#0f3320' : '#e6f4ea' } }}>
                {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'This Month'}
              </Button>
            ))}
            <TextField size="small" type="date" label="From" value={fromDate}
              onChange={e => { setFromDate(e.target.value); setDateFilter('custom'); }}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
            <TextField size="small" type="date" label="To" value={toDate}
              onChange={e => { setToDate(e.target.value); setDateFilter('custom'); }}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
            {(dateFilter !== 'all' || fromDate || toDate) && (
              <Button size="small" variant="outlined" color="error"
                onClick={() => { setDateFilter('all'); setFromDate(''); setToDate(''); }}
                sx={{ fontWeight: 700 }}>Reset</Button>
            )}
          </Box>

          {/* Year / Month dropdowns */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField select size="small" label="Year" value={selYear}
              onChange={e => setSelYear(e.target.value)} sx={{ minWidth: 120 }}>
              <MenuItem value=""></MenuItem>
              {[2026,2025,2024,2023,2022,2021].map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Month" value={selMonth}
              onChange={e => setSelMonth(e.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="">All Months</MenuItem>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => (
                <MenuItem key={i} value={String(i)}>{m}</MenuItem>
              ))}
            </TextField>
          </Box>
          />

          {/* Manager cards */}
          {filteredGroups.length === 0 && !search && managers.length === 0 ? (
            <Alert severity="info">No approved managers found.</Alert>
          ) : filteredGroups.length === 0 ? (
            <Alert severity="info">No managers match your search.</Alert>
          ) : (
            filteredGroups.map(g => (
              <ManagerCard
                key={g.manager._id}
                manager={g.manager}
                tlsData={g.tls}
                search={search}
              />
            ))
          )}

          {/* Unassigned TLs */}
          <UnassignedTLsCard tlsData={unassigned} search={search} />
        </>
      )}

      {/* ── KPI Detail Modal ── */}
      <KpiModal kpiModal={kpiModal} onClose={() => { setKpiModal(null); setActiveKPI(null); }} />
    </Box>
  );
}
