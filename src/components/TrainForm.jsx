import React, { useState } from "react";
import api from "../services/api";

export default function TrainForm({ onStart }) {
  const [params, setParams] = useState({
    model_name: "simple-transformer",
    hidden_size: 128,
    num_layers: 2,
    learning_rate: 0.001,
    epochs: 5,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setParams({ ...params, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/train');
      if (onStart) onStart(res.data.job_id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="train-form">
      <h3>Start Notebook Training</h3>
      <div style={{ marginBottom: 8 }}>
        <button type="submit">Start</button>
      </div>
    </form>
  );
}
