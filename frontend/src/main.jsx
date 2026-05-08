import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.jsx";
import "./styles.css";

// React enters the app from the #root element in frontend/index.html.
// StrictMode intentionally double-checks effects in development so socket/media cleanup bugs show up early.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* BrowserRouter enables the /, /chat, and /video URLs without manual history handling. */}
    <BrowserRouter>
      {/* The catch-all lets App own every route under the frontend. */}
      <Routes>
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
