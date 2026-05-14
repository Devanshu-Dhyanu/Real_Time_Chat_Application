import axios from "axios";

const API = (import.meta.env.VITE_API_URL || "http://localhost:7000").replace(/\/$/, "");

export const loginApi = (data) => axios.post(`${API}/auth/login`, data);
export const registerApi = (data) => axios.post(`${API}/auth/register`, data);
export const getUsers = () => axios.get(`${API}/auth/list`);
