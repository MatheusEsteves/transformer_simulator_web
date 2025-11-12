
import React, { useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";
import "./MetricsDashboard.css";

export default function MetricsDashboard({ wsUrl = "ws://localhost:8000/ws/metrics" }) {
  const [lossData, setLossData] = useState([]);
  const lossRef = useRef([]);
  const [currentLoss, setCurrentLoss] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [attentionMatrix, setAttentionMatrix] = useState(null);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // open ws when component mounts
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setLoading(true);

    ws.onopen = () => console.log("WS open");
    ws.onmessage = (evt) => {
      try {
        const msg = typeof evt.data === "string" ? JSON.parse(evt.data) : evt.data;
        // expect msg to contain step, loss, attention_weights (optional)
        const step = msg.step ?? msg.STEP ?? null;
        const loss = msg.loss ?? msg.LOSS ?? null;
        const att = msg.attention_weights ?? msg.ATTENTION_WEIGHTS ?? msg.attentionWeights ?? null;

        if (step !== null && loss !== null) {
          // first message -> stop loading
          if (loading) setLoading(false);
          setCurrentStep(step);
          setCurrentLoss(loss);
          // update loss series
          lossRef.current = [...lossRef.current, { x: step, y: loss }];
          setLossData([...lossRef.current]);
        }
        if (att) {
          // ensure 2D array; downsample if too large
          let matrix = att;
          // if nested extra dims e.g. [[[...]]], try to reduce
          while (Array.isArray(matrix) && matrix.length===1 && Array.isArray(matrix[0])) {
            matrix = matrix[0];
          }
          // if more dims, attempt to find 2D slice
          if (Array.isArray(matrix) && Array.isArray(matrix[0]) && Array.isArray(matrix[0][0])) {
            matrix = matrix.map(r=> Array.isArray(r)? r.map(c=> Array.isArray(c)? c[0] : c) : r);
          }
          // downsample large matrices for performance
          const MAX_DIM = 64;
          const rows = matrix.length;
          const cols = (matrix[0] || []).length || 0;
          if (rows > MAX_DIM || cols > MAX_DIM) {
            const rowStep = Math.ceil(rows / MAX_DIM);
            const colStep = Math.ceil(cols / MAX_DIM);
            const reduced = [];
            for (let i=0;i<rows;i+=rowStep){
              const row = [];
              for (let j=0;j<cols;j+=colStep){
                row.push(matrix[i][j]);
              }
              reduced.push(row);
            }
            matrix = reduced;
          }
          setAttentionMatrix(matrix);
        }
      } catch (err) {
        console.error("Error parsing WS message", err);
      }
    };
    ws.onclose = () => console.log("WS closed");
    ws.onerror = (e) => console.error("WS error", e);

    return () => {
      try { ws.close(); } catch(e){}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  const lossTrace = {
    x: lossData.map(p=>p.x),
    y: lossData.map(p=>p.y),
    type: "scatter",
    mode: "lines+markers",
    name: "loss"
  };
  const lossLayout = {
    title: `Step x Loss`,
    xaxis: { title: "Step" },
    yaxis: { title: "Loss" },
    margin: { t:40, l:40, r:20, b:40 }
  };

  const heatmapLayout = {
    title: "Attention weights (heatmap)",
    margin: { t:40, l:40, r:20, b:40 }
  };

  return (
    <div className="metrics-grid">
      <div className="left-panel">
        <div className="loss-header">STEP: {currentStep ?? "—"} <span className="loss-value">LOSS: {currentLoss ?? "—"}</span></div>
        <Plot data={[lossTrace]} layout={lossLayout} config={{displayModeBar:false, responsive:true}} style={{width:'100%'}} />
      </div>
      <div className="right-panel">
        {loading ? (
          <div className="loading">Aguardando início do treinamento... (loading)</div>
        ) : attentionMatrix ? (
          <Plot
            data={[{ z: attentionMatrix, type: "heatmap", zsmooth: "fast" }]}
            layout={heatmapLayout}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%" }}
          />
        ) : (
          <div className="no-data">Aguardando attention_weights...</div>
        )}
      </div>
    </div>
  );
}
