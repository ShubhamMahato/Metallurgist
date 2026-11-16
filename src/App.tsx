import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "./lib/LanguageContext";
import DashboardPage from "./pages/DashboardPage";
import PriceCalculator from "./pages/calculator/PriceCalculator";
import SharedReportPage from "./pages/SharedReportPage";
import PatternScannerPage from "./pages/patterns/PatternScannerPage";

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calculator" element={<PriceCalculator />} />
          <Route path="/patterns" element={<PatternScannerPage />} />
          <Route path="/report" element={<SharedReportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </LanguageProvider>
  );
}
