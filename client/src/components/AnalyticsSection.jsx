import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getSensorsHistory } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsSection({ history: initialHistory = [] }) {
  const [timeRange, setTimeRange] = useState('1H');
  const [historyData, setHistoryData] = useState(initialHistory);
  const [isLoading, setIsLoading] = useState(false);

  const TIME_RANGES = ['1H', '6H', '12H', '24H', '7D'];

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await getSensorsHistory(timeRange);
        if (isMounted && res && res.data) {
          setHistoryData(res.data);
        }
      } catch (err) {
        console.warn('Failed to load history for range:', timeRange, err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  // Sync if parent passes updated live history for 1H
  useEffect(() => {
    if (timeRange === '1H' && initialHistory && initialHistory.length > 0) {
      setHistoryData(initialHistory);
    }
  }, [initialHistory, timeRange]);

  const hasHistory = historyData && historyData.length > 0;

  // Extract labels and datasets
  const labels = hasHistory
    ? historyData.map((item) =>
        item.timeLabel ||
        new Date(item.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    : ['No Data'];

  // Base options for clean white theme charts
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          font: { family: "'Inter', sans-serif", size: 11, weight: 600 },
          color: '#475569',
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: "'Inter', sans-serif", size: 12 },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
    },
    elements: {
      point: { radius: 2, hoverRadius: 5 },
      line: { tension: 0.35, borderWidth: 2 },
    },
  };

  // 1. Temperature & Humidity Dual-Axis Chart
  const tempHumData = {
    labels,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: hasHistory ? historyData.map((h) => h.temperature) : [null],
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.05)',
        yAxisID: 'yTemp',
      },
      {
        label: 'Humidity (%)',
        data: hasHistory ? historyData.map((h) => h.humidity) : [null],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        yAxisID: 'yHum',
      },
    ],
  };

  const tempHumOptions = {
    ...baseOptions,
    scales: {
      x: baseOptions.scales.x,
      yTemp: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: '°C', color: '#dc2626', font: { size: 11, weight: 'bold' } },
        grid: { color: '#f1f5f9' },
        ticks: { color: '#dc2626' },
      },
      yHum: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: '% RH', color: '#2563eb', font: { size: 11, weight: 'bold' } },
        grid: { drawOnChartArea: false },
        ticks: { color: '#2563eb' },
        min: 0,
        max: 100,
      },
    },
  };

  // 2. Light Intensity Chart with 400 & 600 lux reference lines
  const lightData = {
    labels,
    datasets: [
      {
        label: 'Light Intensity (lux)',
        data: hasHistory ? historyData.map((h) => h.lux) : [null],
        borderColor: '#d97706',
        backgroundColor: 'rgba(217, 119, 6, 0.08)',
        fill: true,
      },
      {
        label: 'ON Threshold (400 lux)',
        data: labels.map(() => 400),
        borderColor: '#ef4444',
        borderDash: [5, 5],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'OFF Threshold (600 lux)',
        data: labels.map(() => 600),
        borderColor: '#10b981',
        borderDash: [5, 5],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  // 3. Water Tank Percentage Chart
  const tankData = {
    labels,
    datasets: [
      {
        label: 'Water Tank Level (%)',
        data: hasHistory ? historyData.map((h) => h.tankPercent) : [null],
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        fill: true,
      },
    ],
  };

  const tankOptions = {
    ...baseOptions,
    scales: {
      ...baseOptions.scales,
      y: {
        ...baseOptions.scales.y,
        min: 0,
        max: 100,
        title: { display: true, text: 'Reservoir %', color: '#0284c7', font: { size: 11, weight: 'bold' } },
      },
    },
  };

  // 4. Soil Moisture ADC Chart (with 8000 dry line)
  const soilData = {
    labels,
    datasets: [
      {
        label: 'Soil Moisture (ADC Value)',
        data: hasHistory ? historyData.map((h) => h.soilRaw) : [null],
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.08)',
        fill: true,
      },
      {
        label: 'Dry Threshold (8000)',
        data: labels.map(() => 8000),
        borderColor: '#dc2626',
        borderDash: [6, 6],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  return (
    <section id="analytics" className="dashboard-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="section-title">
            <span>📊</span>
            <span>Analytics</span>
          </h2>
          <p className="section-subtitle">
            Historical and real-time agricultural telemetry graphs
          </p>
        </div>

        {/* Time range selector filter buttons */}
        <div className="analytics-range-selector">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
              disabled={isLoading}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {!hasHistory && (
        <div className="clean-card" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
          <p style={{ fontWeight: 600, color: '#334155' }}>No historical data available</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Historical sensor records will appear as the Raspberry Pi publishes continuous telemetry.
          </p>
        </div>
      )}

      <div className="charts-grid">
        {/* Temperature / Humidity Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Temperature & Relative Humidity</div>
            <div className="chart-legend-badge">Climate Subsystem</div>
          </div>
          <div className="chart-container">
            <Line data={tempHumData} options={tempHumOptions} />
          </div>
        </div>

        {/* Light Intensity Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Light Intensity</div>
            <div className="chart-legend-badge">Illumination Subsystem</div>
          </div>
          <div className="chart-container">
            <Line data={lightData} options={baseOptions} />
          </div>
        </div>

        {/* Water Tank Level Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Tank Level</div>
            <div className="chart-legend-badge">Water Supply Subsystem</div>
          </div>
          <div className="chart-container">
            <Line data={tankData} options={tankOptions} />
          </div>
        </div>

        {/* Soil Moisture ADC Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Soil Moisture</div>
            <div className="chart-legend-badge">Drip Irrigation Subsystem</div>
          </div>
          <div className="chart-container">
            <Line data={soilData} options={baseOptions} />
          </div>
        </div>
      </div>
    </section>
  );
}
