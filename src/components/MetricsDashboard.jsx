import React, { useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";
import "./MetricsDashboard.css";

export default function MetricsDashboard({ wsUrl = "ws://localhost:8000/ws/metrics" }) {
  const [lossData, setLossData] = useState([]);
  const lossRef = useRef([]);
  const [currentLoss, setCurrentLoss] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [attentionMatrix, setAttentionMatrix] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log('WS open');
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const step = Number(msg.step);
        const loss = Number(msg.loss);
        const att = msg.attention_weights;
        if (Number.isFinite(step) && Number.isFinite(loss) && Array.isArray(att)) {
          lossRef.current = [...lossRef.current, { step, loss }];
          setLossData([...lossRef.current]);
          setCurrentLoss(loss);
          setCurrentStep(step);
          setAttentionMatrix(att);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };
    ws.onclose = () => console.log('WS closed');
    ws.onerror = (e) => console.error('WS error', e);

    return () => ws.close();
  }, [wsUrl]);

  const lossX = lossData.map(p => p.step);
  const lossY = lossData.map(p => p.loss);

  const lineLayout = {
    title: 'Step × Loss',
    xaxis: { title: 'Step' },
    yaxis: { title: 'Loss' },
    margin: { t: 40, l: 50, r: 20, b: 50 },
    height: 320,
    paper_bgcolor: '#f7fafc',
    plot_bgcolor: '#ffffff'
  };

  const heatmapLayout = {
    title: currentStep !== null ? `Attention weights at step ${currentStep}` : 'Attention weights',
    margin: { t: 40, l: 50, r: 20, b: 50 },
    height: 320,
    paper_bgcolor: '#f7fafc',
    plot_bgcolor: '#ffffff'
  };

  return (
    <div className="metrics-dashboard">
      <div className="metrics-top">
        <div className="metrics-card">
          <h4>Atual</h4>
          <div className="value">
            <span className="label">Step</span>
            <span className="number">{currentStep ?? '-'}</span>
          </div>
          <div className="value">
            <span className="label">Último Loss</span>
            <span className="number loss">{currentLoss !== null ? currentLoss.toFixed(6) : '-'}</span>
          </div>
        </div>
        <div className="metrics-card small">
          <h4>Resumo</h4>
          <div>Valores acumulados: {lossData.length}</div>
        </div>
      </div>

      <div className="metrics-charts">
        <div className="chart-card">
          <Plot
            data={[{ x: lossX, y: lossY, type: 'scatter', mode: 'lines+markers', marker: { size: 6 }, name: 'Loss' }]}
            layout={lineLayout}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        </div>

        <div className="chart-card">
          {attentionMatrix ? (
            <Plot
              data={[{ z: attentionMatrix, type: 'heatmap', colorscale: 'Viridis', zsmooth: 'fast' }]}
              layout={heatmapLayout}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          ) : (
            <div className="no-data">Aguardando attention_weights...</div>
          )}
        </div>
      </div>
    </div>
  );
}
