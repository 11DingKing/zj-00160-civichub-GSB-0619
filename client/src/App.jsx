import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import MainLayout from "./components/MainLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AppealList from "./pages/AppealList.jsx";
import AppealDetail from "./pages/AppealDetail.jsx";
import AppealCreate from "./pages/AppealCreate.jsx";
import Statistics from "./pages/Statistics.jsx";
import MyAppeals from "./pages/MyAppeals.jsx";
import SupervisionCity from "./pages/SupervisionCity.jsx";
import SupervisionDistrict from "./pages/SupervisionDistrict.jsx";
import SupervisionDetail from "./pages/SupervisionDetail.jsx";

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="appeals" element={<AppealList />} />
        <Route path="appeals/:id" element={<AppealDetail />} />
        <Route path="appeals/create" element={<AppealCreate />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="my-appeals" element={<MyAppeals />} />
        <Route path="supervision/city" element={<SupervisionCity />} />
        <Route path="supervision/district" element={<SupervisionDistrict />} />
        <Route path="supervision/:id" element={<SupervisionDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
