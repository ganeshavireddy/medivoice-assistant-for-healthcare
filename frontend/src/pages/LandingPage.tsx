/*
MediVoice AI - Landing Page

The first page users see when visiting the application.
*/

import { Button, Card, Container, Typography } from "@mui/material";
import { MdVoiceChat, MdDoctorFree, MdLocalHospital } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: 3 }}>
      <Typography variant="h2" sx={{ mb: 3, color: "primary.main" }}>
        MediVoice AI
      </Typography>
      <Typography variant="h6" sx={{ mb: 4, color: "text.secondary" }}>
        Voice-Based Intelligent Healthcare Assistant
      </Typography>

      <Grid container spacing={2} direction="column" alignItems="center">
        <Grid item>
          <Button
            variant="contained"
            sx={{ fontSize: 16, padding: "12px 24px" }}
            onClick={() => navigate("/login")}
          >
            Get Started
          </Button>
        </Grid>
        <Grid item sx={{ my: 4, color: "text.secondary" }}>
          <Typography variant="body2">
            Communicate with an AI-powered healthcare assistant using voice or text.
            Support for English and Telugu languages.
          </Typography>
        </Grid>
      </Grid>

      <Card elevation={3} sx={{ p: 3, mt: 4, maxWidth: 400 }}>
        <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
          <MdVoiceChat sx={{ mr: 1 }} /> Talk to AI Assistant
        </Typography>
        <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary", mt: 1 }}>
          <MdDoctorFree sx={{ mr: 1 }} /> Find Doctors & Book Appointments
        </Typography>
        <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary", mt: 1 }}>
          <MdLocalHospital sx={{ mr: 1 }} /> Upload & Explain Medical Reports
        </Typography>
      </Card>
    </Container>
  );
}
