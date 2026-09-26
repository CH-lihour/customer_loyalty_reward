import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ShopProvider } from "./data/shop";
import { FeedbackProvider } from "./components/FeedbackProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ShopProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </ShopProvider>
  </React.StrictMode>,
);
