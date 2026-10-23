import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ShopProvider } from "./data/shop";
import { FeedbackProvider } from "./components/FeedbackProvider";
import { ThemeProvider } from "./components/ThemeProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ShopProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </ShopProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
