import { useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Toaster } from "react-hot-toast";
import "./App.css";
import Home from "./pages/Home";
import { handleApiError } from "./utils/apiErrorHandler";

const theme = createTheme();

function App() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      handleApiError(event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerStyle={{}}
        toastOptions={{
          duration: 3000,
        }}
      />
      <div className="App">
        <Home />
      </div>
    </ThemeProvider>
  );
}

export default App;
