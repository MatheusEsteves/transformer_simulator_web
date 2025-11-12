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
  const [useLogScale, setUseLogScale] = useState(false);
  const wsRef = useRef(null);

  // Função segura para normalizar attention_weights em 3D: [head][row][col]
  function normalizeAttention(att) {
    if (!att || !Array.isArray(att)) return [];

    let matrix = att;

    // Se 2D -> adicionar head
    if (Array.isArray(matrix[0]) && !Array.isArray(matrix[0][0])) {
      matrix = [matrix];
    }

    // Garantir 3D
    const normalized = matrix.map(head =>
      head.map(row =>
        Array.isArray(row)
          ? row.map(v => (typeof v === "number" ? v : 0))
          : [Number(row) || 0]
      )
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

        // Atualiza loss
        if (step !== null && loss !== null) {
          setLoading(false);
          setCurrentStep(step);
          setCurrentLoss(loss);

          lossRef.current = [...lossRef.current, { x: step, y: loss }];
          setLossData([...lossRef.current]);
        }

        // Atualiza attention
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
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = () => console.log("WS closed");
    ws.onerror = (e) => console.error("WS error:", e);

    return () => {
      try { ws.close(); } catch (e) {}
    };
  }, [wsUrl]);

  // Gráfico de loss
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

  // Gráfico de attention
  const hasHeads = attentionMatrixHeads.length > 0;
  const attentionMatrix = hasHeads ? attentionMatrixHeads[currentHead] : [];

  // Aplicar log-scale se selecionado, protegendo valores muito pequenos
  const heatmapZ = attentionMatrix.length > 0
    ? (useLogScale
        ? attentionMatrix.map(row => row.map(v => Math.log10(Math.max(v, 1e-10))))
        : attentionMatrix)
    : [];

  const heatmapZmin = useLogScale ? Math.log10(1e-10) : 0;
  const heatmapZmax = useLogScale ? 0 : 1;

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
            {/* Slider para heads */}
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

            {/* Toggle log-scale */}
            <div style={{ marginBottom: '10px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={useLogScale}
                  onChange={() => setUseLogScale(!useLogScale)}
                />{" "}
                Usar log-scale para valores muito pequenos
              </label>
            </div>

            <Plot
              key={currentStep + '-' + currentHead + '-' + useLogScale} // força rerender
              data={[{
                z: heatmapZ,
                type: 'heatmap',
                colorscale: 'Viridis',
                zmin: heatmapZmin,
                zmax: heatmapZmax,
                hoverongaps: false,
                hovertemplate: 'Query: %{x}<br>Key: %{y}<br>Attention: %{z:.10f}<extra></extra>'
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