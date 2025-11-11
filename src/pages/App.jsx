import React from 'react';
import TrainForm from '../components/TrainForm';
import MetricsDashboard from '../components/MetricsDashboard';

export default function App(){
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <h1>Transformer Training Dashboard</h1>
      <TrainForm />
      <MetricsDashboard />
    </div>
  );
}
