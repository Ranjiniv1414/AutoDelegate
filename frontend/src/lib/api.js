import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 120000 });

export const uploadAudio = async (fileObj) => {
  const form = new FormData();
  form.append("file", fileObj);
  const { data } = await http.post("/upload-audio", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const createMeeting = async (transcript, title = "Meeting") => {
  const { data } = await http.post("/meetings", { transcript, title });
  return data;
};

export const analyzeMeeting = async (meeting_id, speaker_map) => {
  const { data } = await http.post("/analyze-meeting", { meeting_id, speaker_map });
  return data;
};

export const generateRoadmap = async (meeting_id) => {
  const { data } = await http.post("/generate-roadmap", { meeting_id, speaker_map: {} });
  return data;
};

export const editAction = async (payload) => {
  const { data } = await http.post("/edit-action", payload);
  return data;
};

export const executeAction = async (meeting_id, action_id, demo_mode) => {
  const { data } = await http.post("/execute-action", { meeting_id, action_id, demo_mode });
  return data;
};

export const getMeeting = async (meeting_id) => {
  const { data } = await http.get(`/meeting/${meeting_id}`);
  return data;
};

export const listMeetings = async () => {
  const { data } = await http.get("/meetings");
  return data;
};
