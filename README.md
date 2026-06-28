# Problem Statement Selected
When deadlines cluster and the magnitude of tasks becomes overwhelming, individuals experience a psychological state known as "cognitive freeze." This stress-induced state triggers task-avoidance, procrastination, and an inability to begin productive work. Traditional productivity tools and simple to-do lists are inadequate because they simply present a growing list of overdue tasks. They do not lower the activation energy required to begin, nor do they help the user deconstruct massive projects into actionable, approachable steps. 

# Solution Overview
**Priora** is a hyper-intelligent, autonomous Chief of Staff designed specifically to rescue high-stress individuals—such as students, founders, and professionals—from cognitive overwhelm and task paralysis. Instead of passively tracking to-dos, Priora proactively takes over the mental burden of organization and deconstruction. 

By functioning as a strategic co-pilot, the application evaluates your emotional state and deadline urgency. It then leverages an integrated "Last-Minute Life Saver" engine to break down large, daunting goals into highly frictionless 15-25 minute micro-tasks. The platform acts as a unified hub offering a ChatGPT-style multi-session consultation center for strategic planning, hands-free natural voice input for rapid task capture, and an immersive Panic/High-Alert mode that strips away all digital clutter to enforce focused work sprints during critical deadlines.

# Key Features
- **ChatGPT-Style Coaching Suite**: A fully integrated chat interface that allows users to create, name, manage, and delete discrete strategic consultation threads. Users can ask Priora to calculate risk profiles, plan out a weekend of studying, or dynamically deconstruct a complex project. The interface utilizes markdown rendering for clean, readable lists and strategic blueprints.
- **Integrated Natural Voice Control**: Utilizing the browser's Web Speech API, users can speak naturally to the AI Chief of Staff. The voice engine captures speech in real-time and submits it as a strategic command or task without requiring any typing, allowing for frictionless, hands-free interaction.
- **Panic & High-Alert Mode (Emergency Triage)**: Designed for imminent crises, this mode strips away the standard UI, replacing it with a distraction-free, full-screen focus sprint. It employs visual urgency cues (ambient color shifts) and structural isolation to force maximum productivity when deadlines are critically tight.
- **Interactive Kanban Board & Calendar Scheduling**: A visual drag-and-drop Kanban interface for tracking tasks across states (To Do, In Progress, Done). It works in tandem with a Calendar workspace that allows users to visually schedule work blocks and map their upcoming deadlines.
- **Real-Time Data Sync & Persistence**: Provides immediate cloud synchronization across all devices. The application securely persists user profiles, habit streaks, strategic chat histories, and task checklists so that no cognitive effort or plan is ever lost.

# Technologies Used
- **Frontend Framework**: React 19 and TypeScript, powered by Vite for lightning-fast hot-module replacement and optimized builds.
- **Styling Architecture**: Tailwind CSS for highly scalable, utility-first styling, paired with custom CSS variables and scrollbar refinements to achieve a premium, native-feeling aesthetic.
- **Animation Engine**: Framer Motion (`motion/react`) is used extensively to provide gorgeous entrance transitions, floating layout shifts, and physical UI feedback that reduces cognitive friction.
- **Content Rendering**: `react-markdown` is implemented for elegant, structured presentation of AI-generated strategic blueprints and lists.
- **Iconography**: `lucide-react` provides crisp, consistent vector graphics across the dashboard and toolbars.

# Google Technologies Utilized
- **Firebase Firestore**: Acts as the durable, real-time database backend. It securely stores and synchronizes user profiles, Kanban tasks, habit trackers, goal lists, and all multi-session chat histories, ensuring data integrity across client sessions.
- **Firebase Authentication**: Secures the application by providing robust identity management. It allows users to authenticate seamlessly via Google OAuth Single-Sign-On (SSO) as well as traditional email and password credentials.
- **Gemini 2.5 Flash API**: Serves as the cognitive core of the application via a server-side endpoint. Gemini dynamically processes user inputs, calculates deadline safety parameters, authors frictionless micro-tasks, and delivers highly personalized, context-aware motivational coaching.
- **Google Calendar Integration (Conceptual/UI)**: Proactively provisions logic blocks for integrating with the user's primary Google Calendar account, allowing the AI to overlay focus blocks directly onto their daily schedule.
