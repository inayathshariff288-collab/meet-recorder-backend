require("dotenv").config();
const supabase = require("./supabaseClient");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "MeetAutoRecorder Backend Running 🚀" });
});

// ✅ Supabase Test Route
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
