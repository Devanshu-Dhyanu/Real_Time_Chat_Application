import axios from "axios";

const API = (import.meta.env.VITE_API_URL || "http://localhost:7000").replace(/\/$/, "");

export const loginApi = (data) => axios.post(`${API}/auth/login`, data);
export const registerApi = (data) => axios.post(`${API}/auth/register`, data);
export const googleAuthApi = (data) => axios.post(`${API}/auth/google`, data);
export const getUsers = (currentUserId) =>
  axios.get(`${API}/auth/list`, { params: { currentUserId } });
export const getContacts = (userId) => axios.get(`${API}/auth/contacts/${userId}`);
export const saveContact = (userId, data) => axios.post(`${API}/auth/contacts/${userId}`, data);
export const updateContact = (userId, contactEmail, data) =>
  axios.patch(`${API}/auth/contacts/${userId}/${encodeURIComponent(contactEmail)}`, data);
export const removeContact = (userId, contactEmail) =>
  axios.delete(`${API}/auth/contacts/${userId}/${encodeURIComponent(contactEmail)}`);
export const updateProfilePhoto = (userId, data) =>
  axios.patch(`${API}/auth/profile-photo/${userId}`, data);
export const updatePublicKey = (userId, data) =>
  axios.patch(`${API}/auth/public-key/${userId}`, data);
