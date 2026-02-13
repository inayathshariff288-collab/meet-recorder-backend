require("dotenv").config();
const supabase = require("./supabaseClient");
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

/* -------------------------------------------------- */
/* ROOT CHECK */
/* -------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({ message: "MeetAutoRecorder Backend Running 🚀" });
});

/* -------------------------------------------------- */
/* SUPABASE TEST ROUTE */
/* -------------------------------------------------- */
app.get("/test-supabase", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .limit(5);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------- */
/* STEP 1 — Redirect to Zoom Login */
/* -------------------------------------------------- */
app.get("/auth/zoom", (req, res) => {
  const redirectUrl = encodeURIComponent(
    "https://meet-recorder-backend.onrender.com/auth/zoom/callback"
  );

  const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${process.env.ZOOM_CLIENT_ID}&redirect_uri=${redirectUrl}`;

  res.redirect(zoomAuthUrl);
});

/* -------------------------------------------------- */
/* STEP 2 — Zoom OAuth Callback */
/* -------------------------------------------------- */
app.get("/auth/zoom/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" });
  }

  try {
    const response = await axios.post(
      "https://zoom.us/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code: code,
          redirect_uri:
            "https://meet-recorder-backend.onrender.com/auth/zoom/callback",
        },
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
            ).toString("base64"),
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    res.json({
      success: true,
      message: "Zoom connected successfully 🚀",
      access_token,
      refresh_token,
    });
  } catch (error) {
    res.status(500).json({
      error: "Zoom OAuth failed",
      details: error.response?.data || error.message,
    });
  }
});

/* -------------------------------------------------- */
/* SERVER START */
/* -------------------------------------------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
