export const reportTemplate = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
        .title { color: #1e3a8a; font-size: 24px; font-weight: 800; margin: 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-item { display: flex; flex-direction: column; }
        .info-label { font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .info-value { font-size: 14px; color: #111827; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f9fafb; padding: 12px; text-align: left; font-size: 10px; font-weight: 700; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
        td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
        .value-cell { font-family: 'JetBrains Mono', monospace; font-weight: 500; text-align: right; }
        .total-section { display: flex; justify-content: flex-end; border-top: 2px solid #f3f4f6; padding-top: 20px; }
        .total-box { bg: #f3f4f6; padding: 15px 30px; border-radius: 12px; text-align: right; }
        .total-label { font-size: 12px; color: #4b5563; font-weight: 700; }
        .total-value { font-size: 20px; color: #1e3a8a; font-weight: 800; }
        .purity { display: flex; align-items: baseline; gap: 4px; justify-content: flex-end; margin-top: 4px; }
        .purity-label { font-size: 10px; color: #6b7280; }
        .purity-value { font-size: 12px; color: #4b5563; font-weight: 600; }
        .footer { margin-top: 50px; text-align: center; color: #9ca3af; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1 class="title">METALLURGIST PRO</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Certified Laboratory Analysis Report</p>
        </div>
        <div style="text-align: right;">
            <div class="info-label">Report ID</div>
            <div class="info-value" style="font-family: monospace;">#{{report_id}}</div>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-item">
            <span class="info-label">Customer Name</span>
            <span class="info-value">{{customer_name}}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Analysis Date</span>
            <span class="info-value">{{date}}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Phone Number</span>
            <span class="info-value">{{phone_number}}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Sample Weight</span>
            <span class="info-value">{{gold_weight}} g</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Metal</th>
                <th>Sym</th>
                <th style="text-align: right;">Value (%)</th>
                <th>Metal</th>
                <th>Sym</th>
                <th style="text-align: right;">Value (%)</th>
            </tr>
        </thead>
        <tbody>
            {{#metalRows}}
            <tr>
                <td>{{col1.metal}}</td>
                <td>{{col1.symbol}}</td>
                <td class="value-cell">{{col1.value}}</td>
                {{#if col2}}
                <td>{{col2.metal}}</td>
                <td>{{col2.symbol}}</td>
                <td class="value-cell">{{col2.value}}</td>
                {{else}}
                <td style="background: #fcfcfc;">-</td>
                <td style="background: #fcfcfc;">-</td>
                <td style="background: #fcfcfc;" class="value-cell">-</td>
                {{/if}}
            </tr>
            {{/metalRows}}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-box">
            <div class="total-label">Total Aggregate</div>
            <div class="total-value">{{total_aggregate}}%</div>
            <div class="purity">
                <span class="purity-label">Gold Purity:</span>
                <span class="purity-value">{{purity_percentage}}%</span>
            </div>
        </div>
    </div>

    <div class="footer">
        This document is an electronically generated analysis report. Verified and digitally signed.
    </div>
</body>
</html>`;
