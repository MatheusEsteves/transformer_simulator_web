
import React from 'react';
import SidebarForm from '../components/SidebarForm';
import MetricsDashboard from '../components/MetricsDashboard';
import './App.css';

export default function App(){
  return (
    <div className="app-shell">
      <SidebarForm />
      <div className="main-area">
        <h1>Transformer Training Dashboard</h1>
        <MetricsDashboard />
      </div>
    </div>
  );
}
