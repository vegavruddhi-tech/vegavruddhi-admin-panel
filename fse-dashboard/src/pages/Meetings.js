// File: vegavruddhi-admin-panel/fse-dashboard/src/pages/Meetings.js

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Checkbox, List, ListItem, ListItemText,
  Chip, Box, Typography, Alert, Snackbar, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';

export default function MeetingScheduler({ open, onClose, employees = [], tls = [] }) {
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [meetingData, setMeetingData] = useState({
    title: '',
    description: '',
    startTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [searchFSE, setSearchFSE] = useState('');
  const [searchTL, setSearchTL] = useState('');
  const [searchManager, setSearchManager] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [managers, setManagers] = useState([]);

  // Fetch managers list
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/manager/approved-list');
        const data = await response.json();
        setManagers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching managers:', err);
        setManagers([]);
      }
    };
    if (open) {
      fetchManagers();
    }
  }, [open]);

  // Fetch meetings list
  const fetchMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const response = await fetch('http://localhost:4000/api/meetings/list');
      const data = await response.json();
      // Ensure data is an array
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setMeetings([]); // Set empty array on error
    }
    setLoadingMeetings(false);
  };

  // Fetch meetings when dialog opens
  useEffect(() => {
    if (open) {
      fetchMeetings();
    }
  }, [open]);

  // Copy link to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
  };

  // Combine employees, TLs, and Managers with hierarchy info
  const allAttendees = useMemo(() => {
    const empList = employees.map(e => ({
      _id: e._id,
      name: e.newJoinerName || e.name,
      email: e.newJoinerEmailId || e.email,
      position: e.position || 'FSE',
      type: 'FSE',
      reportingManager: e.reportingManager // TL's name
    }));
    
    const tlList = tls.map(t => ({
      _id: t._id,
      name: t.name,
      email: t.email,
      position: 'Team Lead',
      type: 'TL',
      reportingManager: t.reportingManager // Manager's name
    }));
    
    const managerList = managers.map(m => ({
      _id: m._id,
      name: m.name,
      email: m.email,
      position: 'Manager',
      type: 'Manager'
    }));
    
    return [...empList, ...tlList, ...managerList];
  }, [employees, tls, managers]);

  // Build hierarchy maps
  const hierarchyMap = useMemo(() => {
    // Map: Manager name -> TL IDs
    const managerToTLs = {};
    // Map: TL name -> FSE IDs
    const tlToFSEs = {};
    
    allAttendees.forEach(person => {
      if (person.type === 'TL' && person.reportingManager) {
        if (!managerToTLs[person.reportingManager]) {
          managerToTLs[person.reportingManager] = [];
        }
        managerToTLs[person.reportingManager].push(person._id);
      }
      
      if (person.type === 'FSE' && person.reportingManager) {
        if (!tlToFSEs[person.reportingManager]) {
          tlToFSEs[person.reportingManager] = [];
        }
        tlToFSEs[person.reportingManager].push(person._id);
      }
    });
    
    return { managerToTLs, tlToFSEs };
  }, [allAttendees]);

  // Get all subordinates (TLs + FSEs) for a manager
  const getManagerSubordinates = (managerName) => {
    const tlIds = hierarchyMap.managerToTLs[managerName] || [];
    const fseIds = [];
    
    // Get all FSEs under each TL
    tlIds.forEach(tlId => {
      const tl = allAttendees.find(a => a._id === tlId);
      if (tl) {
        const tlFSEs = hierarchyMap.tlToFSEs[tl.name] || [];
        fseIds.push(...tlFSEs);
      }
    });
    
    return [...tlIds, ...fseIds];
  };

  // Get all FSEs for a TL
  const getTLSubordinates = (tlName) => {
    return hierarchyMap.tlToFSEs[tlName] || [];
  };

  // Filtered FSEs, TLs, and Managers based on search
  const filteredFSEs = useMemo(() => {
    return allAttendees
      .filter(a => a.type === 'FSE')
      .filter(a => 
        a.name.toLowerCase().includes(searchFSE.toLowerCase()) ||
        a.email.toLowerCase().includes(searchFSE.toLowerCase())
      );
  }, [allAttendees, searchFSE]);

  const filteredTLs = useMemo(() => {
    return allAttendees
      .filter(a => a.type === 'TL')
      .filter(a => 
        a.name.toLowerCase().includes(searchTL.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTL.toLowerCase())
      );
  }, [allAttendees, searchTL]);

  const filteredManagers = useMemo(() => {
    return allAttendees
      .filter(a => a.type === 'Manager')
      .filter(a => 
        a.name.toLowerCase().includes(searchManager.toLowerCase()) ||
        a.email.toLowerCase().includes(searchManager.toLowerCase())
      );
  }, [allAttendees, searchManager]);

  // Hierarchical selection handlers
  const handlePersonSelect = (person, checked) => {
    if (checked) {
      // Add person
      let toAdd = [person._id];
      
      // If Manager: add all TLs + FSEs under them
      if (person.type === 'Manager') {
        const subordinates = getManagerSubordinates(person.name);
        toAdd = [...toAdd, ...subordinates];
      }
      
      // If TL: add all FSEs under them
      if (person.type === 'TL') {
        const subordinates = getTLSubordinates(person.name);
        toAdd = [...toAdd, ...subordinates];
      }
      
      setSelectedAttendees([...new Set([...selectedAttendees, ...toAdd])]);
    } else {
      // Remove person
      let toRemove = [person._id];
      
      // If Manager: remove all TLs + FSEs under them
      if (person.type === 'Manager') {
        const subordinates = getManagerSubordinates(person.name);
        toRemove = [...toRemove, ...subordinates];
      }
      
      // If TL: remove all FSEs under them
      if (person.type === 'TL') {
        const subordinates = getTLSubordinates(person.name);
        toRemove = [...toRemove, ...subordinates];
      }
      
      setSelectedAttendees(selectedAttendees.filter(id => !toRemove.includes(id)));
    }
  };

  // Select/Deselect all handlers
  const handleSelectAllFSE = (checked) => {
    if (checked) {
      const fseIds = filteredFSEs.map(a => a._id);
      setSelectedAttendees([...new Set([...selectedAttendees, ...fseIds])]);
    } else {
      const fseIds = filteredFSEs.map(a => a._id);
      setSelectedAttendees(selectedAttendees.filter(id => !fseIds.includes(id)));
    }
  };

  const handleSelectAllTL = (checked) => {
    if (checked) {
      const tlIds = filteredTLs.map(a => a._id);
      // Also add all FSEs under these TLs
      const fseIds = [];
      filteredTLs.forEach(tl => {
        const subordinates = getTLSubordinates(tl.name);
        fseIds.push(...subordinates);
      });
      setSelectedAttendees([...new Set([...selectedAttendees, ...tlIds, ...fseIds])]);
    } else {
      const tlIds = filteredTLs.map(a => a._id);
      // Also remove all FSEs under these TLs
      const fseIds = [];
      filteredTLs.forEach(tl => {
        const subordinates = getTLSubordinates(tl.name);
        fseIds.push(...subordinates);
      });
      setSelectedAttendees(selectedAttendees.filter(id => ![...tlIds, ...fseIds].includes(id)));
    }
  };

  const handleSelectAllManager = (checked) => {
    if (checked) {
      const managerIds = filteredManagers.map(a => a._id);
      // Also add all TLs + FSEs under these managers
      const subordinateIds = [];
      filteredManagers.forEach(manager => {
        const subordinates = getManagerSubordinates(manager.name);
        subordinateIds.push(...subordinates);
      });
      setSelectedAttendees([...new Set([...selectedAttendees, ...managerIds, ...subordinateIds])]);
    } else {
      const managerIds = filteredManagers.map(a => a._id);
      // Also remove all TLs + FSEs under these managers
      const subordinateIds = [];
      filteredManagers.forEach(manager => {
        const subordinates = getManagerSubordinates(manager.name);
        subordinateIds.push(...subordinates);
      });
      setSelectedAttendees(selectedAttendees.filter(id => ![...managerIds, ...subordinateIds].includes(id)));
    }
  };

  const handleCreateMeeting = async () => {
    setLoading(true);
    try {
      // Calculate end time (1 hour after start time) - keep in local timezone
      const startDate = new Date(meetingData.startTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      
      // Format end time in local timezone (not UTC)
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      const hours = String(endDate.getHours()).padStart(2, '0');
      const minutes = String(endDate.getMinutes()).padStart(2, '0');
      const endTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      const response = await fetch('http://localhost:4000/api/meetings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...meetingData,
          endTime, // Add calculated end time
          attendees: selectedAttendees.map(id => {
            const attendee = allAttendees.find(e => e._id === id);
            return { email: attendee.email, name: attendee.name };
          })
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show success snackbar with link
        setSnackbar({ 
          open: true, 
          message: `Meeting created! Invitations sent to ${selectedAttendees.length} attendees. Link copied to clipboard!`, 
          severity: 'success',
          meetLink: data.meetLink
        });
        
        // Copy link to clipboard
        navigator.clipboard.writeText(data.meetLink);
        
        // Open meet link in new tab for admin
        if (data.meetLink) {
          window.open(data.meetLink, '_blank');
        }
        
        // Refresh meetings list
        fetchMeetings();
        
        // Reset form
        setMeetingData({ title: '', description: '', startTime: '' });
        setSelectedAttendees([]);
      } else {
        // Handle error response
        const errorMsg = data.message || data.error || 'Failed to create meeting';
        setSnackbar({ open: true, message: `Error: ${errorMsg}`, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message || 'Unknown error'}`, severity: 'error' });
    }
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>Schedule Google Meet</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {/* Left: Create Meeting Form */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Create New Meeting</Typography>
              
              <TextField
                fullWidth
                label="Meeting Title"
                value={meetingData.title}
                onChange={e => setMeetingData({...meetingData, title: e.target.value})}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={meetingData.description}
                onChange={e => setMeetingData({...meetingData, description: e.target.value})}
                margin="normal"
              />
              
              <Alert severity="success" sx={{ my: 2 }}>
                <strong>✨ Auto-Generated Google Meet Links!</strong><br/>
                Google Meet links will be automatically created for your meeting.
              </Alert>
              
              <TextField
                fullWidth
                label="Start Time"
                type="datetime-local"
                value={meetingData.startTime}
                onChange={e => setMeetingData({...meetingData, startTime: e.target.value})}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                helperText="Meeting duration will be 1 hour"
              />

              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Select Attendees ({selectedAttendees.length} selected)
              </Typography>

              {/* Selected Attendees Summary */}
              {selectedAttendees.length > 0 && (
                <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Selected Attendees:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedAttendees.map(id => {
                      const person = allAttendees.find(a => a._id === id);
                      if (!person) return null;
                      return (
                        <Chip
                          key={id}
                          label={`${person.name} (${person.type})`}
                          size="small"
                          onDelete={() => handlePersonSelect(person, false)}
                          sx={{ 
                            fontSize: 10,
                            height: 22,
                            bgcolor: person.type === 'Manager' ? '#ffebee' : person.type === 'TL' ? '#e8f5e9' : '#e3f2fd'
                          }}
                        />
                      );
                    })}
                  </Box>
                </Alert>
              )}
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                {/* FSE Column */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1565c0', fontSize: 12 }}>
                      FSEs ({filteredFSEs.length})
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        checked={filteredFSEs.length > 0 && filteredFSEs.every(a => selectedAttendees.includes(a._id))}
                        indeterminate={filteredFSEs.some(a => selectedAttendees.includes(a._id)) && !filteredFSEs.every(a => selectedAttendees.includes(a._id))}
                        onChange={(e) => handleSelectAllFSE(e.target.checked)}
                        size="small"
                      />
                      <Typography variant="caption" sx={{ fontSize: 10 }}>All</Typography>
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={searchFSE}
                    onChange={(e) => setSearchFSE(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <List sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                    {filteredFSEs.map(attendee => (
                      <ListItem key={attendee._id} dense>
                        <Checkbox
                          checked={selectedAttendees.includes(attendee._id)}
                          onChange={e => handlePersonSelect(attendee, e.target.checked)}
                          size="small"
                        />
                        <ListItemText 
                          primary={attendee.name} 
                          secondary={attendee.email}
                          primaryTypographyProps={{ fontSize: 12, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: 10 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* TL Column */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: 12 }}>
                      TLs ({filteredTLs.length})
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        checked={filteredTLs.length > 0 && filteredTLs.every(a => selectedAttendees.includes(a._id))}
                        indeterminate={filteredTLs.some(a => selectedAttendees.includes(a._id)) && !filteredTLs.every(a => selectedAttendees.includes(a._id))}
                        onChange={(e) => handleSelectAllTL(e.target.checked)}
                        size="small"
                      />
                      <Typography variant="caption" sx={{ fontSize: 10 }}>All</Typography>
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={searchTL}
                    onChange={(e) => setSearchTL(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <List sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                    {filteredTLs.map(attendee => (
                      <ListItem key={attendee._id} dense>
                        <Checkbox
                          checked={selectedAttendees.includes(attendee._id)}
                          onChange={e => handlePersonSelect(attendee, e.target.checked)}
                          size="small"
                        />
                        <ListItemText 
                          primary={attendee.name} 
                          secondary={attendee.email}
                          primaryTypographyProps={{ fontSize: 12, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: 10 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* Manager Column */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#d32f2f', fontSize: 12 }}>
                      Managers ({filteredManagers.length})
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        checked={filteredManagers.length > 0 && filteredManagers.every(a => selectedAttendees.includes(a._id))}
                        indeterminate={filteredManagers.some(a => selectedAttendees.includes(a._id)) && !filteredManagers.every(a => selectedAttendees.includes(a._id))}
                        onChange={(e) => handleSelectAllManager(e.target.checked)}
                        size="small"
                      />
                      <Typography variant="caption" sx={{ fontSize: 10 }}>All</Typography>
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={searchManager}
                    onChange={(e) => setSearchManager(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <List sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                    {filteredManagers.map(attendee => (
                      <ListItem key={attendee._id} dense>
                        <Checkbox
                          checked={selectedAttendees.includes(attendee._id)}
                          onChange={e => handlePersonSelect(attendee, e.target.checked)}
                          size="small"
                        />
                        <ListItemText 
                          primary={attendee.name} 
                          secondary={attendee.email}
                          primaryTypographyProps={{ fontSize: 12, fontWeight: 600 }}
                          secondaryTypographyProps={{ fontSize: 10 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            </Box>

            {/* Right: Meetings List */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Created Meetings</Typography>
              
              {loadingMeetings ? (
                <Typography>Loading meetings...</Typography>
              ) : meetings.length === 0 ? (
                <Alert severity="info">No meetings created yet</Alert>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Date & Time</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Attendees</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {meetings.map((meeting) => (
                        <TableRow key={meeting._id}>
                          <TableCell sx={{ fontSize: 12 }}>{meeting.title}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>
                            {new Date(meeting.startTime).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{meeting.attendees.length}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Join Meeting">
                                <IconButton 
                                  size="small" 
                                  onClick={() => window.open(meeting.meetLink, '_blank')}
                                  sx={{ color: '#1565c0' }}
                                >
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Copy Link">
                                <IconButton 
                                  size="small" 
                                  onClick={() => copyToClipboard(meeting.meetLink)}
                                  sx={{ color: '#2e7d32' }}
                                >
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateMeeting}
            disabled={loading || selectedAttendees.length === 0 || !meetingData.title || !meetingData.startTime}
          >
            {loading ? 'Creating...' : 'Create Meeting & Send Invites'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          action={
            snackbar.meetLink && (
              <IconButton
                size="small"
                aria-label="copy"
                color="inherit"
                onClick={() => copyToClipboard(snackbar.meetLink)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            )
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
