Developers: Ananyaa Sutaria, Catherine Kennedy, Matilde Gillia, Sara Adams

Project description: Gator Dater is a dating and social planning web app built for University of Florida students. It helps users create a profile, discover compatible matches, chat with other students, and plan dates around shared interests, budget, vibe, and availability. The app is built with React and Vite on the frontend, uses Firebase for authentication and data storage, and includes a Gemini-powered planner that suggests Gainesville-friendly date ideas.


Installation & run instructions:

1. Install Node.js 20 or newer.
2. Open a terminal and move into the app folder:

```bash
cd gator-dater-app
```

3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file in `gator-dater-app/` with these variables:

```env
VITE_FIREBASE_API_KEY=your_value_here
VITE_FIREBASE_AUTH_DOMAIN=your_value_here
VITE_FIREBASE_PROJECT_ID=your_value_here
VITE_FIREBASE_STORAGE_BUCKET=your_value_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_value_here
VITE_FIREBASE_APP_ID=your_value_here
VITE_FIREBASE_MEASUREMENT_ID=your_value_here
VITE_GEMINI_API_KEY=your_value_here
```

### Run Locally

Start the Vite dev server:

```bash
npm run dev
```

Then open the local URL shown in the terminal, usually `http://localhost:5173`.

### Other Commands

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```
