import { updateNavbar } from '../components/navbar.js';
import { getCurrentUser } from '../api/usersApi.js';

document.addEventListener("DOMContentLoaded", async () => {
  updateNavbar();
});