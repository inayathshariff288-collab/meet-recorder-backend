const axios = require("axios");
const supabase = require("./supabaseClient");

/* -------------------------------------------------- */
/* REFRESH ZOOM TOKEN */
/* -------------------------------------------------- */
async function refreshZoomToken(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("zoom_refresh_token")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("User not found or refresh token missing");
  }

  const refreshToken = data.zoom_refresh_token;

  try {
    const response = await axios.post(
      "https://zoom.us/oauth/token",
      null,
      {
        params: {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
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

    await supabase
      .from("users")
      .update({
        zoom_access_token: access_token,
        zoom_refresh_token: refresh_token,
      })
      .eq("id", userId);

    return access_token;
  } catch (err) {
    throw new Error("Failed to refresh Zoom token");
  }
}

/* -------------------------------------------------- */
/* CREATE ZOOM MEETING */
/* -------------------------------------------------- */
async function createZoomMeeting(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("zoom_access_token")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("User not found");
  }

  let accessToken = data.zoom_access_token;

  try {
    const response = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      {
        topic: "Automated Meeting",
        type: 2, // Scheduled meeting
        start_time: new Date().toISOString(),
        duration: 30,
        timezone: "UTC",
        settings: {
          join_before_host: true,
          waiting_room: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (err) {
    // If token expired → refresh and retry
    if (err.response?.status === 401) {
      accessToken = await refreshZoomToken(userId);

      const retryResponse = await axios.post(
        "https://api.zoom.us/v2/users/me/meetings",
        {
          topic: "Automated Meeting",
          type: 2,
          start_time: new Date().toISOString(),
          duration: 30,
          timezone: "UTC",
          settings: {
            join_before_host: true,
            waiting_room: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return retryResponse.data;
    }

    throw new Error("Failed to create Zoom meeting");
  }
}

module.exports = {
  refreshZoomToken,
  createZoomMeeting,
};
