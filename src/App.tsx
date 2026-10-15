import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "./lib/LanguageContext";
import DashboardPage from "./pages/DashboardPage";
import PriceCalculator from "./pages/calculator/PriceCalculator";
import SharedReportPage from "./pages/SharedReportPage";

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calculator" element={<PriceCalculator />} />
          <Route path="/report" element={<SharedReportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </LanguageProvider>
  );
}
