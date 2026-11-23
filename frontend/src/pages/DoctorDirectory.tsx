/*
MediVoice AI - Doctor Directory

Allows patients to search for doctors by specialization.
*/

import { Box, Card, Container, TextField, Button, Grid } from "@mui/material";
import { MdSearch, MdLocalHospital } from "lucide-react";
import { useState } from "react";
import axios from "axios";

interface Doctor {
  id: number;
  name: string;
  specialization: string;
  department: string;
}

export default function DoctorDirectory() {
  const [specialization, setSpecialization] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const searchDoctors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/doctors?specialization=${specialization}`, {
        headers: { Authorization: `Bearer fake-token-for-demo` },
      });
      const data = await response.json();
      setDoctors(data || []);
    } catch (error) {
      console.error("Error searching doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3, px: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <MdLocalHospital sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="h4" sx={{ color: "primary.main" }}>
            Doctor Directory
          </Typography>
        </Box>
        <TextField
          label="Specialization"
          variant="outlined"
          fullWidth
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={searchDoctors} sx={{ mb: 3 }}>
          Search Doctors
        </Button>
      </Box>

      {loading && <Typography variant="body2" color="on.primary">Loading doctors...</Typography>}

      {doctors.length > 0 ? (
        <Grid container spacing={2} sx={{ mt: 3 }}>
          {doctors.map((doctor) => (
            <Grid item xs={12} sm={6} md={4} key={doctor.id}>
              <Card elevation={2} sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                  {doctor.name}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                  {doctor.specialization}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {doctor.department}
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  sx={{ mt: 2, alignSelf: "flex-end", color: "primary.main" }
                >
                  Book Appointment
                </Button>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ pt: 3 }}>
          No doctors found. Try a different specialization.
        </Typography>
      )}
    </Container>
  );
}
