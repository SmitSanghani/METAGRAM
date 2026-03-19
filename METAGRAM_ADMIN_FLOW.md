# Metagram Admin Flow Diagram 🛡️

Title: **System Architecture - Administrative Governance Flow**

```mermaid
graph TD
    %% Define Styles
    classDef oval fill:#f9f,stroke:#333,stroke-width:2px,rx:20,ry:20;
    classDef rect fill:#fff,stroke:#333,stroke-width:2px;
    classDef rounded fill:#e1f5fe,stroke:#01579b,stroke-width:2px,rx:10,ry:10;
    classDef diamond fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;
    classDef cylinder fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef document fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;

    %% Flow Steps
    Start([Start]):::oval --> Login[Admin opens Metagram Admin Portal]:::rect
    Login --> Credentials[Admin enters login credentials]:::rect
    Credentials --> AuthCheck{Are credentials valid?}:::diamond
    
    AuthCheck -- No --> Error[Show login error message]:::rect
    Error --> Login
    
    AuthCheck -- Yes --> RoleCheck{Is user role admin?}:::diamond
    
    RoleCheck -- No --> Denied[Access denied screen]:::rect
    Denied --> End([End]):::oval
    
    RoleCheck -- Yes --> Dashboard(Redirect to Admin Dashboard):::rounded
    
    Dashboard --> Stats[View platform statistics]:::rect
    Stats --- DB_Analytics[(Analytics / Logs DB)]:::cylinder
    
    Dashboard --> UserMgmt[Access User Management]:::rect
    UserMgmt --> ViewUsers[View all users]:::rect
    ViewUsers --- DB_User[(User Database)]:::cylinder
    
    ViewUsers --> SearchUser[Search / filter users]:::rect
    SearchUser --> UserAction{Perform user action?}:::diamond
    
    UserAction -- Verify/Suspend/Ban --> UpdateUser[Update user status in database]:::rect
    UpdateUser --- DB_User
    
    Dashboard --> Moderation[Access Content Moderation]:::rect
    Moderation --> ViewFlagged[View reported posts / reels / comments]:::rect
    ViewFlagged --- DB_Content[(Content Database)]:::cylinder
    
    ViewFlagged --> ReviewContent[Review flagged content]:::rect
    ReviewContent --> ModAction{Moderation action?}:::diamond
    
    ModAction -- Delete/ShadowBan --> UpdateMod[Update moderation result in DB]:::rect
    UpdateMod --- DB_Content
    
    Dashboard --> Settings[Access System Controls]:::rect
    Settings --> UpdateSettings[Update platform configuration]:::rect
    UpdateSettings --- DB_Settings[(Settings Database)]:::cylinder
    
    UpdateSettings --> Logout[Logout Admin]:::rect
    Logout --> End
    
    %% Navigation
    UpdateUser -.-> Dashboard
    UpdateMod -.-> Dashboard
    
```

---

### **Quick Mapping for Viva Presentation**
| Step | Action Type | Database Model |
| :--- | :--- | :--- |
| **Auth** | Decision | `User` (field: `role`) |
| **User Mgmt** | Process | `User` (field: `isActive`) |
| **Moderation** | Process | `Post`, `Reel`, `Comment` |
| **Stats** | Analytics | `User.countDocuments()`, etc. |

---
**Document Status: Viva-Ready | Metagram Project Documentation**
