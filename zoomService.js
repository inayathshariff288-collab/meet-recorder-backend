const axios = require("axios");
const supabase = require("./supabaseClient");

async function refreshZoomToken(userId) {
  // Get refresh token from database
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

    // Update new tokens in DB
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

module.exports = { refreshZoomToken };
