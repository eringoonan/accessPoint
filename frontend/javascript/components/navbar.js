// /javascript/components/navbar.js

export async function updateNavbar() {
    const authLink = document.getElementById("auth-link");
    const adminLink = document.getElementById("admin-link");

    if (!authLink) return;

    const token = localStorage.getItem("accessToken"); 

    if (!token) {
        authLink.textContent = "Sign Up";
        authLink.href = "/html/signup.html";
        if (adminLink) adminLink.style.display = "none";
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include'
        });

        if (!res.ok) throw new Error("Not logged in");

        const data = await res.json();

        if (!data.loggedIn) throw new Error("Not logged in");

        // Logged in
        authLink.textContent = "Profile";
        authLink.href = "/html/profile.html";

        // Admin logic (CORRECT PATH)
        if (adminLink) {
            if (data.user.is_admin === 1 || data.user.is_admin === true) {
                adminLink.style.display = "inline-block";
            } else {
                adminLink.style.display = "none";
            }
        }

    } catch (err) {
        authLink.textContent = "Sign Up";
        authLink.href = "/html/signup.html";
        if (adminLink) adminLink.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", updateNavbar);
