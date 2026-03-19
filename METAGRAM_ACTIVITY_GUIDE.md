# Metagram | Every Activity Explained (Teacher Mode) 🎓

Welcome, little student! This is a story of how **Metagram** works, step-by-step, from the moment you walk through the door until you become a master of the platform!

---

### 🎒 Step 1: Walking into the School (Sign-up & Registration)
- **Activity:** You tell the school who you are.
- **The Story:** Imagine you are getting a school ID card. You write your name, your email for your locker, and a secret word (password) only you know.
- **Teacher's Secret:** Before we give you the ID, we check: "Is there already a student with this name?" If the answer is No, you are officially a student!

### 🔑 Step 2: Unlocking your Locker (Login)
- **Activity:** You come back the next day.
- **The Story:** You go to your locker and enter your secret word. If it matches, your locker opens! 
- **Teacher's Secret:** We give you a "Magic Key" (JWT Token) so you don't have to keep entrying your secret word every time you move between classrooms.

### 🎨 Step 3: Decorating your Desk (Profile Setup)
- **Activity:** You choose a profile picture and write a bio.
- **The Story:** You put a photo on your desk so people know who you are and write a small note saying "I love space and pizza!"
- **Teacher's Secret:** This is saved in your own notebook (`User` Model) so everyone else can see your bright smile!

### 🔍 Step 4: Finding Friends (Search & Explore)
- **Activity:** Looking for other kids to play with.
- **The Story:** You walk through the hallway and look at other desks. You find someone with a "Pokemon" picture and decide to say Hi.
- **Teacher's Secret:** The app looks through all the student IDs to find the name you typed.

### 🤝 Step 5: Asking to Play (Follow & Unfollow)
- **Activity:** Following someone.
- **The Story:** You ask a friend, "Can I see your drawings?" If they say yes (or if they are a Public student), you follow them.
- **Teacher's Secret:** We add their name to your "Friends list" (`following`) and your name to their "Fans list" (`followers`).

### 🖼️ Step 6: The Giant Bulletin Board (Home Feed)
- **Activity:** Scrolling through posts.
- **The Story:** Each day, all your friends pin their drawings to the Giant Bulletin Board. When you walk by, you see everyone's art at once.
- **Teacher's Secret:** The app gathers all the latest notes from the `Post` Model and shows them to you in a list.

### 🎥 Step 7: The Movie Show (Reels)
- **Activity:** Watching short videos.
- **The Story:** This is like a TV in the cafeteria that plays funny 15-second movie clips that your friends made.
- **Teacher's Secret:** These are special "Moving Notes" saved in the `Reel` Model.

### 🪄 Step 8: The Magic Erasable Board (Stories)
- **Activity:** Sharing a temporary photo.
- **The Story:** You draw something on a small whiteboard. Everyone can see it today, but tonight at midnight, a magic fairy comes and erases it forever!
- **Teacher's Secret:** We set an alarm for 24 hours. When the alarm goes off, the note is gone! (`Story` Model).

### 💌 Step 9: Passing Secret Notes (Live Chat)
- **Activity:** Messaging a friend.
- **The Story:** You write a note, fold it, and slide it to your friend's side. **ZAP!** It gets to them instantly.
- **Teacher's Secret:** We use a "Magic Tube" (Socket.io) that sends the message immediately without any waiting.

### 🔔 Step 10: The Happy School Bell (Notifications)
- **Activity:** Getting alerts.
- **The Story:** Every time someone likes your drawing or follows you, a tiny bell rings. **Ding!** 
- **Teacher's Secret:** We write a new line in the `Notification` notebook so you can see who was being nice to you.

### 🗑️ Step 11: Cleaning Up (Deleting & Moderation)
- **Activity:** Deleting a post or comment.
- **The Story:** If you don't like a drawing you made, you just take it off the wall and put it in the recycling bin.
- **Teacher's Secret:** We remove that ID from the `Post` Model notebook and erase the image file from the cloud storage.

### 🛡️ Step 12: A Day in the Life of the Principal (Detailed Admin Flow)
When the Principal walks into their office, they have a special **Master Key** that regular students don't have. Here is their detailed daily flow:

#### 🏛️ 12.1 The Master Office Entry (Admin Login)
- **The Story:** The Principal doesn't just enter a secret word; they also have a special badge on their student ID that says "**Principal**."
- **Teacher's Secret:** The app checks the `role` field in the `User` Model. If it says `admin`, a special **Admin Dashboard** button appears!

#### 📊 12.2 Looking at the School Map (The Dashboard)
- **The Story:** The Principal sits at a big desk with a wall of monitors. One screen shows how many students are in the hallways today (Post count), and another shows how many new students joined (User stats).
- **Teacher's Secret:** The Principal's Dashboard uses `api.get('/admin/stats')` to query the `User`, `Post`, and `Reel` models all at once!

#### 📋 12.3 Checking the Student Register (User Management)
- **The Story:** The Principal opens a big book with every student's name. They can search for anyone, even if that student has been sent home (Suspended).
- **Teacher's Secret:** Unlike the students who only see "active" friends, the Principal uses `/admin/all-users` to see **everyone** in the `User` Model.

#### ⚖️ 12.4 Enforcing the School Rules (Suspending Users)
- **The Story:** If a student is not following the rules, the Principal doesn't have to remove them from the book. They just put a big **RED STICKER** next to their name that says "Suspended."
- **Teacher's Secret:** This flips the `isActive` switch in the DB. When that student tries to enter the school, the door says: "Entry Forbidden!"

#### 🧼 12.5 Cleaning the Bulletin Board (Content Moderation)
- **The Story:** The Principal walks by the bulletin board and sees a drawing that is not nice. They take out a bottle of magic spray and **POOF!** The drawing is gone.
- **Teacher's Secret:** The Principal has special buttons to call `api.delete('/post/delete-post')` or `api.delete('/reels/delete-reel')`. This removes the data from the `Post` or `Reel` notebook forever.

#### 🏢 12.6 The Principal's Master Database (Quick Check List)
If you are building your diagram, here is exactly which notebook (Model) the Principal looks at for each activity:

| Activity | Which Notebook? (Model Name) | The Key Used (Field Name) |
| :--- | :--- | :--- |
| **Admin Login** | `User` Model | `role: "admin"` |
| **Seeing All Students** | `User` Model | `api.get("/user/all")` |
| **Suspending a Student** | `User` Model | `isActive: false` |
| **Counting all Posts** | `Post` Model | `Post.countDocuments()` |
| **Deleting a Post** | `Post` Model | `Post.findByIdAndDelete()` |
| **Deleting a Reel** | `Reel` Model | `Reel.findByIdAndDelete()` |
| **Deleting a Comment**| `Comment` Model | `Comment.findByIdAndDelete()` |

---

**Happy Learning, Little Developer! Everything in Metagram is just a story of notes and lists!** 🎓🌟

