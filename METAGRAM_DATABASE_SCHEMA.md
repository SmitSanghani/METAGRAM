# Metagram Database Schema Guide 🗄️

This guide explains the "Magic Notebooks" (Database Models) we use in Metagram. Each model has a specific job and holds the data for one activity.

---

### 👤 1. User Model (`user.model.js`)
**The "Student Identity"**
- **Job:** Saves the personal info of every person on the platform.
- **Key Fields:** 
  - `username`, `email`, `password`: The basics for login.
  - `profilePicture`: The URL to their face on the platform.
  - `followers` & `following`: Lists of IDs of other users (linking friends).
  - `isActive`: A switch (**true/false**) used by the admin to suspend the user.
  - `role`: Can be `user` or `admin`.

### 🖼️ 2. Post Model (`post.model.js`)
**The "Permanent Drawing"**
- **Job:** Saves all standard images/videos on the main feed.
- **Key Fields:** 
  - `image`: URL of the picture.
  - `caption`: What the user wrote under the post.
  - `likes`: List of User IDs who double-tapped it.
  - `comments`: List of Comment IDs linked to this post.

### 🎥 3. Reel Model (`reel.model.js`)
**The "Video Performance"**
- **Job:** Saves vertical videos.
- **Key Fields:** 
  - `videoUrl`: Link to the video file.
  - `viewsCount`: Number of times the reel was watched.
  - `allowLikes/Comments`: Toggle switches for settings.

### 🪄 4. Story Model (`story.model.js`)
**The "Erasable Board"**
- **Job:** Saves the 24-hour status updates.
- **Key Fields:** 
  - `content`: Link to the image/video story.
  - `viewers`: List of users who looked at it.
  - `createdAt`: Used to track when the 24 hours are up.

### 💌 5. Chat Models (`conversation.model.js` & `message.model.js`)
**The "Secret Notes"**
- **Conversation:** Creates a bond between Two users (A and B). It holds the list of all their shared messages.
- **Message:** The actual text. It saves `senderId`, `receiverId`, and the `message` text or `mediaUrl`.

### 🔔 6. Notification Model (`notification.model.js`)
**The "School Bell"**
- **Job:** Saves an alert every time something happens.
- **Key Fields:** 
  - `sender`: Who started the activity (e.g., who liked the post).
  - `receiver`: Who gets the alert.
  - `type`: Was it a `like`, `comment`, or `follow`?

### 💬 7. Comment Models (`comment.model.js`, `reelComment.model.js`, etc.)
**The "Feedback"**
- **Job:** Saves the text of what fans say about your art.
- **Key Fields:** 
  - `text`: What they typed.
  - `author`: Who typed it.
  - `post/reel`: Which item they were talking about.

### 🔑 8. OTP Model (`otp.model.js`)
**The "One-Time Secret"**
- **Job:** Saves temporary codes for safe login or registration.
- **Teacher's Secret:** These are meant to self-destruct (delete themselves) after a few minutes.

---

### **Relationship Summary for Viva:**
- **User** is the center. Every other model (Post, Comment, Message) points back to a **User ID** to say "I belong to this person."
- **One-to-Many**: One user can have **Many** Posts.
- **Many-to-Many**: Many users can follow **Many** users.

### 🛡️ 9. Admin Identity & Data Usage
**Important Note:** There is no "AdminModel." The Admin's power comes from his identity within the **User Model**.

| Question | Answer |
| :--- | :--- |
| **Is the Admin a separate person?** | No, the Admin is a `User` with `role: "admin"`. |
| **How does Admin see everyone?** | They use the **User Model** to find and filter all accounts. |
| **How does Admin moderate?** | They perform operations (Delete/Update) across the **Post**, **Reel**, and **Comment** models. |

---

### **Quick Mapping Table for Admin Flow:**
- **Suspend/Unsuspend**: Updates the `isActive` field in the **User Model**.
- **Content Moderation**: Permanently removes entries from **Post**, **Reel**, or **Comment** models.
- **System Stats**: Performs `.countDocuments()` on **User**, **Post**, and **Reel** models.

---

**Prepared for Development Team & System Diagram Creation | Metagram**

