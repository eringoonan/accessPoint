// /backend/models/user.js

// Class for users
export default class User {
    constructor({ user_id, id, name, email, created_at, updated_at }) {
        this.id = user_id || id; // Accept either user_id or id
        this.name = name;
        this.email = email;
        this.createdAt = created_at ? new Date(created_at) : new Date();
        this.updatedAt = updated_at ? new Date(updated_at) : new Date();
    }

    // Returns a human-readable joined date
    getFormattedDate() {
        return this.createdAt.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}