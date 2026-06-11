import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server config. Frontend runs at http://localhost:5173 by default.
export default defineConfig({
  plugins: [react()],
});
