import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { AppProvider } from "./store";

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </AppProvider>
  );
}
