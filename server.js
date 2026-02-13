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
/* STEP 1 — Redirect to Zoom Login (WITH userId) */
/* -------------------------------------------------- */
app.get("/auth/zoom", (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const redirectUrl = encodeURIComponent(
    "https://meet-recorder-backend.onrender.com/auth/zoom/callback"
  );

  const zoomAuthUrl =
    `https://zoom.us/oauth/authorize?response_type=code` +
    `&client_id=${process.env.ZOOM_CLIENT_ID}` +
    `&redirect_uri=${redirectUrl}` +
    `&state=${userId}`;

  res.redirect(zoomAuthUrl);
});

/* -------------------------------------------------- */
/* STEP 2 — Zoom OAuth Callback */
/* -------------------------------------------------- */
app.get("/auth/zoom/callback", async (req, res) => {
  const code = req.query.code;
  const userId = req.query.state;

  if (!code || !userId) {
    return res.status(400).json({
      error: "Missing authorization code or userId",
    });
  }

  try {
    /* -------------------------------------------- */
    /* Exchange code for access token               */
    /* -------------------------------------------- */
    const tokenResponse = await axios.post(
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

    const { access_token, refresh_token } = tokenResponse.data;

    /* -------------------------------------------- */
    /* Get Zoom User Info                           */
    /* -------------------------------------------- */
    const zoomUserResponse = await axios.get(
      "https://api.zoom.us/v2/users/me",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const zoomUserId = zoomUserResponse.data.id;

    /* -------------------------------------------- */
    /* Save Tokens to Supabase                      */
    /* -------------------------------------------- */
    const { error } = await supabase
      .from("users")
      .update({
        zoom_access_token: access_token,
        zoom_refresh_token: refresh_token,
        zoom_user_id: zoomUserId,
        zoom_connected: true,
      })
      .eq("id", userId);

    if (error) throw error;

    res.json({
      success: true,
      message: "Zoom connected and saved successfully 🚀",
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
