import { ThemeProvider, Toaster } from "@starter/ui";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
