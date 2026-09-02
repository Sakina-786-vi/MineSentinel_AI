export default function Settings() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#E8EEF2", margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 12, color: "#60717E", margin: "4px 0 0" }}>System configuration and alert thresholds</p>
      </div>
      {[
        { section: "ALERT THRESHOLDS", fields: [
          { label: "Tilt Warning (°)", val: "30" }, { label: "Tilt Critical (°)", val: "40" },
          { label: "Displacement Warning (mm)", val: "10.0" }, { label: "Displacement Critical (mm)", val: "15.0" },
          { label: "Risk Score Warning", val: "40" }, { label: "Risk Score Critical", val: "70" },
        ]},
        { section: "DATA COLLECTION", fields: [
          { label: "Gateway Send Interval (sec)", val: "1" }, { label: "Data Retention (days)", val: "365" },
          { label: "AI Analysis Interval (sec)", val: "1" },
        ]},
        { section: "NOTIFICATION", fields: [
          { label: "SMS Alert Number", val: "+91-XXXXXXXXXX" }, { label: "Email Alert", val: "safety@jharia.gov.in" },
        ]},
      ].map(({ section, fields }) => (
        <div key={section} style={{ background: "#111A23", border: "1px solid #263542", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#60717E", letterSpacing: "0.1em", marginBottom: 14 }}>{section}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {fields.map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 11, color: "#60717E", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input defaultValue={f.val} style={{
                  width: "100%", background: "#16212C", border: "1px solid #263542",
                  borderRadius: 6, padding: "7px 10px", color: "#E8EEF2",
                  fontFamily: "JetBrains Mono", fontSize: 12,
                  outline: "none",
                }}/>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <button style={{ padding: "9px 24px", background: "#2F80ED", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Save Configuration
        </button>
      </div>
    </div>
  );
}
