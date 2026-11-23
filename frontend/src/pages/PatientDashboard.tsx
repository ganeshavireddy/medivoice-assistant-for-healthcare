/*
MediVoice AI - Patient Dashboard

Main dashboard for authenticated patients.
*/

import { Box, Card, Container, ListItem, ListItemText, Avatar, Typography } from "@mui/material";
import { MdMic, MdSchedule, MdLocalPharmacy, MdDescription, MdFace, MdDelete } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

interface Appointment {
  id: number;
  doctor_name: string;
  date: string;
  time: string;
  status: string;
}

interface Report {
  id: string;
  filename: string;
  upload_date: string;
}

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [apiBase] = useState(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000");

  // Fetch appointments
  useEffect(() => {
    fetch(`${apiBase}/api/v1/appointments`, {
      headers: { Authorization: `Bearer fake-token-for-demo` },
    })
      .then(res => res.json())
      .then(data => setAppointments(data || []))
      .catch(err => console.error("Error fetching appointments:", err));
  }, [apiBase]);

  // Fetch reports
  useEffect(() => {
    fetch(`${apiBase}/api/v1/reports`, {
      headers: { Authorization: `Bearer fake-token-for-demo` },
    })
      .then(res => res.json())
      .then(data => setReports(data || []))
      .catch(err => console.error("Error fetching reports:", err));
  }, [apiBase]);

  const handleStartRecording = async () => {
    setIsRecording(true);
    setVoiceText("");

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus"
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        // Send to backend for transcription
        const response = await fetch(`${apiBase}/api/voice/transcribe`, {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer fake-token-for-demo` },
        });

        const result = await response.json();
        setVoiceText(result.transcription || "");
        
        // If we have text, process it through the voice chat endpoint
        if (result.transcription && result.transcription.trim()) {
          const chatResponse = await fetch(`${apiBase}/api/voice/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer fake-token-for-demo`,
            },
            body: JSON.stringify({
              message: result.transcription,
              language: "en",
            }),
          });
          const chatResult = await chatResponse.json();
          // Display the AI response
          if (chatResult.response_text) {
            window.alert("AI Response: " + chatResult.response_text);
          }
        }
      };

      mediaRecorder.start();

      // Stop after 10 seconds automatically
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 10000);

    } catch (err) {
      console.error("Recording error:", err);
      setIsRecording(false);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceText.trim()) return;

    const chatResponse = await fetch(`${apiBase}/api/voice/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer fake-token-for-demo`,
      },
      body: JSON.stringify({
        message: voiceText,
        language: "en",
      }),
    });

    const chatResult = await chatResponse.json();
    if (chatResult.response_text) {
      window.alert("AI Assistant: " + chatResult.response_text);
    }
    setVoiceText("");
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3, px: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: "primary.main" }}>
          Welcome, Patient
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your personalized healthcare assistant
        </Typography>
      </Box>

      <Card elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Upcoming Appointments
        </Typography>
        {appointments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No upcoming appointments
          </Typography>
        ) : (
          <ListContainer component="ul" sx={{ listStyle: "none", p: 1 }}>
            {appointments.map((appt) => (
              <ListItem key={appt.id} sx={{ pb: 1, borderBottom: "1px solid #eee" }}>
                <ListItemText
                  primary={appt.doctor_name}
                  secondary={ `${appt.date} at ${appt.time}` }
                />
              </ListItem>
            ))}
          </ListContainer>
        )}
      </Card>

      <Card elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Recent Reports
        </Typography>
        {reports.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No reports uploaded
          </Typography>
        ) : (
          <ListContainer component="ul" sx={{ listStyle: "none", p: 1 }}>
            {reports.map((report) => (
              <ListItem key={report.id} sx={{ pb: 1, borderBottom: "1px solid #eee" }}>
                <ListItemText primary={report.filename} />
              </ListItem>
            ))}
          </ListContainer>
        )}
      </Card>

      <Card elevation={1} sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          AI Voice Assistant
        </Typography>
        
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <MicButton isRecording={isRecording} onToggle={handleStartRecording} />
          <span sx={{ ml: 2, fontSize: 14 }}>
            {isRecording ? "Recording..." : "Click to speak"}
          </span>
        </Box>

        <form onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <input
              type="text"
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Type your question..."
              sx={{ flexGrow: 1, p: 1, fontSize: 14 }}
            />
            <Button type="submit" variant="contained" sx={{ p: 1, minWidth: 100 }}>
              Send
            </Button>
          </Box>
        </form>
      </Card>
    </Container>
  );
}

// MicButton component
function MicButton({ isRecording, onToggle }: { isRecording: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={isRecording}
      sx={{
        p: 2,
        borderRadius: "50%",
        width: 60,
        height: 60,
        background: isRecording ? "red" : "primary.main",
        color: "white",
        border: "none",
        cursor: isRecording ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "&:hover": { background: isRecording ? "red" : "primary.dark" },
      }}
    >
      <svg
        width={28}
        height={28}
        fill={isRecording ? "white" : "none"}
        stroke={isRecording ? "white" : "currentColor"}
        strokeWidth={3}
        viewBox="0 0 24 24"
      >
        <path d="M21.5 16.5c0 .82-.67 1.5-1.5 1.5H1.5c-.82 0-1.5-.67-1.5-1.5V5.25C.67 3.93 2 3 3.5 3h14c1.55 0 3.02.93 3.5 2.25vzM7 7l-2.36 4.56c-.2.45-.3 1.02-.3 1.63v1.5h2.5v-1.5c0-.67.27-1.29.7-1.7L7 7zm5.16 3.68l-1.88-3.76.88-1.7 2.36.16L12 10.15l-.16 2.36.88 1.7-1.88 3.76L17 13.68l1.48-2.05z" />
      </svg>
    </button>
  );
}
