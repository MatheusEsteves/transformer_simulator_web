import React, { useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";
import "./MetricsDashboard.css";

export default function MetricsDashboard({ wsUrl = "ws://localhost:8000/ws/metrics" }) {
  const [lossData, setLossData] = useState([]);
  const lossRef = useRef([]);
  const [currentLoss, setCurrentLoss] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [attentionMatrixHeads, setAttentionMatrixHeads] = useState([]); // 3D array [head][seq][seq]
  const [currentHead, setCurrentHead] = useState(0);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  function normalizeAttention(att) {
    if (!att || !Array.isArray(att)) return []; // garante array

    let matrix = att;

    // Se for 2D -> adicionar dimensão de head
    if (Array.isArray(matrix[0]) && !Array.isArray(matrix[0][0])) {
      matrix = [matrix]; // shape -> [1, seq, seq]
    }

    // Agora garantimos 3D: [head][row][col]
    const normalized = matrix.map(head =>
      head.map(row => {
        if (!Array.isArray(row)) return [Number(row) || 0]; // converte número em array
        return row.map(v => (typeof v === "number" ? v : 0));
      })
    );

    return normalized;
  }

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setLoading(true);

    ws.onopen = () => console.log("WS open");

    ws.onmessage = (evt) => {
      try {
        const msg = typeof evt.data === "string" ? JSON.parse(evt.data) : evt.data;
        const step = msg.step ?? msg.STEP ?? null;
        const loss = msg.loss ?? msg.LOSS ?? null;
        const att = msg.attention_weights ?? msg.ATTENTION_WEIGHTS ?? msg.attentionWeights ?? null;

        // Update loss
        if (step !== null && loss !== null) {
          setLoading(false); // força atualização de loading
          setCurrentStep(step);
          setCurrentLoss(loss);

          lossRef.current = [...lossRef.current, { x: step, y: loss }];
          setLossData([...lossRef.current]);
        }

        if (att) {
          try {
            const matrixHeads = normalizeAttention(att);
            setAttentionMatrixHeads(matrixHeads);
            setCurrentHead(0);
          } catch (e) {
            console.error("Error normalizing attention matrix:", e);
          }
        }
      } catch (err) {
        console.error("Error parsing WS message", err);
      }
    };

    ws.onclose = () => console.log("WS closed");
    ws.onerror = (e) => console.error("WS error", e);

    return () => {
      try { ws.close(); } catch (e) {}
    };
  }, [wsUrl]);

  // Prepare loss plot
  const lossTrace = {
    x: lossData.map(p => p.x),
    y: lossData.map(p => p.y),
    type: "scatter",
    mode: "lines+markers",
    name: "loss"
  };
  const lossLayout = {
    title: `Step x Loss`,
    xaxis: { title: "Step" },
    yaxis: { title: "Loss" },
    margin: { t: 40, l: 40, r: 20, b: 40 }
  };

  // Prepare attention heatmap
  const hasHeads = attentionMatrixHeads.length > 0;
  const attentionMatrix = hasHeads ? attentionMatrixHeads[currentHead] : [];

  const heatmapLayout = {
    title: hasHeads ? `Attention Head ${currentHead + 1}` : "Attention weights",
    xaxis: { title: 'Tokens', tickangle: -45 },
    yaxis: { title: 'Tokens' },
    margin: { t: 80, l: 80, r: 20, b: 100 }
  };

  return (
    <div className="metrics-grid">
      <div className="left-panel">
        <div className="loss-header">
          STEP: {currentStep ?? "—"} <span className="loss-value">LOSS: {currentLoss ?? "—"}</span>
        </div>
        <Plot
          data={[lossTrace]}
          layout={lossLayout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
        />
      </div>

      <div className="right-panel">
        {loading ? (
          <div className="loading">Aguardando início do treinamento... (loading)</div>
        ) : hasHeads ? (
          <div>
            {/* Slider para selecionar head */}
            {attentionMatrixHeads.length > 1 && (
              <div style={{ marginBottom: '10px' }}>
                <label>Head: {currentHead + 1}</label>
                <input
                  type="range"
                  min={0}
                  max={attentionMatrixHeads.length - 1}
                  value={currentHead}
                  onChange={(e) => setCurrentHead(Number(e.target.value))}
                />
              </div>
            )}
            <Plot
              key={currentStep + '-' + currentHead} // força rerender ao mudar step ou head
              data={[{
                z: attentionMatrix,
                type: 'heatmap',
                colorscale: 'Viridis',
                zmin: 0,
                zmax: 1,
                hoverongaps: false,
                hovertemplate: 'Query: %{x}<br>Key: %{y}<br>Attention: %{z:.3f}<extra></extra>'
              }]}
              layout={heatmapLayout}
              config={{ displayModeBar: false, responsive: true }}
              style={{
                width: Math.max(400, attentionMatrix[0]?.length * 15),
                height: Math.max(400, attentionMatrix.length * 15)
              }}
            />
          </div>
        ) : (
          <div className="no-data">Aguardando attention_weights...</div>
        )}
      </div>
    </div>
  );
}