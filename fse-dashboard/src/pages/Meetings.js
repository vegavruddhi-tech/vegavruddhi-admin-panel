// File: vegavruddhi-admin-panel/fse-dashboard/src/pages/Meetings.js

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Checkbox, List, ListItem, ListItemText,
  Chip, Box, Typography, Alert
} from '@mui/material';

export default function MeetingScheduler({ open, onClose, employees = [], tls = [] }) {
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [meetingData, setMeetingData] = useState({
    title: '',
    description: '',
    startTime: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchFSE, setSearchFSE] = useState('');
  const [searchTL, setSearchTL] = useState('');

  // Combine employees and TLs
  const allAttendees = useMemo(() => {
    const empList = employees.map(e => ({
      _id: e._id,
      name: e.newJoinerName || e.name,
      email: e.newJoinerEmailId || e.email,
      position: e.position || 'FSE',
      type: 'FSE'
    }));
    
    const tlList = tls.map(t => ({
      _id: t._id,
      name: t.name,
      email: t.email,
      position: 'Team Lead',
      type: 'TL'
    }));
    
    return [...empList, ...tlList];
  }, [employees, tls]);

  // Filtered FSEs and TLs based on search
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
      setSelectedAttendees([...new Set([...selectedAttendees, ...tlIds])]);
    } else {
      const tlIds = filteredTLs.map(a => a._id);
      setSelectedAttendees(selectedAttendees.filter(id => !tlIds.includes(id)));
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
      setResult(data);
      
      if (data.success) {
        alert(`✅ Meeting created successfully!\n\n📧 Invitations sent to ${selectedAttendees.length} attendees + you (admin)\n\n🔗 Meet Link: ${data.meetLink}\n\nCheck your email for the meeting invitation!`);
        
        // Open meet link in new tab for admin
        if (data.meetLink) {
          window.open(data.meetLink, '_blank');
        }
        
        onClose();
        // Reset form
        setMeetingData({ title: '', description: '', startTime: '' });
        setSelectedAttendees([]);
      } else {
        // Handle error response
        const errorMsg = data.message || data.error || 'Failed to create meeting';
        alert(`❌ Error: ${errorMsg}`);
      }
    } catch (err) {
      alert(`❌ Error creating meeting: ${err.message || 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Schedule Google Meet</DialogTitle>
        <DialogContent>
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
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {/* FSE Column */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1565c0' }}>
                  Field Sales Executives ({filteredFSEs.length})
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Checkbox
                    checked={filteredFSEs.length > 0 && filteredFSEs.every(a => selectedAttendees.includes(a._id))}
                    indeterminate={filteredFSEs.some(a => selectedAttendees.includes(a._id)) && !filteredFSEs.every(a => selectedAttendees.includes(a._id))}
                    onChange={(e) => handleSelectAllFSE(e.target.checked)}
                    size="small"
                  />
                  <Typography variant="caption" sx={{ fontSize: 11 }}>Select All</Typography>
                </Box>
              </Box>
              <TextField
                fullWidth
                size="small"
                placeholder="Search FSEs..."
                value={searchFSE}
                onChange={(e) => setSearchFSE(e.target.value)}
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>🔍</span>
                }}
              />
              <List sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                {filteredFSEs.map(attendee => (
                  <ListItem key={attendee._id} dense>
                    <Checkbox
                      checked={selectedAttendees.includes(attendee._id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedAttendees([...selectedAttendees, attendee._id]);
                        } else {
                          setSelectedAttendees(selectedAttendees.filter(id => id !== attendee._id));
                        }
                      }}
                    />
                    <ListItemText 
                      primary={attendee.name} 
                      secondary={`${attendee.email}`}
                      primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: 12 }}
                    />
                  </ListItem>
                ))}
                {filteredFSEs.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary={searchFSE ? "No FSEs found" : "No FSEs available"} 
                      sx={{ textAlign: 'center', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
              </List>
            </Box>

            {/* TL Column */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                  Team Leads ({filteredTLs.length})
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Checkbox
                    checked={filteredTLs.length > 0 && filteredTLs.every(a => selectedAttendees.includes(a._id))}
                    indeterminate={filteredTLs.some(a => selectedAttendees.includes(a._id)) && !filteredTLs.every(a => selectedAttendees.includes(a._id))}
                    onChange={(e) => handleSelectAllTL(e.target.checked)}
                    size="small"
                  />
                  <Typography variant="caption" sx={{ fontSize: 11 }}>Select All</Typography>
                </Box>
              </Box>
              <TextField
                fullWidth
                size="small"
                placeholder="Search TLs..."
                value={searchTL}
                onChange={(e) => setSearchTL(e.target.value)}
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>🔍</span>
                }}
              />
              <List sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                {filteredTLs.map(attendee => (
                  <ListItem key={attendee._id} dense>
                    <Checkbox
                      checked={selectedAttendees.includes(attendee._id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedAttendees([...selectedAttendees, attendee._id]);
                        } else {
                          setSelectedAttendees(selectedAttendees.filter(id => id !== attendee._id));
                        }
                      }}
                    />
                    <ListItemText 
                      primary={attendee.name} 
                      secondary={`${attendee.email}`}
                      primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: 12 }}
                    />
                  </ListItem>
                ))}
                {filteredTLs.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary={searchTL ? "No Team Leads found" : "No Team Leads available"} 
                      sx={{ textAlign: 'center', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
              </List>
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
  );
}
